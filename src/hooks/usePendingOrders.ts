import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OrderGroup {
  referenceCode: string;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  tickets: any[];
  reservedUntil: string | null;
  hasProof: boolean;
  proofUrl: string | null;
  orderTotal: number | null;
  raffleId: string;
  raffleTitle: string;
  raffleSlug: string;
  ticketPrice: number;
  currencyCode: string;
}

interface RaffleWithOrders {
  id: string;
  title: string;
  slug: string;
  ticket_price: number;
  currency_code: string;
  orders: OrderGroup[];
  pendingCount: number;
}

/**
 * Hook to get all pending orders across all active raffles for the organization
 */
export function usePendingOrders(raffleIdFilter?: string) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pending-orders', organization?.id, raffleIdFilter],
    queryFn: async () => {
      if (!organization?.id) return { raffles: [], totalOrders: 0, totalTickets: 0 };

      // Get all active raffles for the organization
      let rafflesQuery = supabase
        .from('raffles')
        .select('id, title, slug, ticket_price, currency_code')
        .eq('organization_id', organization.id)
        .eq('status', 'active');

      if (raffleIdFilter) {
        rafflesQuery = rafflesQuery.eq('id', raffleIdFilter);
      }

      const { data: raffles, error: rafflesError } = await rafflesQuery;

      if (rafflesError) throw rafflesError;
      if (!raffles || raffles.length === 0) {
        return { raffles: [], totalOrders: 0, totalTickets: 0 };
      }

      const raffleIds = raffles.map(r => r.id);

      // Get all reserved tickets across all raffles
      const { data: tickets, error: ticketsError } = await supabase
        .from('sold_tickets')
        .select('*')
        .in('raffle_id', raffleIds)
        .eq('status', 'reserved')
        .order('created_at', { ascending: false })
        .limit(500); // Limit for performance

      if (ticketsError) throw ticketsError;

      // Group tickets by raffle, then by payment_reference
      const raffleMap = new Map<string, RaffleWithOrders>();

      raffles.forEach(raffle => {
        raffleMap.set(raffle.id, {
          id: raffle.id,
          title: raffle.title,
          slug: raffle.slug,
          ticket_price: raffle.ticket_price || 0,
          currency_code: raffle.currency_code || 'MXN',
          orders: [],
          pendingCount: 0,
        });
      });

      // Group tickets into orders
      const orderMap = new Map<string, OrderGroup>();

      (tickets || []).forEach(ticket => {
        const key = `${ticket.raffle_id}:${ticket.payment_reference || `no-ref-${ticket.id}`}`;
        const raffle = raffleMap.get(ticket.raffle_id);
        
        if (!raffle) return;

        if (!orderMap.has(key)) {
          orderMap.set(key, {
            referenceCode: ticket.payment_reference || 'Sin código',
            buyerName: ticket.buyer_name,
            buyerPhone: ticket.buyer_phone,
            buyerEmail: ticket.buyer_email,
            tickets: [],
            reservedUntil: ticket.reserved_until,
            hasProof: !!ticket.payment_proof_url,
            proofUrl: ticket.payment_proof_url,
            orderTotal: ticket.order_total ?? null,
            raffleId: ticket.raffle_id,
            raffleTitle: raffle.title,
            raffleSlug: raffle.slug,
            ticketPrice: raffle.ticket_price,
            currencyCode: raffle.currency_code,
          });
        }

        const order = orderMap.get(key)!;
        order.tickets.push(ticket);

        if (ticket.payment_proof_url) {
          order.hasProof = true;
          order.proofUrl = ticket.payment_proof_url;
        }

        if (ticket.order_total && !order.orderTotal) {
          order.orderTotal = ticket.order_total;
        }
      });

      // Assign orders to raffles
      orderMap.forEach(order => {
        const raffle = raffleMap.get(order.raffleId);
        if (raffle) {
          raffle.orders.push(order);
          raffle.pendingCount += order.tickets.length;
        }
      });

      // Convert to array and filter out raffles with no orders
      const rafflesWithOrders = Array.from(raffleMap.values())
        .filter(r => r.orders.length > 0)
        .sort((a, b) => b.pendingCount - a.pendingCount);

      const totalOrders = orderMap.size;
      const totalTickets = tickets?.length || 0;

      return { raffles: rafflesWithOrders, totalOrders, totalTickets };
    },
    enabled: !!organization?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Realtime subscription for ticket changes
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('pending-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sold_tickets',
          filter: `status=eq.reserved`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['pending-orders', organization.id] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['pending-approvals-count', organization.id] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, queryClient]);

  return {
    raffles: query.data?.raffles || [],
    totalOrders: query.data?.totalOrders || 0,
    totalTickets: query.data?.totalTickets || 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
