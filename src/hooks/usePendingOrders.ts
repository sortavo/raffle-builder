import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TicketRange {
  s: number;
  e: number;
}

export interface OrderGroup {
  id: string;
  referenceCode: string;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  ticketCount: number;
  ticketRanges: TicketRange[];
  luckyIndices: number[];
  reservedUntil: string | null;
  hasProof: boolean;
  proofUrl: string | null;
  orderTotal: number | null;
  raffleId: string;
  raffleTitle: string;
  raffleSlug: string;
  ticketPrice: number;
  currencyCode: string;
  status: string;
  createdAt: string;
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

      // Get all reserved orders across all raffles - select only needed fields
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, raffle_id, reference_code, ticket_count, ticket_ranges, lucky_indices,
          status, reserved_until, buyer_name, buyer_email, buyer_phone,
          payment_proof_url, order_total, created_at
        `)
        .in('raffle_id', raffleIds)
        .eq('status', 'reserved')
        .order('created_at', { ascending: false })
        .limit(500);

      if (ordersError) throw ordersError;

      // Build raffle map
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

      // Map orders directly (no grouping needed - each row is already an order)
      let totalTickets = 0;

      (orders || []).forEach(order => {
        const raffle = raffleMap.get(order.raffle_id);
        if (!raffle) return;

        // Parse ticket_ranges from JSONB safely
        let ticketRanges: TicketRange[] = [];
        if (order.ticket_ranges && Array.isArray(order.ticket_ranges)) {
          ticketRanges = (order.ticket_ranges as unknown as TicketRange[]);
        }

        const orderGroup: OrderGroup = {
          id: order.id,
          referenceCode: order.reference_code || 'Sin código',
          buyerName: order.buyer_name,
          buyerPhone: order.buyer_phone,
          buyerEmail: order.buyer_email,
          ticketCount: order.ticket_count,
          ticketRanges,
          luckyIndices: order.lucky_indices || [],
          reservedUntil: order.reserved_until,
          hasProof: !!order.payment_proof_url,
          proofUrl: order.payment_proof_url,
          orderTotal: order.order_total,
          raffleId: order.raffle_id,
          raffleTitle: raffle.title,
          raffleSlug: raffle.slug,
          ticketPrice: raffle.ticket_price,
          currencyCode: raffle.currency_code,
          status: order.status,
          createdAt: order.created_at,
        };

        raffle.orders.push(orderGroup);
        raffle.pendingCount += order.ticket_count;
        totalTickets += order.ticket_count;
      });

      // Convert to array and filter out raffles with no orders
      const rafflesWithOrders = Array.from(raffleMap.values())
        .filter(r => r.orders.length > 0)
        .sort((a, b) => b.pendingCount - a.pendingCount);

      const totalOrders = orders?.length || 0;

      return { raffles: rafflesWithOrders, totalOrders, totalTickets };
    },
    enabled: !!organization?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Realtime subscription for orders table
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('pending-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
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
