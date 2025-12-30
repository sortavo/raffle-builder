import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderVerificationData {
  tickets: Array<{
    id: string;
    ticket_number: string;
    ticket_index: number | null;
    status: string;
    reserved_at: string | null;
    sold_at: string | null;
    payment_reference: string | null;
    order_total: number | null;
    payment_method: string | null;
    buyer_name: string | null;
    buyer_email: string | null;
    buyer_phone: string | null;
    buyer_city: string | null;
  }>;
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
  };
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
    whatsapp_number: string | null;
    slug: string | null;
  } | null;
}

export function useOrderVerification(referenceCode: string | undefined) {
  return useQuery({
    queryKey: ['order-verification', referenceCode],
    queryFn: async (): Promise<OrderVerificationData | null> => {
      if (!referenceCode) return null;

      // First, get tickets with this reference code
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          ticket_index,
          status,
          reserved_at,
          sold_at,
          payment_reference,
          order_total,
          payment_method,
          buyer_name,
          buyer_email,
          buyer_phone,
          buyer_city,
          raffle_id
        `)
        .eq('payment_reference', referenceCode.toUpperCase())
        .order('ticket_index', { ascending: true });

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      if (!tickets || tickets.length === 0) {
        return null;
      }

      // Get the raffle info
      const raffleId = tickets[0].raffle_id;
      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .select(`
          id,
          title,
          slug,
          prize_name,
          prize_images,
          draw_date,
          ticket_price,
          currency_code,
          status,
          organization_id
        `)
        .eq('id', raffleId)
        .single();

      if (raffleError) {
        console.error('Error fetching raffle:', raffleError);
        throw raffleError;
      }

      // Get organization info if available
      let organization = null;
      if (raffle.organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select(`
            id,
            name,
            logo_url,
            whatsapp_number,
            slug
          `)
          .eq('id', raffle.organization_id)
          .single();

        if (!orgError && org) {
          organization = org;
        }
      }

      return {
        tickets: tickets.map(t => ({
          id: t.id,
          ticket_number: t.ticket_number,
          ticket_index: t.ticket_index,
          status: t.status,
          reserved_at: t.reserved_at,
          sold_at: t.sold_at,
          payment_reference: t.payment_reference,
          order_total: t.order_total,
          payment_method: t.payment_method,
          buyer_name: t.buyer_name,
          buyer_email: t.buyer_email,
          buyer_phone: t.buyer_phone,
          buyer_city: t.buyer_city,
        })),
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
        },
        organization,
      };
    },
    enabled: !!referenceCode,
    staleTime: 30000,
  });
}
