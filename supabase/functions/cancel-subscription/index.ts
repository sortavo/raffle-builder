import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";
import { stripeOperation } from "../_shared/stripe-client.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'cancel-subscription');
  const log = createLogger(ctx);

  try {
    log.info("Function started");

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
    
    const enrichedCtx = enrichContext(ctx, { userId: user.id });
    const enrichedLog = createLogger(enrichedCtx);
    enrichedLog.info("User authenticated");

    // Get request body
    const { immediate = false } = await req.json();
    enrichedLog.info("Cancellation type", { immediate });

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("Organization not found for user");
    }
    
    const finalCtx = enrichContext(enrichedCtx, { orgId: profile.organization_id });
    const finalLog = createLogger(finalCtx);
    finalLog.info("Found organization");

    // Get organization with subscription
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_subscription_id, subscription_tier, subscription_status")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org?.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }
    finalLog.info("Found subscription", { subscriptionId: org.stripe_subscription_id });

    // O2: Add idempotency key for Stripe operations
    const idempotencyKey = `cancel_${profile.organization_id}_${immediate ? 'immediate' : 'period_end'}_${Date.now()}`;

    let subscription;
    let cancelAt: Date | null = null;

    if (immediate) {
      // R1: Use stripeOperation with circuit breaker - Cancel immediately
      subscription = await stripeOperation(
        (stripe) => stripe.subscriptions.cancel(org.stripe_subscription_id!, { idempotencyKey }),
        'subscriptions.cancel'
      );
      finalLog.info("Subscription canceled immediately", { status: subscription.status, idempotencyKey });
    } else {
      // R1: Use stripeOperation with circuit breaker - Cancel at period end
      subscription = await stripeOperation(
        (stripe) => stripe.subscriptions.update(
          org.stripe_subscription_id!, 
          { cancel_at_period_end: true },
          { idempotencyKey }
        ),
        'subscriptions.update'
      );
      cancelAt = new Date(subscription.current_period_end * 1000);
      finalLog.info("Subscription set to cancel at period end", { 
        cancelAt: cancelAt.toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        idempotencyKey
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

    // O3: Propagate DB errors instead of silent warning
    if (updateError) {
      finalLog.error("Failed to update organization after cancellation", updateError);
      throw new Error(`Failed to sync cancellation: ${updateError.message}`);
    }

    finalLog.info("Request completed", { durationMs: log.duration() });

    return corsJsonResponse(req, {
      success: true,
      immediate,
      cancel_at: cancelAt?.toISOString() || null,
      status: subscription.status,
    }, 200);

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'cancel-subscription',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
