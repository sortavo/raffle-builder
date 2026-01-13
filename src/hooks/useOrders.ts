import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrdersRealtime } from "./useOrdersRealtime";

export interface Order {
  id: string;
  raffle_id: string;
  organization_id: string;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
  ticket_ranges: { s: number; e: number }[];
  lucky_indices: number[];
  ticket_count: number;
  reference_code: string;
  payment_method: string | null;
  payment_proof_url: string | null;
  order_total: number | null;
  status: 'reserved' | 'pending' | 'sold' | 'canceled';
  reserved_at: string | null;
  reserved_until: string | null;
  sold_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  canceled_at: string | null;
  created_at: string;
  customer_id: string | null;
  updated_at: string | null;
}

interface ReserveTicketsResult {
  success: boolean;
  order_id: string | null;
  reference_code: string | null;
  reserved_until: string | null;
  ticket_count: number;
  error_message: string | null;
}

interface OrderTicketCounts {
  total_tickets: number;
  sold_count: number;
  reserved_count: number;
  available_count: number;
}

/**
 * Hook to reserve tickets using the new orders architecture
 */
export function useReserveTickets() {
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
      const { data, error } = await supabase.rpc('reserve_tickets_v2', {
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

      const result = (data as ReserveTicketsResult[] | null)?.[0];

      if (!result || !result.success) {
        throw new Error(result?.error_message || 'Error al reservar boletos');
      }

      return {
        orderId: result.order_id!,
        referenceCode: result.reference_code!,
        reservedUntil: result.reserved_until!,
        count: result.ticket_count,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['orders', variables.raffleId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['order-ticket-counts', variables.raffleId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['virtual-tickets', variables.raffleId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['virtual-ticket-counts', variables.raffleId] 
      });
    },
    onError: (error: Error) => {
      console.error('[useReserveTickets] Error:', error);
      toast.error('Error al reservar boletos', {
        description: error.message || 'Algunos boletos ya no están disponibles.',
      });
    },
  });
}

/**
 * Hook to get ticket counts from orders table
 */
export function useOrderTicketCounts(raffleId: string | undefined) {
  // Enable real-time updates instead of polling
  useOrdersRealtime(raffleId);

  return useQuery({
    queryKey: ['order-ticket-counts', raffleId],
    queryFn: async () => {
      if (!raffleId) return { total: 0, sold: 0, reserved: 0, available: 0 };

      const { data, error } = await supabase.rpc('get_order_ticket_counts', {
        p_raffle_id: raffleId,
      });

      if (error) throw error;

      const counts = (data as OrderTicketCounts[] | null)?.[0];
      return {
        total: counts?.total_tickets || 0,
        sold: Number(counts?.sold_count) || 0,
        reserved: Number(counts?.reserved_count) || 0,
        available: Number(counts?.available_count) || 0,
      };
    },
    enabled: !!raffleId,
    // NO refetchInterval - Realtime handles updates
    staleTime: 30000,
  });
}

/**
 * Hook to get pending orders for a raffle
 */
export function useRaffleOrders(raffleId: string | undefined, status?: string) {
  // Enable real-time updates instead of polling
  useOrdersRealtime(raffleId);

  return useQuery({
    queryKey: ['orders', raffleId, status],
    queryFn: async () => {
      if (!raffleId) return [];

      let query = supabase
        .from('orders')
        .select(`
          id, reference_code, raffle_id, organization_id,
          ticket_ranges, lucky_indices, ticket_count, order_total,
          status, buyer_name, buyer_email, buyer_phone, buyer_city,
          payment_method, payment_proof_url,
          reserved_at, reserved_until, sold_at, approved_at, canceled_at,
          created_at, updated_at
        `)
        .eq('raffle_id', raffleId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Order[];
    },
    enabled: !!raffleId,
    // NO refetchInterval - Realtime handles updates
    staleTime: 30000,
  });
}

/**
 * Hook to approve an order
 */
export function useApproveOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const { data, error } = await supabase.rpc('approve_order', {
        p_order_id: orderId,
      });

      if (error) throw error;

      const result = (data as { success: boolean; ticket_count: number; error_message: string | null }[] | null)?.[0];

      if (!result?.success) {
        throw new Error(result?.error_message || 'Error al aprobar orden');
      }

      return { ticketCount: result.ticket_count };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-ticket-counts'] });
      queryClient.invalidateQueries({ queryKey: ['virtual-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] });
    },
  });
}

/**
 * Hook to reject an order
 */
export function useRejectOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const { data, error } = await supabase.rpc('reject_order', {
        p_order_id: orderId,
      });

      if (error) throw error;

      const result = (data as { success: boolean; ticket_count: number; error_message: string | null }[] | null)?.[0];

      if (!result?.success) {
        throw new Error(result?.error_message || 'Error al rechazar orden');
      }

      return { ticketCount: result.ticket_count };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-ticket-counts'] });
      queryClient.invalidateQueries({ queryKey: ['virtual-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['pending-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] });
    },
  });
}

/**
 * Hook to get order by reference code
 */
export function useOrderByReference(referenceCode: string | undefined) {
  return useQuery({
    queryKey: ['order-by-reference', referenceCode],
    queryFn: async () => {
      if (!referenceCode) return null;

      const { data, error } = await supabase.rpc('get_order_by_reference', {
        p_reference_code: referenceCode,
      });

      if (error) throw error;

      const result = (data as any[] | null)?.[0];
      return result || null;
    },
    enabled: !!referenceCode,
  });
}

/**
 * Hook to expand ticket numbers from an order
 */
export function useExpandOrderTickets(order: Order | null) {
  return useQuery({
    queryKey: ['order-tickets-expanded', order?.id],
    queryFn: async () => {
      if (!order) return [];

      // Get raffle config for formatting
      const { data: raffle } = await supabase
        .from('raffles')
        .select('numbering_config, total_tickets')
        .eq('id', order.raffle_id)
        .single();

      if (!raffle) return [];

      // Expand ranges
      const indices: number[] = [];
      
      // Add lucky indices
      if (order.lucky_indices?.length) {
        indices.push(...order.lucky_indices);
      }
      
      // Expand ranges
      if (order.ticket_ranges?.length) {
        for (const range of order.ticket_ranges) {
          for (let i = range.s; i <= range.e; i++) {
            indices.push(i);
          }
        }
      }

      // Sort and format
      indices.sort((a, b) => a - b);

      // Format ticket numbers using the same logic as the SQL function
      const config = raffle.numbering_config as any || {};
      const startNumber = config.start_number || 1;
      const step = config.step || 1;
      const padEnabled = config.pad_enabled !== false;
      const padWidth = config.pad_width || String(raffle.total_tickets).length;
      const padChar = config.pad_char || '0';
      const prefix = config.prefix || '';
      const suffix = config.suffix || '';
      const separator = config.separator || '';

      return indices.map(idx => {
        const num = startNumber + (idx * step);
        let numStr = String(num);
        if (padEnabled && numStr.length < padWidth) {
          numStr = padChar.repeat(padWidth - numStr.length) + numStr;
        }
        return `${prefix}${separator}${numStr}${suffix}`;
      });
    },
    enabled: !!order,
  });
}
