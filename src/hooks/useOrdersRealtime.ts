import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Debounce delay in ms to prevent thundering herd with many concurrent users
const INVALIDATION_DEBOUNCE_MS = 500;

/**
 * Hook to subscribe to real-time order changes for a raffle.
 * Uses debounced invalidation to prevent thundering herd with 10K+ concurrent users.
 * 
 * @param raffleId - The raffle ID to subscribe to
 * @param options - Configuration options
 */
export function useOrdersRealtime(
  raffleId: string | undefined,
  options?: {
    /** Additional query keys to invalidate on changes */
    additionalQueryKeys?: string[][];
    /** Whether to enable the subscription (default: true) */
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const enabled = options?.enabled ?? true;
  
  // Debounce state: accumulate query keys and flush after delay
  const pendingInvalidations = useRef<Set<string>>(new Set());
  const invalidationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced invalidation function
  const debouncedInvalidate = useCallback(() => {
    // Clear any existing timeout
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }
    
    // Set new timeout to batch invalidations
    invalidationTimeoutRef.current = setTimeout(() => {
      const keysToInvalidate = Array.from(pendingInvalidations.current);
      pendingInvalidations.current.clear();
      
      console.log(`[Realtime] Flushing ${keysToInvalidate.length} invalidations for raffle ${raffleId}`);
      
      for (const key of keysToInvalidate) {
        if (key === 'pending-approvals-count') {
          // This key doesn't include raffleId
          queryClient.invalidateQueries({ queryKey: [key] });
        } else {
          queryClient.invalidateQueries({ queryKey: [key, raffleId] });
        }
      }
      
      // Invalidate additional custom query keys if provided
      if (options?.additionalQueryKeys) {
        for (const queryKey of options.additionalQueryKeys) {
          queryClient.invalidateQueries({ queryKey });
        }
      }
    }, INVALIDATION_DEBOUNCE_MS);
  }, [queryClient, raffleId, options?.additionalQueryKeys]);

  useEffect(() => {
    if (!raffleId || !enabled) {
      return;
    }

    // Validate UUID format to prevent filter injection
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(raffleId)) {
      console.warn('[Realtime] Invalid raffle ID format, skipping subscription');
      return;
    }

    // Avoid duplicate subscriptions
    if (channelRef.current) {
      return;
    }

    const channelName = `orders-realtime-${raffleId}`;
    
    console.log(`[Realtime] Subscribing to ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `raffle_id=eq.${raffleId}`,
        },
        (payload) => {
          console.log('[Realtime] Order change:', payload.eventType);
          
          // Add all query keys to pending set (debounced)
          pendingInvalidations.current.add('virtual-tickets');
          pendingInvalidations.current.add('virtual-ticket-counts');
          pendingInvalidations.current.add('virtual-ticket-counts-cached');
          pendingInvalidations.current.add('order-ticket-counts');
          pendingInvalidations.current.add('orders');
          pendingInvalidations.current.add('pending-orders');
          pendingInvalidations.current.add('pending-approvals-count');
          
          // Trigger debounced flush
          debouncedInvalidate();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Successfully subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel error for ${channelName}:`, err);
        } else if (status === 'TIMED_OUT') {
          console.warn(`[Realtime] Subscription timed out for ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      // Clear pending timeout on cleanup
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
        invalidationTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [raffleId, queryClient, enabled, debouncedInvalidate]);
}

/**
 * Hook to subscribe to real-time order changes for an organization.
 * Useful for dashboard views that show all orders across raffles.
 * 
 * @param organizationId - The organization ID to subscribe to
 */
export function useOrganizationOrdersRealtime(organizationId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Debounce state for organization-level invalidations
  const pendingInvalidations = useRef<Set<string>>(new Set());
  const invalidationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedInvalidate = useCallback(() => {
    if (invalidationTimeoutRef.current) {
      clearTimeout(invalidationTimeoutRef.current);
    }
    
    invalidationTimeoutRef.current = setTimeout(() => {
      const keysToInvalidate = Array.from(pendingInvalidations.current);
      pendingInvalidations.current.clear();
      
      console.log(`[Realtime] Flushing ${keysToInvalidate.length} org invalidations`);
      
      for (const key of keysToInvalidate) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    }, INVALIDATION_DEBOUNCE_MS);
  }, [queryClient]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    // Validate UUID format to prevent filter injection
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(organizationId)) {
      console.warn('[Realtime] Invalid organization ID format, skipping subscription');
      return;
    }

    if (channelRef.current) {
      return;
    }

    const channelName = `org-orders-realtime-${organizationId}`;
    
    console.log(`[Realtime] Subscribing to org orders: ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[Realtime] Org order change:', payload.eventType);
          
          // Add keys to pending set (debounced)
          pendingInvalidations.current.add('dashboard-stats');
          pendingInvalidations.current.add('dashboard-charts');
          pendingInvalidations.current.add('pending-approvals-count');
          pendingInvalidations.current.add('buyers');
          
          debouncedInvalidate();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to org orders: ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`[Realtime] Unsubscribing from org orders: ${channelName}`);
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current);
        invalidationTimeoutRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient, debouncedInvalidate]);
}
