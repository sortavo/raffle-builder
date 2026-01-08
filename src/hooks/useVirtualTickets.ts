import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VirtualTicket {
  ticket_number: string;
  ticket_index: number;
  status: string;
  buyer_name: string | null;
  reserved_until: string | null;
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

export function useVirtualTickets(
  raffleId: string | undefined,
  page: number = 1,
  pageSize: number = 100
) {
  return useQuery({
    queryKey: ['virtual-tickets', raffleId, page, pageSize],
    queryFn: async () => {
      if (!raffleId) return { tickets: [], count: 0, sold: 0, reserved: 0, available: 0 };

      const [ticketsResult, countsResult] = await Promise.all([
        supabase.rpc('get_virtual_tickets', {
          p_raffle_id: raffleId,
          p_page: page,
          p_page_size: pageSize,
        }),
        supabase.rpc('get_virtual_ticket_counts', {
          p_raffle_id: raffleId,
        }),
      ]);

      if (ticketsResult.error) throw ticketsResult.error;
      if (countsResult.error) throw countsResult.error;

      const counts = (countsResult.data as VirtualTicketCounts[] | null)?.[0];

      return {
        tickets: (ticketsResult.data || []) as VirtualTicket[],
        count: counts?.total_count || 0,
        sold: counts?.sold_count || 0,
        reserved: counts?.reserved_count || 0,
        available: counts?.available_count || 0,
      };
    },
    enabled: !!raffleId,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useVirtualTicketCounts(raffleId: string | undefined) {
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
    refetchInterval: 10000,
  });
}

export function useReserveVirtualTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      raffleId,
      ticketIndices,
      buyerData,
      reservationMinutes = 15,
      orderTotal,
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
    }) => {
      // For very large selections (e.g. 10,000), use the resilient RPC that can "fill" collisions.
      const useResilient = ticketIndices.length >= 1000;
      const rpcName = useResilient
        ? ('reserve_virtual_tickets_resilient' as any)
        : ('reserve_virtual_tickets' as any);

      const { data, error } = await (supabase as any).rpc(rpcName, {
        p_raffle_id: raffleId,
        p_ticket_indices: ticketIndices,
        p_buyer_name: buyerData.name,
        p_buyer_email: buyerData.email,
        p_buyer_phone: buyerData.phone,
        p_buyer_city: buyerData.city || null,
        p_reservation_minutes: reservationMinutes,
        p_order_total: orderTotal || null,
      });

      if (error) throw error;

      const raw = (data as any[] | null)?.[0] as (ReserveResult | ReserveResilientResult | undefined);

      // Validate response format
      if (!raw || typeof raw.success !== 'boolean') {
        console.error('[useReserveVirtualTickets] Unexpected response format:', data);
        throw new Error('La reserva devolvió un formato inesperado. Intenta de nuevo.');
      }

      if (!raw.success) {
        throw new Error(raw.error_message || 'Error al reservar boletos');
      }

      const ticketNumbers = (raw as ReserveResilientResult).ticket_numbers || undefined;
      const finalTicketNumbers = ticketNumbers && ticketNumbers.length > 0 ? ticketNumbers : undefined;

      const ticketIdx = (raw as ReserveResilientResult).ticket_indices || undefined;
      const finalTicketIndices = ticketIdx && ticketIdx.length > 0 ? ticketIdx : undefined;

      return {
        referenceCode: raw.reference_code!,
        reservedUntil: raw.reserved_until!,
        count: raw.reserved_count,
        ticketNumbers: finalTicketNumbers,
        ticketIndices: finalTicketIndices,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['virtual-tickets', variables.raffleId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['virtual-ticket-counts', variables.raffleId] 
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
      // For virtual tickets, we check against sold_tickets table
      const { data, error } = await supabase
        .from('sold_tickets')
        .select('id, ticket_number, status, buyer_name')
        .eq('raffle_id', raffleId)
        .eq('ticket_number', ticketNumber)
        .maybeSingle();

      if (error) throw error;

      return {
        exists: true,
        isAvailable: !data,
        status: data?.status || 'available',
        buyerName: data?.buyer_name || null,
      };
    },
  });
}

// All raffles now use virtual tickets - legacy helper removed
