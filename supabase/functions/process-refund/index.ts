import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { logBillingAction, logSubscriptionEvent } from "../_shared/audit-logger.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";
import { stripeOperation } from "../_shared/stripe-client.ts";
import { mapStripeError } from "../_shared/error-mapper.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'process-refund');
  const log = createLogger(ctx);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log.info("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const enrichedCtx = enrichContext(ctx, { userId: user.id });
    const enrichedLog = createLogger(enrichedCtx);

    // Check if user is platform admin
    const { data: isAdmin } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { refundRequestId, action } = await req.json();
    
    if (!refundRequestId) throw new Error("refundRequestId is required");
    if (!action || !['approve', 'reject'].includes(action)) {
      throw new Error("action must be 'approve' or 'reject'");
    }

    enrichedLog.info("Processing refund action", { refundRequestId, action, isAdmin: !!isAdmin });

    // Get the refund request
    const { data: refundRequest, error: fetchError } = await supabaseAdmin
      .from("refund_requests")
      .select("*, organizations(email, name)")
      .eq("id", refundRequestId)
      .single();

    if (fetchError || !refundRequest) {
      throw new Error("Refund request not found");
    }

    const finalCtx = enrichContext(enrichedCtx, { orgId: refundRequest.organization_id });
    const finalLog = createLogger(finalCtx);

    // Authorization check - only platform admins or org members can process
    if (!isAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id !== refundRequest.organization_id) {
        throw new Error("Not authorized to process this refund");
      }
    }

    if (refundRequest.status !== 'pending') {
      throw new Error(`Refund is already ${refundRequest.status}`);
    }

    if (action === 'reject') {
      // Reject the refund
      const { error: updateError } = await supabaseAdmin
        .from("refund_requests")
        .update({
          status: 'rejected',
          rejected_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", refundRequestId);

      if (updateError) throw new Error(`Failed to update refund: ${updateError.message}`);

      // Log to refund audit
      await supabaseAdmin.from("refund_audit_log").insert({
        refund_request_id: refundRequestId,
        action: 'rejected',
        actor_id: user.id,
        details: { reason: 'Rejected by admin' },
      });

      // Log to billing audit
      await logBillingAction(supabaseAdmin, {
        organizationId: refundRequest.organization_id,
        actorId: user.id,
        actorType: isAdmin ? 'admin' : 'user',
        action: 'refund_rejected',
        resourceType: 'refund',
        resourceId: refundRequestId,
        requestId: ctx.correlationId,
      });

      finalLog.info("Refund rejected", { durationMs: log.duration() });
      return corsJsonResponse(req, { success: true, status: 'rejected' }, 200);
    }

    // Approve and process the refund
    // First update status to processing
    await supabaseAdmin
      .from("refund_requests")
      .update({
        status: 'processing',
        approved_by: user.id,
      })
      .eq("id", refundRequestId);

    try {
      // Issue 5: Check for existing refund (idempotency)
      // R1: Use stripeOperation with circuit breaker
      const existingRefunds = await stripeOperation<Stripe.ApiList<Stripe.Refund>>(
        (stripe) => stripe.refunds.list({ charge: refundRequest.stripe_charge_id, limit: 10 }),
        'refunds.list'
      );

      const pendingOrSucceeded = existingRefunds.data.find(
        (r: Stripe.Refund) => r.status === 'succeeded' || r.status === 'pending'
      );

      if (pendingOrSucceeded) {
        finalLog.info("Refund already exists (idempotency)", {
          existingRefundId: pendingOrSucceeded.id,
          chargeId: refundRequest.stripe_charge_id
        });

        // MT18: Re-validate organization ownership before returning existing refund data
        // This prevents race conditions where authorization might have changed
        if (!isAdmin) {
          const { data: currentProfile } = await supabaseAdmin
            .from("profiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();

          if (currentProfile?.organization_id !== refundRequest.organization_id) {
            finalLog.warn("MT18: Organization mismatch on idempotency check", {
              userOrg: currentProfile?.organization_id,
              refundOrg: refundRequest.organization_id,
            });
            throw new Error("Not authorized to access this refund");
          }
        }

        // Update request with existing refund ID and return success
        await supabaseAdmin
          .from("refund_requests")
          .update({
            stripe_refund_id: pendingOrSucceeded.id,
            status: "completed",
            processed_at: new Date().toISOString()
          })
          .eq("id", refundRequestId);

        return corsJsonResponse(req, {
          success: true,
          refund_id: pendingOrSucceeded.id,
          message: "Refund already processed"
        }, 200);
      }

      // O2: Add idempotency key for Stripe operations
      const idempotencyKey = `refund_${refundRequestId}_${Date.now()}`;

      // R1: Use stripeOperation with circuit breaker - Create the refund
      const refund = await stripeOperation<Stripe.Refund>(
        (stripe) => stripe.refunds.create({
          charge: refundRequest.stripe_charge_id,
          amount: refundRequest.amount_cents,
          reason: refundRequest.reason === 'duplicate' ? 'duplicate' 
                : refundRequest.reason === 'fraudulent' ? 'fraudulent'
                : 'requested_by_customer',
          metadata: {
            refund_request_id: refundRequestId,
            organization_id: refundRequest.organization_id,
          },
        }, { idempotencyKey }),
        'refunds.create'
      );

      finalLog.info("Stripe refund created", { refundId: refund.id, status: refund.status, idempotencyKey });

      // Update refund request with Stripe refund ID
      const { error: completeError } = await supabaseAdmin
        .from("refund_requests")
        .update({
          status: refund.status === 'succeeded' ? 'completed' : 'processing',
          stripe_refund_id: refund.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", refundRequestId);

      if (completeError) {
        finalLog.warn("Failed to update refund status", { error: completeError.message });
      }

      // Log to refund audit
      await supabaseAdmin.from("refund_audit_log").insert({
        refund_request_id: refundRequestId,
        action: 'processed',
        actor_id: user.id,
        details: {
          stripe_refund_id: refund.id,
          stripe_status: refund.status,
          amount_cents: refundRequest.amount_cents,
        },
      });

      // Log to billing audit
      await logBillingAction(supabaseAdmin, {
        organizationId: refundRequest.organization_id,
        actorId: user.id,
        actorType: isAdmin ? 'admin' : 'user',
        action: 'refund_processed',
        resourceType: 'refund',
        resourceId: refundRequestId,
        newValues: {
          stripe_refund_id: refund.id,
          amount_cents: refundRequest.amount_cents,
          currency: refundRequest.currency,
        },
        requestId: ctx.correlationId,
      });

      // Log subscription event for analytics
      await logSubscriptionEvent(supabaseAdmin, {
        organizationId: refundRequest.organization_id,
        eventType: 'refund_processed',
        mrrChangeCents: -refundRequest.amount_cents,
        metadata: { refund_id: refund.id, reason: refundRequest.reason },
      });

      finalLog.info("Refund completed", { stripeRefundId: refund.id, durationMs: log.duration() });

      return corsJsonResponse(req, {
        success: true,
        status: 'completed',
        refundId: refund.id,
        amount: refundRequest.amount_cents / 100,
        currency: refundRequest.currency,
      }, 200);

    } catch (stripeError) {
      // Stripe refund failed
      const err = stripeError instanceof Error ? stripeError : new Error(String(stripeError));
      finalLog.error("Stripe refund failed", err);

      await supabaseAdmin
        .from("refund_requests")
        .update({
          status: 'failed',
          processed_at: new Date().toISOString(),
        })
        .eq("id", refundRequestId);

      await supabaseAdmin.from("refund_audit_log").insert({
        refund_request_id: refundRequestId,
        action: 'failed',
        actor_id: user.id,
        details: { error: err.message },
      });

      await logBillingAction(supabaseAdmin, {
        organizationId: refundRequest.organization_id,
        actorId: user.id,
        actorType: isAdmin ? 'admin' : 'user',
        action: 'refund_failed',
        resourceType: 'refund',
        resourceId: refundRequestId,
        metadata: { error: err.message },
        requestId: ctx.correlationId,
      });

      throw new Error(`Stripe refund failed: ${err.message}`);
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    await captureException(err, {
      functionName: 'process-refund',
      correlationId: ctx.correlationId,
    });

    log.error("Unhandled error", err, { durationMs: log.duration() });

    // E3: Map Stripe errors to user-friendly Spanish messages
    const userMessage = mapStripeError(error);
    return corsJsonResponse(req, { error: userMessage }, 500);
  }
});
