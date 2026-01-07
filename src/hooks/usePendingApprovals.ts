import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to get count of pending approvals (reserved tickets) for the organization
 * Includes realtime subscription for live updates
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

      // Count reserved tickets (pending approvals) across all active raffles
      const { count, error } = await supabase
        .from('sold_tickets')
        .select('*', { count: 'exact', head: true })
        .in('raffle_id', raffleIds)
        .eq('status', 'reserved');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute as backup
  });

  // Realtime subscription for ticket changes
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('pending-approvals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sold_tickets',
          filter: `status=eq.reserved`,
        },
        () => {
          // Invalidate the count query when tickets change
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
