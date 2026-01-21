import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { logBillingAction, logSubscriptionEvent } from "../_shared/audit-logger.ts";
import { STRIPE_API_VERSION } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-REFUND] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");
    const requestId = crypto.randomUUID().slice(0, 8);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

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

    logStep("Processing refund action", { refundRequestId, action, userId: user.id, isAdmin: !!isAdmin });

    // Get the refund request
    const { data: refundRequest, error: fetchError } = await supabaseAdmin
      .from("refund_requests")
      .select("*, organizations(email, name)")
      .eq("id", refundRequestId)
      .single();

    if (fetchError || !refundRequest) {
      throw new Error("Refund request not found");
    }

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

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

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
        requestId,
      });

      logStep("Refund rejected", { refundRequestId });
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
      const existingRefunds = await stripe.refunds.list({
        charge: refundRequest.stripe_charge_id,
        limit: 10,
      });

      const pendingOrSucceeded = existingRefunds.data.find(
        (r: Stripe.Refund) => r.status === 'succeeded' || r.status === 'pending'
      );

      if (pendingOrSucceeded) {
        logStep("Refund already exists (idempotency)", {
          existingRefundId: pendingOrSucceeded.id,
          chargeId: refundRequest.stripe_charge_id
        });

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

      // Create the refund in Stripe
      const refund = await stripe.refunds.create({
        charge: refundRequest.stripe_charge_id,
        amount: refundRequest.amount_cents,
        reason: refundRequest.reason === 'duplicate' ? 'duplicate' 
              : refundRequest.reason === 'fraudulent' ? 'fraudulent'
              : 'requested_by_customer',
        metadata: {
          refund_request_id: refundRequestId,
          organization_id: refundRequest.organization_id,
        },
      });

      logStep("Stripe refund created", { refundId: refund.id, status: refund.status });

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
        logStep("Warning: Failed to update refund status", { error: completeError.message });
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
        requestId,
      });

      // Log subscription event for analytics
      await logSubscriptionEvent(supabaseAdmin, {
        organizationId: refundRequest.organization_id,
        eventType: 'refund_processed',
        mrrChangeCents: -refundRequest.amount_cents,
        metadata: { refund_id: refund.id, reason: refundRequest.reason },
      });

      logStep("Refund completed", { refundRequestId, stripeRefundId: refund.id });

      return corsJsonResponse(req, {
        success: true,
        status: 'completed',
        refundId: refund.id,
        amount: refundRequest.amount_cents / 100,
        currency: refundRequest.currency,
      }, 200);

    } catch (stripeError) {
      // Stripe refund failed
      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
      logStep("Stripe refund failed", { error: errorMessage });

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
        details: { error: errorMessage },
      });

      await logBillingAction(supabaseAdmin, {
        organizationId: refundRequest.organization_id,
        actorId: user.id,
        actorType: isAdmin ? 'admin' : 'user',
        action: 'refund_failed',
        resourceType: 'refund',
        resourceId: refundRequestId,
        metadata: { error: errorMessage },
        requestId,
      });

      throw new Error(`Stripe refund failed: ${errorMessage}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
