/**
 * D1: Atomic Database Update Helpers
 *
 * These helpers wrap database functions that perform atomic operations,
 * ensuring data consistency between event recording and organization updates.
 *
 * The `update_organization_from_webhook` function in the database performs:
 * 1. INSERT into stripe_events (idempotent via ON CONFLICT DO NOTHING)
 * 2. CHECK if event was actually inserted (not a duplicate)
 * 3. UPDATE organization atomically in the same transaction
 *
 * If step 3 fails, the entire transaction rolls back, preventing orphaned events.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface AtomicUpdatePayload {
  subscription_tier?: string;
  subscription_status?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_end?: string | null;
  max_active_raffles?: number;
  max_tickets_per_raffle?: number;
  templates_available?: number;
}

export interface AtomicUpdateResult {
  success: boolean;
  duplicate: boolean;
  orgId?: string;
  eventId?: string;
  error?: string;
}

/**
 * Atomically updates an organization from a Stripe webhook event.
 * Uses the database function `update_organization_from_webhook` which
 * handles event deduplication and organization update in a single transaction.
 *
 * @param supabase - Supabase client with service role
 * @param orgId - Organization UUID to update
 * @param eventId - Stripe event ID for idempotency
 * @param eventType - Stripe event type (e.g., 'customer.subscription.updated')
 * @param updatePayload - Fields to update on the organization
 * @returns Result indicating success, duplicate, or error
 *
 * @example
 * const result = await atomicOrganizationUpdate(
 *   supabase,
 *   'org-uuid',
 *   'evt_123',
 *   'customer.subscription.updated',
 *   { subscription_tier: 'pro', subscription_status: 'active' }
 * );
 *
 * if (result.duplicate) {
 *   // Event already processed, safe to return 200
 *   return;
 * }
 *
 * if (!result.success) {
 *   // Transaction failed and rolled back, throw to trigger retry
 *   throw new Error(result.error);
 * }
 */
export async function atomicOrganizationUpdate(
  supabase: SupabaseClient,
  orgId: string,
  eventId: string,
  eventType: string,
  updatePayload: AtomicUpdatePayload
): Promise<AtomicUpdateResult> {
  try {
    const { data, error } = await supabase.rpc('update_organization_from_webhook', {
      p_org_id: orgId,
      p_event_id: eventId,
      p_event_type: eventType,
      p_update_payload: updatePayload,
    });

    if (error) {
      return {
        success: false,
        duplicate: false,
        error: `RPC error: ${error.message}`,
      };
    }

    // The function returns { duplicate: true } if event was already processed
    if (data?.duplicate) {
      return {
        success: true,
        duplicate: true,
        eventId: data.event_id,
      };
    }

    return {
      success: true,
      duplicate: false,
      orgId: data?.org_id,
      eventId: data?.event_id,
    };
  } catch (err) {
    return {
      success: false,
      duplicate: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Checks if a Stripe event has already been processed.
 * Useful for early return in webhook handlers.
 *
 * @param supabase - Supabase client
 * @param eventId - Stripe event ID to check
 * @returns true if event exists (already processed)
 */
export async function isEventProcessed(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle();

  return data !== null;
}
