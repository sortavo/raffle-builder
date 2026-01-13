import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrdersRealtime } from './useOrdersRealtime';

interface TicketCounts {
  total: number;
  sold: number;
  reserved: number;
  available: number;
  cached: boolean;
}

/**
 * Hook to get ticket counts using the cached edge function.
 * Uses Redis cache when available, falls back to DB.
 * Real-time updates via Supabase Realtime (no polling).
 * 
 * @param raffleId - The raffle ID to get counts for
 * @param options - Configuration options
 */
export function useVirtualTicketCountsCached(
  raffleId: string | undefined,
  options?: {
    /** Whether to enable real-time subscription (default: true) */
    enableRealtime?: boolean;
  }
) {
  // Enable real-time updates
  useOrdersRealtime(raffleId, { enabled: options?.enableRealtime !== false });

  return useQuery({
    queryKey: ['virtual-ticket-counts-cached', raffleId],
    queryFn: async (): Promise<TicketCounts> => {
      if (!raffleId) {
        return { total: 0, sold: 0, reserved: 0, available: 0, cached: false };
      }

      try {
        // Try the edge function first (with Redis cache)
        const { data, error } = await supabase.functions.invoke('get-ticket-counts', {
          body: { raffle_id: raffleId },
        });

        if (error) {
          console.warn('[useVirtualTicketCountsCached] Edge function error, falling back to RPC:', error);
          throw error;
        }

        return {
          total: data.total_count || 0,
          sold: data.sold_count || 0,
          reserved: data.reserved_count || 0,
          available: data.available_count || 0,
          cached: data.cached || false,
        };
      } catch {
        // Fallback to direct RPC if edge function fails
        const { data, error } = await supabase.rpc('get_virtual_ticket_counts', {
          p_raffle_id: raffleId,
        });

        if (error) throw error;

        const counts = (data as { total_count: number; sold_count: number; reserved_count: number; available_count: number }[] | null)?.[0];
        
        return {
          total: counts?.total_count || 0,
          sold: counts?.sold_count || 0,
          reserved: counts?.reserved_count || 0,
          available: counts?.available_count || 0,
          cached: false,
        };
      }
    },
    enabled: !!raffleId,
    staleTime: 10000, // 10 seconds - matches Redis cache TTL
    gcTime: 60000, // Keep in cache for 1 minute
    // NO refetchInterval - Realtime handles updates
  });
}

/**
 * Utility to invalidate the cached counts for a raffle.
 * Call this after operations that modify ticket availability.
 * 
 * @param raffleId - The raffle ID to invalidate
 */
export async function invalidateTicketCountsCache(raffleId: string): Promise<void> {
  try {
    await supabase.functions.invoke('get-ticket-counts', {
      body: { raffle_id: raffleId, invalidate: true },
    });
    console.log('[invalidateTicketCountsCache] Cache invalidated for', raffleId);
  } catch (error) {
    console.warn('[invalidateTicketCountsCache] Failed to invalidate cache:', error);
    // Non-critical - cache will expire naturally
  }
}
