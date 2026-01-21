import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { STRIPE_API_VERSION } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get request body
    const { immediate = false } = await req.json();
    logStep("Cancellation type", { immediate });

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("Organization not found for user");
    }
    logStep("Found organization", { organizationId: profile.organization_id });

    // Get organization with subscription
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_subscription_id, subscription_tier, subscription_status")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }
    logStep("Found subscription", { subscriptionId: org.stripe_subscription_id });

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

    let subscription: Stripe.Subscription;
    let cancelAt: Date | null = null;

    if (immediate) {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(org.stripe_subscription_id);
      logStep("Subscription canceled immediately", { status: subscription.status });
    } else {
      // Cancel at period end
      subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      cancelAt = new Date(subscription.current_period_end * 1000);
      logStep("Subscription set to cancel at period end", { 
        cancelAt: cancelAt.toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      });
    }

    // Update organization in database
    const updateData: Record<string, unknown> = {
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null,
    };

    if (immediate) {
      updateData.subscription_status = "canceled";
      updateData.subscription_tier = "basic";
      updateData.stripe_subscription_id = null;
      updateData.cancel_at_period_end = false;
    }

    const { error: updateError } = await supabaseClient
      .from("organizations")
      .update(updateData)
      .eq("id", profile.organization_id);

    if (updateError) {
      logStep("Warning: Failed to update organization", { error: updateError.message });
    }

    return corsJsonResponse(req, {
      success: true,
      immediate,
      cancel_at: cancelAt?.toISOString() || null,
      status: subscription.status,
    }, 200);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
