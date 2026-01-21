// Billing Audit Logger - Shared utility for all billing-related edge functions
// Logs all billing events to billing_audit_log table for compliance and debugging

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type ActorType = 'user' | 'admin' | 'system' | 'stripe_webhook';

export type BillingAction = 
  // Subscription lifecycle
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_canceled'
  | 'subscription_reactivated'
  | 'subscription_expired'
  // Trial
  | 'trial_started'
  | 'trial_converted'
  | 'trial_expired'
  | 'trial_ending_soon'
  // Payments
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_refunded'
  | 'payment_disputed'
  | 'payment_dispute_closed'
  // Checkout
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'
  // Coupons
  | 'coupon_applied'
  | 'coupon_removed'
  | 'coupon_created'
  | 'coupon_deleted'
  // Payment methods
  | 'payment_method_added'
  | 'payment_method_removed'
  | 'payment_method_updated'
  | 'payment_method_set_default'
  // Invoices
  | 'invoice_created'
  | 'invoice_paid'
  | 'invoice_voided'
  | 'invoice_finalized'
  // Refunds
  | 'refund_requested'
  | 'refund_approved'
  | 'refund_rejected'
  | 'refund_processed'
  | 'refund_failed'
  // Portal
  | 'customer_portal_accessed'
  // Dunning
  | 'dunning_email_sent'
  | 'account_suspended'
  | 'account_reactivated';

export type ResourceType = 
  | 'subscription'
  | 'invoice'
  | 'payment'
  | 'payment_method'
  | 'customer'
  | 'checkout_session'
  | 'coupon'
  | 'refund'
  | 'organization';

export interface AuditLogParams {
  organizationId: string;
  actorId?: string | null;
  actorType: ActorType;
  action: BillingAction;
  resourceType: ResourceType;
  resourceId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  stripeEventId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Log a billing action to the audit log
 * This should be called from all billing-related edge functions
 */
export async function logBillingAction(
  supabase: SupabaseClient,
  params: AuditLogParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('billing_audit_log').insert({
      organization_id: params.organizationId,
      actor_id: params.actorId || null,
      actor_type: params.actorType,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      stripe_event_id: params.stripeEventId || null,
      request_id: params.requestId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[AUDIT-LOGGER] Failed to log billing action:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[AUDIT-LOGGER] Logged: ${params.action} for org ${params.organizationId}`);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[AUDIT-LOGGER] Exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Create a Supabase admin client for audit logging
 * Uses service role key to bypass RLS
 */
export function createAuditClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

/**
 * Log a subscription event for analytics
 */
export async function logSubscriptionEvent(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    eventType: string;
    fromTier?: string | null;
    toTier?: string | null;
    mrrChangeCents?: number;
    stripeEventId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('subscription_events').insert({
      organization_id: params.organizationId,
      event_type: params.eventType,
      from_tier: params.fromTier || null,
      to_tier: params.toTier || null,
      mrr_change_cents: params.mrrChangeCents || 0,
      stripe_event_id: params.stripeEventId || null,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[AUDIT-LOGGER] Failed to log subscription event:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[AUDIT-LOGGER] Subscription event: ${params.eventType} for org ${params.organizationId}`);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[AUDIT-LOGGER] Exception logging subscription event:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Calculate MRR change based on tier transition
 * Uses centralized TIER_MRR_CENTS from stripe-config.ts
 */
import { TIER_MRR_CENTS } from "./stripe-config.ts";

export function calculateMrrChange(
  fromTier: string | null,
  toTier: string | null,
  period: 'monthly' | 'annual' = 'monthly'
): number {
  const prices = TIER_MRR_CENTS[period];
  const fromPrice = fromTier ? (prices[fromTier as keyof typeof prices] || 0) : 0;
  const toPrice = toTier ? (prices[toTier as keyof typeof prices] || 0) : 0;

  return toPrice - fromPrice;
}
