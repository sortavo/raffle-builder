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

interface RpcOrderResponse {
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
  }> | null;
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
  } | null;
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

      // Use RPC function to bypass RLS - this allows public access to order verification
      const { data, error } = await supabase
        .rpc('get_order_by_reference', { p_reference_code: referenceCode });

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }

      // Function returns null if no tickets found
      if (!data) {
        return null;
      }

      const result = data as unknown as RpcOrderResponse;

      // Validate the response has required data
      if (!result.tickets || result.tickets.length === 0 || !result.raffle) {
        return null;
      }

      return {
        tickets: result.tickets,
        raffle: result.raffle,
        organization: result.organization,
      };
    },
    enabled: !!referenceCode,
    staleTime: 30000,
  });
}
