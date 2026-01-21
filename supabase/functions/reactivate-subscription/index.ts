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

  const ctx = createRequestContext(req, 'reactivate-subscription');
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
      .select("stripe_subscription_id, cancel_at_period_end")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org?.stripe_subscription_id) {
      throw new Error("No tienes una suscripción activa para reactivar.");
    }

    finalLog.info("Found subscription pending cancellation", { subscriptionId: org.stripe_subscription_id });

    // R1: Use stripeOperation with circuit breaker - Verify subscription exists
    const subscription = await stripeOperation(
      (stripe) => stripe.subscriptions.retrieve(org.stripe_subscription_id!),
      'subscriptions.retrieve'
    );

    if (subscription.status === "canceled") {
      throw new Error("Tu suscripción ya fue cancelada completamente. Debes crear una nueva suscripción.");
    }

    if (!subscription.cancel_at_period_end) {
      throw new Error("Tu suscripción ya está activa y no está programada para cancelarse.");
    }

    // O2: Add idempotency key for Stripe operations
    const idempotencyKey = `reactivate_${profile.organization_id}_${Date.now()}`;

    // R1: Use stripeOperation with circuit breaker - Reactivate subscription
    const reactivatedSub = await stripeOperation(
      (stripe) => stripe.subscriptions.update(
        org.stripe_subscription_id!, 
        { cancel_at_period_end: false },
        { idempotencyKey }
      ),
      'subscriptions.update'
    );

    finalLog.info("Subscription reactivated", { 
      status: reactivatedSub.status,
      cancelAtPeriodEnd: reactivatedSub.cancel_at_period_end,
      idempotencyKey
    });

    // Update organization in database
    const { error: updateError } = await supabaseClient
      .from("organizations")
      .update({
        cancel_at_period_end: false,
      })
      .eq("id", profile.organization_id);

    // O3: Throw error on DB failure instead of silent warning
    if (updateError) {
      finalLog.error("Failed to update organization", updateError);
      throw new Error("Error al actualizar la suscripción. Intenta de nuevo.");
    }

    finalLog.info("Request completed", { durationMs: log.duration() });

    return corsJsonResponse(req, {
      success: true,
      status: reactivatedSub.status,
    }, 200);

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'reactivate-subscription',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
