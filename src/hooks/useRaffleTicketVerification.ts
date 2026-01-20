import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VerificationSearchType = 'email' | 'phone' | 'reference';

interface TicketRange {
  s: number;
  e: number;
}

export interface VerificationResult {
  id: string;
  reference_code: string;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  ticket_count: number;
  ticket_ranges: TicketRange[];
  lucky_indices: number[] | null;
  reserved_at: string | null;
  sold_at: string | null;
  created_at: string | null;
}

export function useRaffleTicketVerification(
  raffleId: string | undefined,
  searchValue: string,
  searchType: VerificationSearchType
) {
  return useQuery({
    queryKey: ['raffle-ticket-verification', raffleId, searchType, searchValue],
    queryFn: async (): Promise<VerificationResult[]> => {
      if (!raffleId || !searchValue.trim()) {
        return [];
      }

      let query = supabase
        .from('orders')
        .select(`
          id,
          reference_code,
          status,
          buyer_name,
          buyer_email,
          buyer_phone,
          ticket_count,
          ticket_ranges,
          lucky_indices,
          reserved_at,
          sold_at,
          created_at
        `)
        .eq('raffle_id', raffleId)
        .in('status', ['reserved', 'pending', 'sold']);

      // Apply filter based on search type
      switch (searchType) {
        case 'email':
          query = query.ilike('buyer_email', `%${searchValue.trim()}%`);
          break;
        case 'phone':
          // Remove spaces and special chars for phone matching
          const cleanPhone = searchValue.trim().replace(/[\s\-\(\)]/g, '');
          query = query.ilike('buyer_phone', `%${cleanPhone}%`);
          break;
        case 'reference':
          query = query.ilike('reference_code', `%${searchValue.trim().toUpperCase()}%`);
          break;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ticket verification:', error);
        throw error;
      }

      return (data || []).map((order) => ({
        ...order,
        ticket_ranges: Array.isArray(order.ticket_ranges) 
          ? (order.ticket_ranges as unknown as TicketRange[])
          : [],
        lucky_indices: order.lucky_indices ?? null,
      }));
    },
    enabled: !!raffleId && !!searchValue.trim() && searchValue.trim().length >= 3,
    staleTime: 30 * 1000, // 30 seconds
  });
}
