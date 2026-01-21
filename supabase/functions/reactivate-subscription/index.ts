import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { STRIPE_API_VERSION } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REACTIVATE-SUBSCRIPTION] ${step}${detailsStr}`);
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
      .select("stripe_subscription_id, cancel_at_period_end")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org?.stripe_subscription_id) {
      throw new Error("No tienes una suscripción activa para reactivar.");
    }

    logStep("Found subscription pending cancellation", { subscriptionId: org.stripe_subscription_id });

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

    // Issue M6: Verify subscription exists in Stripe and is in a reactivatable state
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

    if (subscription.status === "canceled") {
      throw new Error("Tu suscripción ya fue cancelada completamente. Debes crear una nueva suscripción.");
    }

    if (!subscription.cancel_at_period_end) {
      throw new Error("Tu suscripción ya está activa y no está programada para cancelarse.");
    }

    // Reactivate subscription in Stripe
    const reactivatedSub = await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    logStep("Subscription reactivated", { 
      status: reactivatedSub.status,
      cancelAtPeriodEnd: reactivatedSub.cancel_at_period_end
    });

    // Update organization in database
    const { error: updateError } = await supabaseClient
      .from("organizations")
      .update({
        cancel_at_period_end: false,
      })
      .eq("id", profile.organization_id);

    // Issue M3: Throw error on DB failure instead of silent warning
    if (updateError) {
      logStep("Failed to update organization", { error: updateError.message });
      throw new Error("Error al actualizar la suscripción. Intenta de nuevo.");
    }

    return corsJsonResponse(req, {
      success: true,
      status: reactivatedSub.status,
    }, 200);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
