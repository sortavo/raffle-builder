import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

interface DashboardStats {
  activeRaffles: number;
  totalRevenue: number;
  ticketsSold: number;
  totalTickets: number;
  conversionRate: number;
  pendingApprovals: number;
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
          recentActivity: []
        };
      }

      // Fetch raffles for this organization
      const { data: raffles, error: rafflesError } = await supabase
        .from("raffles")
        .select("id, status, total_tickets, ticket_price, title, created_at")
        .eq("organization_id", organization.id);

      if (rafflesError) throw rafflesError;

      const activeRaffles = raffles?.filter(r => r.status === "active").length || 0;
      const raffleIds = raffles?.map(r => r.id) || [];

      // If no raffles, return empty stats
      if (raffleIds.length === 0) {
        return {
          activeRaffles: 0,
          totalRevenue: 0,
          ticketsSold: 0,
          totalTickets: 0,
          conversionRate: 0,
          pendingApprovals: 0,
          recentActivity: []
        };
      }

      // Fetch tickets for these raffles
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id, status, raffle_id, buyer_name, ticket_number, sold_at, reserved_at, approved_at")
        .in("raffle_id", raffleIds);

      if (ticketsError) throw ticketsError;

      // Calculate stats
      const soldTickets = tickets?.filter(t => t.status === "sold") || [];
      const reservedTickets = tickets?.filter(t => t.status === "reserved") || [];
      const totalTickets = raffles?.reduce((sum, r) => sum + r.total_tickets, 0) || 0;
      
      // Calculate revenue based on sold tickets and their raffle prices
      let totalRevenue = 0;
      for (const ticket of soldTickets) {
        const raffle = raffles?.find(r => r.id === ticket.raffle_id);
        if (raffle) {
          totalRevenue += Number(raffle.ticket_price);
        }
      }

      // Calculate conversion rate
      const conversionRate = totalTickets > 0 
        ? Math.round((soldTickets.length / totalTickets) * 100) 
        : 0;

      // Count pending approvals (reserved tickets)
      const pendingApprovals = reservedTickets.length;

      // Get recent activity from analytics events
      const { data: analyticsEvents, error: analyticsError } = await supabase
        .from("analytics_events")
        .select("event_type, metadata, created_at, raffle_id")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Build recent activity list
      const recentActivity: DashboardStats['recentActivity'] = [];

      // Add recent sold tickets
      const recentSoldTickets = soldTickets
        .filter(t => t.sold_at)
        .sort((a, b) => new Date(b.sold_at!).getTime() - new Date(a.sold_at!).getTime())
        .slice(0, 3);

      for (const ticket of recentSoldTickets) {
        const raffle = raffles?.find(r => r.id === ticket.raffle_id);
        recentActivity.push({
          title: "Boleto vendido",
          description: `${raffle?.title || 'Sorteo'} - Boleto #${ticket.ticket_number}`,
          time: formatTimeAgo(ticket.sold_at!),
          type: 'ticket_sold'
        });
      }

      // Add recent reservations
      const recentReserved = reservedTickets
        .filter(t => t.reserved_at)
        .sort((a, b) => new Date(b.reserved_at!).getTime() - new Date(a.reserved_at!).getTime())
        .slice(0, 2);

      for (const ticket of recentReserved) {
        const raffle = raffles?.find(r => r.id === ticket.raffle_id);
        recentActivity.push({
          title: "Boleto reservado",
          description: `${ticket.buyer_name || 'Cliente'} - ${raffle?.title || 'Sorteo'}`,
          time: formatTimeAgo(ticket.reserved_at!),
          type: 'ticket_reserved'
        });
      }

      // Sort by time (most recent first)
      recentActivity.sort((a, b) => {
        // Simple sort - activities are already sorted by time
        return 0;
      });

      return {
        activeRaffles,
        totalRevenue,
        ticketsSold: soldTickets.length,
        totalTickets,
        conversionRate,
        pendingApprovals,
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
