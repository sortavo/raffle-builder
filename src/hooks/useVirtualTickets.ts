import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrdersRealtime } from "./useOrdersRealtime";

interface VirtualTicket {
  ticket_number: string;
  ticket_index: number;
  status: string;
  buyer_name: string | null;
  buyer_email?: string | null;
  buyer_phone?: string | null;
  buyer_city?: string | null;
  payment_reference?: string | null;
  order_id?: string | null;
  reserved_at?: string | null;
  sold_at?: string | null;
}

interface VirtualTicketCounts {
  total_count: number;
  sold_count: number;
  reserved_count: number;
  available_count: number;
}

interface ReserveResult {
  success: boolean;
  reference_code: string | null;
  reserved_until: string | null;
  reserved_count: number;
  error_message: string | null;
}

interface ReserveResilientResult {
  success: boolean;
  reference_code: string | null;
  reserved_until: string | null;
  reserved_count: number;
  ticket_indices: number[] | null;
  ticket_numbers: string[] | null;
  error_message: string | null;
}

// Threshold for using range-based pagination (more efficient for large raffles)
const RANGE_PAGINATION_THRESHOLD = 10000;

export function useVirtualTickets(
  raffleId: string | undefined,
  page: number = 1,
  pageSize: number = 100
) {
  // Enable real-time updates instead of polling
  useOrdersRealtime(raffleId);

  return useQuery({
    queryKey: ['virtual-tickets', raffleId, page, pageSize],
    queryFn: async () => {
      if (!raffleId) return { tickets: [], count: 0, sold: 0, reserved: 0, available: 0 };

      // First get counts to determine total and decide pagination strategy
      const countsResult = await supabase.rpc('get_virtual_ticket_counts', {
        p_raffle_id: raffleId,
      });

      if (countsResult.error) throw countsResult.error;
      const counts = (countsResult.data as VirtualTicketCounts[] | null)?.[0];
      const totalTickets = counts?.total_count || 0;

      // Calculate range for this page (0-indexed internally)
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize - 1, totalTickets - 1);

      // Use range-based RPC for large raffles (O(log n) vs O(n) with OFFSET)
      // For smaller raffles, the original RPC is fine
      let ticketsResult;
      if (totalTickets >= RANGE_PAGINATION_THRESHOLD) {
        // Use optimized range-based pagination
        ticketsResult = await supabase.rpc('get_virtual_tickets_by_range', {
          p_raffle_id: raffleId,
          p_start_index: startIndex,
          p_end_index: endIndex,
        });
      } else {
        // Use original pagination for smaller raffles
        ticketsResult = await supabase.rpc('get_virtual_tickets', {
          p_raffle_id: raffleId,
          p_page: page,
          p_page_size: pageSize,
        });
      }

      if (ticketsResult.error) throw ticketsResult.error;

      return {
        tickets: (ticketsResult.data || []) as VirtualTicket[],
        count: counts?.total_count || 0,
        sold: counts?.sold_count || 0,
        reserved: counts?.reserved_count || 0,
        available: counts?.available_count || 0,
      };
    },
    enabled: !!raffleId,
    // NO refetchInterval - Realtime handles updates via useOrdersRealtime
    staleTime: 30000, // Increased since Realtime keeps data fresh
    gcTime: 60000,
  });
}

export function useVirtualTicketCounts(raffleId: string | undefined) {
  // Enable real-time updates instead of polling
  useOrdersRealtime(raffleId);

  return useQuery({
    queryKey: ['virtual-ticket-counts', raffleId],
    queryFn: async () => {
      if (!raffleId) return { total: 0, sold: 0, reserved: 0, available: 0 };

      const { data, error } = await supabase.rpc('get_virtual_ticket_counts', {
        p_raffle_id: raffleId,
      });

      if (error) throw error;

      const counts = (data as VirtualTicketCounts[] | null)?.[0];
      return {
        total: counts?.total_count || 0,
        sold: counts?.sold_count || 0,
        reserved: counts?.reserved_count || 0,
        available: counts?.available_count || 0,
      };
    },
    enabled: !!raffleId,
    // NO refetchInterval - Realtime handles updates
    staleTime: 30000,
  });
}

// Result type for atomic_reserve_tickets RPC
interface AtomicReserveResult {
  success: boolean;
  order_id: string | null;
  reference_code: string | null;
  reserved_until: string | null;
  ticket_count: number;
  ticket_ranges: { s: number; e: number }[] | null;
  lucky_indices: number[] | null;
  conflict_indices: number[] | null;
  error_message: string | null;
}

// Retry configuration for lock contention
const RESERVE_RETRY_ATTEMPTS = 3;
const RESERVE_RETRY_DELAY_MS = 100;

export function useReserveVirtualTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      raffleId,
      ticketIndices,
      buyerData,
      reservationMinutes = 15,
      orderTotal,
      isLuckyNumbers = false,
    }: {
      raffleId: string;
      ticketIndices: number[];
      buyerData: {
        name: string;
        email: string;
        phone: string;
        city?: string;
      };
      reservationMinutes?: number;
      orderTotal?: number;
      isLuckyNumbers?: boolean;
    }) => {
      let lastError: Error | null = null;
      
      // Retry with exponential backoff for lock contention
      for (let attempt = 0; attempt < RESERVE_RETRY_ATTEMPTS; attempt++) {
        // Use the new atomic RPC with advisory locking
        const { data, error } = await supabase.rpc('atomic_reserve_tickets', {
          p_raffle_id: raffleId,
          p_ticket_indices: ticketIndices,
          p_buyer_name: buyerData.name,
          p_buyer_email: buyerData.email,
          p_buyer_phone: buyerData.phone,
          p_buyer_city: buyerData.city || null,
          p_reservation_minutes: reservationMinutes,
          p_order_total: orderTotal || null,
          p_is_lucky_numbers: isLuckyNumbers,
        });

        if (error) throw error;

        // Cast the response properly
        const raw = (data as AtomicReserveResult[] | null)?.[0];

        // Validate response format
        if (!raw || typeof raw.success !== 'boolean') {
          console.error('[useReserveVirtualTickets] Unexpected response format:', data);
          throw new Error('La reserva devolvió un formato inesperado. Intenta de nuevo.');
        }

        // Check if lock contention - retry with backoff
        if (!raw.success && raw.error_message === 'Raffle is busy, please retry') {
          lastError = new Error(raw.error_message);
          console.log(`[RESERVE] Lock contention, attempt ${attempt + 1}/${RESERVE_RETRY_ATTEMPTS}`);
          const delay = RESERVE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * 50;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Check for ticket conflicts - provide detailed error
        if (!raw.success) {
          const conflictMsg = raw.conflict_indices?.length 
            ? `Boletos no disponibles: ${raw.conflict_indices.slice(0, 5).join(', ')}${raw.conflict_indices.length > 5 ? '...' : ''}`
            : raw.error_message || 'Error al reservar boletos';
          throw new Error(conflictMsg);
        }

        // Success - return order info
        return {
          referenceCode: raw.reference_code!,
          reservedUntil: raw.reserved_until!,
          count: raw.ticket_count,
          orderId: raw.order_id,
          ticketRanges: raw.ticket_ranges,
          luckyIndices: raw.lucky_indices,
        };
      }

      // All retries exhausted
      throw lastError || new Error('No se pudo completar la reserva después de varios intentos');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['virtual-tickets', variables.raffleId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['virtual-ticket-counts', variables.raffleId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['orders', variables.raffleId] 
      });
    },
    onError: (error: Error) => {
      console.error('[useReserveVirtualTickets] Error:', error);
      toast.error('Error al reservar boletos', {
        description: error.message || 'Algunos boletos ya no están disponibles. Por favor intenta con otros.',
      });
    },
  });
}

export function useCheckVirtualTicket() {
  return useMutation({
    mutationFn: async ({
      raffleId,
      ticketNumber,
    }: {
      raffleId: string;
      ticketNumber: string;
    }) => {
      // Parse ticket number to get index
      const ticketIndex = parseInt(ticketNumber.replace(/\D/g, ''), 10);

      if (isNaN(ticketIndex)) {
        return {
          exists: true,
          isAvailable: false,
          status: 'invalid',
          buyerName: null,
        };
      }

      // Use optimized RPC with O(log n) index lookup instead of loading all orders
      const { data, error } = await supabase.rpc('check_ticket_availability', {
        p_raffle_id: raffleId,
        p_ticket_index: ticketIndex,
      });

      if (error) throw error;

      const result = (data as { order_id: string | null; status: string; buyer_name: string | null; is_available: boolean }[] | null)?.[0];

      if (!result) {
        // Fallback if no result (shouldn't happen with our RPC logic)
        return {
          exists: true,
          isAvailable: true,
          status: 'available',
          buyerName: null,
        };
      }

      return {
        exists: true,
        isAvailable: result.is_available,
        status: result.status,
        buyerName: result.buyer_name,
      };
    },
  });
}

/**
 * Prefetch adjacent pages for smooth navigation in mega raffles.
 * This function silently loads data into the cache without triggering UI loading states.
 */
export async function prefetchVirtualTickets(
  queryClient: QueryClient,
  raffleId: string,
  page: number,
  pageSize: number = 100
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: ['virtual-tickets', raffleId, page, pageSize],
    queryFn: async () => {
      // Get counts first to determine strategy
      const countsResult = await supabase.rpc('get_virtual_ticket_counts', {
        p_raffle_id: raffleId,
      });

      if (countsResult.error) throw countsResult.error;
      const counts = (countsResult.data as VirtualTicketCounts[] | null)?.[0];
      const totalTickets = counts?.total_count || 0;

      // Calculate range for this page
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize - 1, totalTickets - 1);

      // Use range-based RPC for large raffles
      let ticketsResult;
      if (totalTickets >= RANGE_PAGINATION_THRESHOLD) {
        ticketsResult = await supabase.rpc('get_virtual_tickets_by_range', {
          p_raffle_id: raffleId,
          p_start_index: startIndex,
          p_end_index: endIndex,
        });
      } else {
        ticketsResult = await supabase.rpc('get_virtual_tickets', {
          p_raffle_id: raffleId,
          p_page: page,
          p_page_size: pageSize,
        });
      }

      if (ticketsResult.error) throw ticketsResult.error;

      return {
        tickets: (ticketsResult.data || []) as VirtualTicket[],
        count: counts?.total_count || 0,
        sold: counts?.sold_count || 0,
        reserved: counts?.reserved_count || 0,
        available: counts?.available_count || 0,
      };
    },
    staleTime: 5000,
  });
}
