import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to get count of active raffles for the organization
 * Includes realtime subscription for live updates
 */
export function useActiveRafflesCount() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['active-raffles-count', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;

      const { count, error } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id,
    staleTime: 60000, // 1 minute
  });

  // Realtime subscription for raffle status changes
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('active-raffles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffles',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['active-raffles-count', organization.id] 
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
