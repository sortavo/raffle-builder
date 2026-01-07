import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

interface RaffleStats {
  id: string;
  title: string;
  totalTickets: number;
  ticketsSold: number;
  ticketsReserved: number;
  revenue: number;
  conversionRate: number;
  drawDate: string | null;
}

interface DashboardStats {
  activeRaffles: number;
  totalRevenue: number;
  ticketsSold: number;
  totalTickets: number;
  conversionRate: number;
  pendingApprovals: number;
  activeRafflesList: RaffleStats[];
  recentActivity: {
    title: string;
    description: string;
    time: string;
    type: 'ticket_sold' | 'payment_approved' | 'raffle_created' | 'ticket_reserved';
  }[];
}

export function useDashboardStats() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for tickets table
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('dashboard-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          // Invalidate and refetch dashboard stats when tickets change
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats", organization.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffles'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats", organization.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, queryClient]);

  return useQuery({
    queryKey: ["dashboard-stats", organization?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!organization?.id) {
        return {
          activeRaffles: 0,
          totalRevenue: 0,
          ticketsSold: 0,
          totalTickets: 0,
          conversionRate: 0,
          pendingApprovals: 0,
          activeRafflesList: [],
          recentActivity: []
        };
      }

      // Fetch active raffles (lightweight query - no tickets)
      const { data: raffles, error: rafflesError } = await supabase
        .from("raffles")
        .select("id, status, total_tickets, ticket_price, title, created_at, draw_date")
        .eq("organization_id", organization.id)
        .is("archived_at", null);

      if (rafflesError) throw rafflesError;

      const activeRafflesData = raffles?.filter(r => r.status === "active" || r.status === "paused") || [];
      const activeRaffleIds = activeRafflesData.map(r => r.id);

      // If no raffles, return empty stats
      if (activeRaffleIds.length === 0) {
        return {
          activeRaffles: 0,
          totalRevenue: 0,
          ticketsSold: 0,
          totalTickets: 0,
          conversionRate: 0,
          pendingApprovals: 0,
          activeRafflesList: [],
          recentActivity: []
        };
      }

      // Use RPC to get aggregated stats (SCALABLE - no ticket download)
      const [dashboardStatsResult, raffleStatsResult] = await Promise.all([
        supabase.rpc('get_dashboard_stats', { p_organization_id: organization.id }),
        supabase.rpc('get_raffle_stats_list', { p_organization_id: organization.id })
      ]);

      // Extract dashboard totals from RPC
      const dashboardData = dashboardStatsResult.data?.[0];
      const raffleStatsMap = new Map(
        (raffleStatsResult.data || []).map((rs: any) => [rs.raffle_id, rs])
      );

      // Build individual raffle stats using RPC data
      const activeRafflesList: RaffleStats[] = activeRafflesData.map(raffle => {
        const stats = raffleStatsMap.get(raffle.id);
        const raffleSold = Number(stats?.sold_count || 0);
        const raffleReserved = Number(stats?.reserved_count || 0);
        const raffleRevenue = Number(stats?.revenue || 0) || (raffleSold * Number(raffle.ticket_price));
        const raffleConversion = raffle.total_tickets > 0 
          ? Math.round((raffleSold / raffle.total_tickets) * 100) 
          : 0;

        return {
          id: raffle.id,
          title: raffle.title,
          totalTickets: raffle.total_tickets,
          ticketsSold: raffleSold,
          ticketsReserved: raffleReserved,
          revenue: raffleRevenue,
          conversionRate: raffleConversion,
          drawDate: raffle.draw_date
        };
      });

      // Get recent activity from analytics events (lightweight)
      const { data: analyticsEvents } = await supabase
        .from("analytics_events")
        .select("event_type, metadata, created_at, raffle_id")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Build recent activity from analytics (no ticket query)
      const recentActivity: DashboardStats['recentActivity'] = [];
      
      for (const event of analyticsEvents || []) {
        const raffle = raffles?.find(r => r.id === event.raffle_id);
        const metadata = event.metadata as Record<string, any> | null;
        
        if (event.event_type === 'purchase') {
          recentActivity.push({
            title: "Boleto vendido",
            description: `${raffle?.title || 'Sorteo'} - ${metadata?.ticket_count || 1} boleto(s)`,
            time: formatTimeAgo(event.created_at),
            type: 'ticket_sold'
          });
        } else if (event.event_type === 'begin_checkout') {
          recentActivity.push({
            title: "Boleto reservado",
            description: `${metadata?.buyer_name || 'Cliente'} - ${raffle?.title || 'Sorteo'}`,
            time: formatTimeAgo(event.created_at),
            type: 'ticket_reserved'
          });
        }
      }

      // Calculate totals from RPC or fallback to raffle sums
      const totalRevenue = Number(dashboardData?.total_revenue || 0) || 
        activeRafflesList.reduce((sum, r) => sum + r.revenue, 0);
      const ticketsSold = Number(dashboardData?.tickets_sold || 0) ||
        activeRafflesList.reduce((sum, r) => sum + r.ticketsSold, 0);
      const totalTickets = Number(dashboardData?.total_tickets || 0) ||
        activeRafflesData.reduce((sum, r) => sum + r.total_tickets, 0);
      const pendingApprovals = Number(dashboardData?.pending_approvals || 0) ||
        activeRafflesList.reduce((sum, r) => sum + r.ticketsReserved, 0);
      const conversionRate = totalTickets > 0 
        ? Math.round((ticketsSold / totalTickets) * 100) 
        : 0;

      return {
        activeRaffles: activeRafflesData.filter(r => r.status === 'active').length,
        totalRevenue,
        ticketsSold,
        totalTickets,
        conversionRate,
        pendingApprovals,
        activeRafflesList,
        recentActivity: recentActivity.slice(0, 5)
      };
    },
    enabled: !!organization?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}