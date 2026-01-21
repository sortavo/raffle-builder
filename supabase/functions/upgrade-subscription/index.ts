import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse, getCorsHeaders } from "../_shared/cors.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";
import { stripeOperation } from "../_shared/stripe-client.ts";
import { canManageSubscription } from "../_shared/role-validator.ts";
import { checkTenantRateLimit, TENANT_RATE_LIMITS, tenantRateLimitResponse } from "../_shared/tenant-rate-limiter.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'upgrade-subscription');
  const log = createLogger(ctx);

  try {
    log.info("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
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

    // Get request body
    const { priceId } = await req.json();
    if (!priceId) throw new Error("priceId is required");
    enrichedLog.info("Request parsed", { priceId });

    // Get user's organization with subscription info
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("Could not find user's organization");
    }

    const finalCtx = enrichContext(enrichedCtx, { orgId: profile.organization_id });
    const finalLog = createLogger(finalCtx);
    finalLog.info("Found profile");

    // MT12: Validate user has owner/admin role before allowing upgrade
    const roleCheck = await canManageSubscription(supabaseClient, user.id, profile.organization_id);
    if (!roleCheck.isValid) {
      finalLog.warn("Unauthorized upgrade attempt", { role: roleCheck.role, error: roleCheck.error });
      return corsJsonResponse(req, { error: roleCheck.error || "Not authorized to manage subscription" }, 403);
    }
    finalLog.info("Role validated", { role: roleCheck.role });

    // MT8: Per-tenant rate limiting
    const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
    if (redisUrl && redisToken) {
      const rateLimitResult = await checkTenantRateLimit(
        redisUrl,
        redisToken,
        profile.organization_id,
        user.id,
        TENANT_RATE_LIMITS.SUBSCRIPTION
      );
      if (!rateLimitResult.allowed) {
        finalLog.warn("Rate limit exceeded", { blockedBy: rateLimitResult.blockedBy });
        return tenantRateLimitResponse(rateLimitResult, getCorsHeaders(req));
      }
    }

    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Could not find organization");
    }
    finalLog.info("Found organization", { 
      subscriptionId: org.stripe_subscription_id,
      customerId: org.stripe_customer_id 
    });

    if (!org.stripe_subscription_id) {
      throw new Error("No active subscription found. Please create a new subscription.");
    }

    // R1: Use stripeOperation with circuit breaker - Retrieve current subscription
    const subscription = await stripeOperation<Stripe.Subscription>(
      (stripe) => stripe.subscriptions.retrieve(org.stripe_subscription_id!),
      'subscriptions.retrieve'
    );
    finalLog.info("Retrieved subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      itemsCount: subscription.items.data.length
    });

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      throw new Error(`Subscription is not active. Current status: ${subscription.status}`);
    }

    // Detect if user is in trial period
    const isInTrial = subscription.status === "trialing";
    finalLog.info("Subscription details", {
      subscriptionId: subscription.id,
      status: subscription.status,
      isInTrial,
      trialEnd: subscription.trial_end,
    });

    // Get the subscription item ID (assuming single item subscription)
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new Error("No subscription item found");
    }
    finalLog.info("Found subscription item", { subscriptionItemId });

    // Get current and new prices to determine if it's an upgrade or downgrade
    const currentPriceId = subscription.items.data[0]?.price.id;
    
    // R1: Use stripeOperation for price retrieval
    const [currentPrice, newPrice] = await Promise.all([
      stripeOperation<Stripe.Price>((stripe) => stripe.prices.retrieve(currentPriceId), 'prices.retrieve.current'),
      stripeOperation<Stripe.Price>((stripe) => stripe.prices.retrieve(priceId), 'prices.retrieve.new'),
    ]);
    
    const currentAmount = currentPrice.unit_amount || 0;
    const newAmount = newPrice.unit_amount || 0;
    const isDowngrade = newAmount < currentAmount;
    
    finalLog.info("Price comparison", { 
      currentPriceId,
      currentAmount,
      newPriceId: priceId,
      newAmount,
      isDowngrade
    });

    // Build update params based on subscription state
    const updateParams: Stripe.SubscriptionUpdateParams = {
      items: [{
        id: subscriptionItemId,
        price: priceId,
      }],
    };

    // Determine proration behavior:
    // - Trial + Upgrade: End trial immediately, charge full price (no proration since no prior payment)
    // - Active + Upgrade: Prorate and charge difference immediately
    // - Downgrade: No proration, change applies at next billing cycle
    if (isInTrial && !isDowngrade) {
      updateParams.trial_end = "now"; // End trial immediately
      updateParams.proration_behavior = "none"; // No proration (no prior payment)
      finalLog.info("Trial detected - ending trial immediately, charging full new price");
    } else if (isDowngrade) {
      updateParams.proration_behavior = "none";
    } else {
      updateParams.proration_behavior = "always_invoice";
    }

    // O2: Add idempotency key for Stripe operations
    const idempotencyKey = `upgrade_${profile.organization_id}_${priceId}_${Date.now()}`;

    // R1: Use stripeOperation with circuit breaker - Update the subscription
    const updatedSubscription = await stripeOperation<Stripe.Subscription>(
      (stripe) => stripe.subscriptions.update(
        org.stripe_subscription_id!, 
        updateParams,
        { idempotencyKey }
      ),
      'subscriptions.update'
    );
    finalLog.info("Subscription updated successfully", { 
      newStatus: updatedSubscription.status,
      newPriceId: priceId,
      prorationBehavior: isDowngrade ? "none" : "always_invoice",
      idempotencyKey
    });

    // Get the latest invoice to show what was charged (only relevant for upgrades)
    let amountCharged = 0;
    let currency = "usd";
    
    if (!isDowngrade) {
      const latestInvoice = await stripeOperation<Stripe.ApiList<Stripe.Invoice>>(
        (stripe) => stripe.invoices.list({ subscription: org.stripe_subscription_id!, limit: 1 }),
        'invoices.list'
      );
      
      amountCharged = latestInvoice.data[0]?.amount_paid || 0;
      currency = latestInvoice.data[0]?.currency || "usd";
      finalLog.info("Fetched invoice details", { amountCharged, currency });
    }

    const nextBillingDate = updatedSubscription.current_period_end 
      ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
      : null;

    // Sync current_period_end to organization
    const { error: updateError } = await supabaseClient
      .from("organizations")
      .update({
        current_period_end: nextBillingDate,
      })
      .eq("id", profile.organization_id);

    if (updateError) {
      finalLog.error("Failed to sync period end", updateError);
      // Non-critical, don't throw
    }

    finalLog.info("Upgrade completed", { isDowngrade, amountCharged, nextBillingDate, durationMs: log.duration() });

    return corsJsonResponse(req, { 
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
      },
      is_downgrade: isDowngrade,
      amount_charged: amountCharged,
      currency: currency,
      next_billing_date: nextBillingDate,
    }, 200);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'upgrade-subscription',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
