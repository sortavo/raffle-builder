import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to get count of pending approvals (reserved orders) for the organization
 * Returns the total TICKET count (not order count) for badge display
 */
export function usePendingApprovals() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pending-approvals-count', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;

      // Get all active raffles for the organization
      const { data: raffles, error: rafflesError } = await supabase
        .from('raffles')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('status', 'active');

      if (rafflesError) throw rafflesError;
      if (!raffles || raffles.length === 0) return 0;

      const raffleIds = raffles.map(r => r.id);

      // Sum ticket_count from orders table for reserved orders
      const { data, error } = await supabase
        .from('orders')
        .select('ticket_count')
        .in('raffle_id', raffleIds)
        .eq('status', 'reserved');

      if (error) throw error;
      
      // Sum all ticket counts
      const totalCount = (data || []).reduce((sum, order) => sum + (order.ticket_count || 0), 0);
      return totalCount;
    },
    enabled: !!organization?.id,
    staleTime: 30000,
    // Realtime subscription handles invalidation - no polling needed
  });

  // Realtime subscription for orders table
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('pending-approvals-realtime')
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
    count: query.data || 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
