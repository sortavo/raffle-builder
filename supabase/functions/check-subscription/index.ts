import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { PRODUCT_TO_TIER, TIER_LIMITS } from "../_shared/stripe-config.ts";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";
import { stripeOperation, isStripeCircuitOpen } from "../_shared/stripe-client.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'check-subscription');
  const log = createLogger(ctx);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log.info("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    const enrichedCtx = enrichContext(ctx, { userId: user.id });
    const enrichedLog = createLogger(enrichedCtx);
    enrichedLog.info("User authenticated", { email: user.email });

    // Get user's organization
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    // R5: Check if Stripe circuit is open - use cached data as fallback
    if (await isStripeCircuitOpen()) {
      enrichedLog.warn("Stripe circuit open - using cached subscription data");

      if (profile?.organization_id) {
        const { data: org } = await supabaseClient
          .from("organizations")
          .select("subscription_tier, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id")
          .eq("id", profile.organization_id)
          .single();

        if (org) {
          return corsJsonResponse(req, {
            subscribed: org.subscription_status === 'active' || org.subscription_status === 'trial',
            tier: org.subscription_tier,
            subscription_status: org.subscription_status,
            subscription_end: org.current_period_end,
            stripe_customer_id: org.stripe_customer_id,
            stripe_subscription_id: org.stripe_subscription_id,
            cached: true,
            message: "Datos en caché. Stripe temporalmente no disponible."
          }, 200);
        }
      }

      // No cached data available
      return corsJsonResponse(req, { 
        subscribed: false,
        tier: null,
        subscription_end: null,
        cached: true,
        message: "Stripe temporalmente no disponible."
      }, 200);
    }

    // R1: Use stripeOperation with circuit breaker
    const customers = await stripeOperation<Stripe.ApiList<Stripe.Customer>>(
      (stripe) => stripe.customers.list({ email: user.email, limit: 1 }),
      'customers.list'
    );

    if (customers.data.length === 0) {
      enrichedLog.info("No customer found");
      return corsJsonResponse(req, { 
        subscribed: false,
        tier: null,
        subscription_end: null,
      }, 200);
    }

    const customerId = customers.data[0].id;
    enrichedLog.info("Found Stripe customer", { customerId });

    // Check for active, trialing, AND past_due subscriptions
    const subscriptions = await stripeOperation<Stripe.ApiList<Stripe.Subscription>>(
      (stripe) => stripe.subscriptions.list({ customer: customerId, limit: 10 }),
      'subscriptions.list'
    );

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
      
      enrichedLog.info("Valid subscription found", { 
        subscriptionId: validSubscription.id, 
        status: subscriptionStatus,
        tier, 
        endDate: subscriptionEnd 
      });

      // Update organization with subscription info
      if (profile?.organization_id) {
        const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.basic;
        
        // Map Stripe status to our status
        let mappedStatus: "active" | "trial" | "past_due" = "active";
        if (validSubscription.status === "trialing") {
          mappedStatus = "trial";
        } else if (validSubscription.status === "past_due") {
          mappedStatus = "past_due";
        }
        
        const { error: updateError } = await supabaseClient
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

        if (updateError) {
          enrichedLog.error("Failed to update organization", updateError, { orgId: profile.organization_id });
          throw new Error(`Failed to sync subscription: ${updateError.message}`);
        }

        enrichedLog.info("Organization updated", { orgId: profile.organization_id, status: mappedStatus });
      }
    } else {
      enrichedLog.info("No valid subscription found (checked active, trialing, past_due)");
    }

    log.info("Request completed", { durationMs: log.duration() });

    return corsJsonResponse(req, {
      subscribed: hasActiveSub,
      tier,
      subscription_status: subscriptionStatus,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
    }, 200);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'check-subscription',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
