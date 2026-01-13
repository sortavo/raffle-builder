import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to subscribe to real-time order changes for a raffle.
 * Replaces polling with push-based updates for better performance.
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

  useEffect(() => {
    if (!raffleId || !enabled) {
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
          console.log('[Realtime] Order change:', payload.eventType, payload);
          
          // Invalidate all ticket-related queries
          queryClient.invalidateQueries({
            queryKey: ['virtual-tickets', raffleId],
          });
          queryClient.invalidateQueries({
            queryKey: ['virtual-ticket-counts', raffleId],
          });
          queryClient.invalidateQueries({
            queryKey: ['virtual-ticket-counts-cached', raffleId],
          });
          queryClient.invalidateQueries({
            queryKey: ['order-ticket-counts', raffleId],
          });
          queryClient.invalidateQueries({
            queryKey: ['orders', raffleId],
          });
          queryClient.invalidateQueries({
            queryKey: ['pending-orders', raffleId],
          });
          queryClient.invalidateQueries({
            queryKey: ['pending-approvals-count'],
          });
          
          // Invalidate additional custom query keys if provided
          if (options?.additionalQueryKeys) {
            for (const queryKey of options.additionalQueryKeys) {
              queryClient.invalidateQueries({ queryKey });
            }
          }
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [raffleId, queryClient, enabled, options?.additionalQueryKeys]);
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

  useEffect(() => {
    if (!organizationId) {
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
          
          // Invalidate organization-wide queries
          queryClient.invalidateQueries({
            queryKey: ['dashboard-stats'],
          });
          queryClient.invalidateQueries({
            queryKey: ['dashboard-charts'],
          });
          queryClient.invalidateQueries({
            queryKey: ['pending-approvals-count'],
          });
          queryClient.invalidateQueries({
            queryKey: ['buyers'],
          });
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);
}
