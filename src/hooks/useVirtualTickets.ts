import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VirtualTicket {
  id: string;
  ticket_number: string;
  ticket_index: number;
  status: string;
  buyer_name: string | null;
  buyer_city: string | null;
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
      const { data, error } = await supabase.rpc('reserve_virtual_tickets', {
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

      const result = (data as ReserveResult[] | null)?.[0];
      if (!result?.success) {
        throw new Error(result?.error_message || 'Error al reservar boletos');
      }

      return {
        referenceCode: result.reference_code!,
        reservedUntil: result.reserved_until!,
        count: result.reserved_count,
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

// Helper to check if virtual tickets are enabled for a raffle
export function isVirtualTicketsEnabled(raffle: { customization?: Record<string, unknown> | null } | null): boolean {
  return raffle?.customization?.use_virtual_tickets === true;
}
