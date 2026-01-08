import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VerifiedTicket {
  id: string;
  ticket_number: string;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  reserved_at: string | null;
  sold_at: string | null;
  approved_at: string | null;
  raffle: {
    id: string;
    title: string;
    slug: string;
    prize_name: string;
    prize_images: string[] | null;
    draw_date: string | null;
    ticket_price: number;
    currency_code: string | null;
    status: string;
    winner_ticket_number: string | null;
    winner_announced: boolean | null;
  };
  organization: {
    name: string;
    logo_url: string | null;
  } | null;
}

export function useTicketVerification(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-verification', ticketId],
    queryFn: async (): Promise<VerifiedTicket | null> => {
      if (!ticketId) return null;

      // Query orders table instead of sold_tickets
      // ticketId could be an order ID or we need to search by ticket number
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          reference_code,
          ticket_ranges,
          lucky_indices,
          ticket_count,
          status,
          buyer_name,
          buyer_email,
          reserved_at,
          sold_at,
          approved_at,
          raffles!inner (
            id,
            title,
            slug,
            prize_name,
            prize_images,
            draw_date,
            ticket_price,
            currency_code,
            status,
            winner_ticket_number,
            winner_announced,
            numbering_config,
            total_tickets,
            organizations (
              name,
              logo_url
            )
          )
        `)
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!order) return null;

      const raffle = order.raffles as any;
      
      // Generate first ticket number from the order ranges
      const ranges = order.ticket_ranges as Array<{ s: number; e: number }> || [];
      const firstIndex = ranges.length > 0 ? ranges[0].s : 0;
      const ticketNumber = String(firstIndex + 1); // 0-indexed to 1-indexed
      
      return {
        id: order.id,
        ticket_number: ticketNumber,
        status: order.status || 'reserved',
        buyer_name: order.buyer_name,
        buyer_email: order.buyer_email,
        reserved_at: order.reserved_at,
        sold_at: order.sold_at,
        approved_at: order.approved_at,
        raffle: {
          id: raffle.id,
          title: raffle.title,
          slug: raffle.slug,
          prize_name: raffle.prize_name,
          prize_images: raffle.prize_images,
          draw_date: raffle.draw_date,
          ticket_price: raffle.ticket_price,
          currency_code: raffle.currency_code,
          status: raffle.status,
          winner_ticket_number: raffle.winner_ticket_number,
          winner_announced: raffle.winner_announced,
        },
        organization: raffle.organizations,
      };
    },
    enabled: !!ticketId,
    staleTime: 30000,
  });
}
