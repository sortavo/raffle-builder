import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PRODUCT_TO_TIER, TIER_LIMITS, STRIPE_API_VERSION } from "../_shared/stripe-config.ts";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return corsJsonResponse(req, { 
        subscribed: false,
        tier: null,
        subscription_end: null,
      }, 200);
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active, trialing, AND past_due subscriptions (not just active)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Find the most relevant subscription (active > trialing > past_due)
    const validStatuses = ["active", "trialing", "past_due"];
    const validSubscription = subscriptions.data.find((sub: Stripe.Subscription) => 
      validStatuses.includes(sub.status)
    );

    const hasActiveSub = !!validSubscription;
    let tier: string | null = null;
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let subscriptionStatus: string | null = null;

    if (hasActiveSub && validSubscription) {
      stripeSubscriptionId = validSubscription.id;
      subscriptionStatus = validSubscription.status;
      subscriptionEnd = new Date(validSubscription.current_period_end * 1000).toISOString();
      const productId = validSubscription.items.data[0].price.product as string;
      tier = PRODUCT_TO_TIER[productId] || "basic";
      
      logStep("Valid subscription found", { 
        subscriptionId: validSubscription.id, 
        status: subscriptionStatus,
        tier, 
        endDate: subscriptionEnd 
      });

      // Update organization with subscription info
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.basic;
        
        // Map Stripe status to our status
        let mappedStatus: "active" | "trial" | "past_due" = "active";
        if (validSubscription.status === "trialing") {
          mappedStatus = "trial";
        } else if (validSubscription.status === "past_due") {
          mappedStatus = "past_due";
        }
        
        await supabaseClient
          .from("organizations")
          .update({
            subscription_tier: tier,
            subscription_status: mappedStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSubscriptionId,
            max_active_raffles: limits.maxActiveRaffles,
            max_tickets_per_raffle: limits.maxTicketsPerRaffle,
            templates_available: limits.templatesAvailable,
            current_period_end: subscriptionEnd,
          })
          .eq("id", profile.organization_id);
        logStep("Organization updated", { organizationId: profile.organization_id, status: mappedStatus });
      }
    } else {
      logStep("No valid subscription found (checked active, trialing, past_due)");
    }

    return corsJsonResponse(req, {
      subscribed: hasActiveSub,
      tier,
      subscription_status: subscriptionStatus,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
