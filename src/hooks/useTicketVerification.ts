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

      const { data: ticket, error } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
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
            organizations (
              name,
              logo_url
            )
          )
        `)
        .eq('id', ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!ticket) return null;

      const raffle = ticket.raffles as any;
      
      return {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: ticket.status || 'available',
        buyer_name: ticket.buyer_name,
        buyer_email: ticket.buyer_email,
        reserved_at: ticket.reserved_at,
        sold_at: ticket.sold_at,
        approved_at: ticket.approved_at,
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
