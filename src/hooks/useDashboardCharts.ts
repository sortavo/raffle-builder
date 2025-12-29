import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subDays, format, startOfDay, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect } from "react";

interface DailyRevenue {
  date: string;
  revenue: number;
  tickets: number;
}

interface RaffleSales {
  name: string;
  sold: number;
  available: number;
  total: number;
  revenue: number;
  color: string;
}

interface ChartData {
  dailyRevenue: DailyRevenue[];
  raffleSales: RaffleSales[];
  totalRevenue: number;
  totalTicketsSold: number;
  revenueChange: number;
  ticketsChange: number;
}

const CHART_COLORS = [
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ec4899", // pink
  "#3b82f6", // blue
];

interface DateRange {
  from: Date;
  to: Date;
}

export function useDashboardCharts(dateRange?: DateRange) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Calculate date ranges based on input or default to last 30 days
  const endDate = dateRange?.to || new Date();
  const startDate = dateRange?.from || subDays(endDate, 30);
  
  // Calculate previous period for comparison (same duration before start date)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const previousStartDate = subDays(startDate, daysDiff);
  const previousEndDate = subDays(startDate, 1);

  // Real-time subscription for tickets table
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('dashboard-charts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          // Invalidate and refetch chart data when tickets change
          queryClient.invalidateQueries({ queryKey: ["dashboard-charts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, queryClient]);

  return useQuery({
    queryKey: ["dashboard-charts", organization?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<ChartData> => {
      if (!organization?.id) {
        return {
          dailyRevenue: [],
          raffleSales: [],
          totalRevenue: 0,
          totalTicketsSold: 0,
          revenueChange: 0,
          ticketsChange: 0,
        };
      }

      // Fetch raffles for this organization
      const { data: raffles, error: rafflesError } = await supabase
        .from("raffles")
        .select("id, title, total_tickets, ticket_price, status")
        .eq("organization_id", organization.id);

      if (rafflesError) throw rafflesError;

      const raffleIds = raffles?.map(r => r.id) || [];

      if (raffleIds.length === 0) {
        // Generate empty chart data with dates
        const days = eachDayOfInterval({
          start: startDate,
          end: endDate,
        });

        return {
          dailyRevenue: days.map(day => ({
            date: format(day, "dd MMM", { locale: es }),
            revenue: 0,
            tickets: 0,
          })),
          raffleSales: [],
          totalRevenue: 0,
          totalTicketsSold: 0,
          revenueChange: 0,
          ticketsChange: 0,
        };
      }

      // Fetch tickets sold in the selected date range - include order_total and payment_reference
      const { data: recentTickets, error: recentError } = await supabase
        .from("tickets")
        .select("id, raffle_id, sold_at, status, order_total, payment_reference")
        .in("raffle_id", raffleIds)
        .eq("status", "sold")
        .gte("sold_at", startDate.toISOString())
        .lte("sold_at", endDate.toISOString());

      if (recentError) throw recentError;

      // Fetch tickets sold in previous period (for comparison)
      const { data: previousTickets, error: previousError } = await supabase
        .from("tickets")
        .select("id, raffle_id, sold_at, order_total, payment_reference")
        .in("raffle_id", raffleIds)
        .eq("status", "sold")
        .gte("sold_at", previousStartDate.toISOString())
        .lte("sold_at", previousEndDate.toISOString());

      if (previousError) throw previousError;

      // Fetch all tickets for raffle breakdown
      const { data: allTickets, error: allError } = await supabase
        .from("tickets")
        .select("id, raffle_id, status, order_total, payment_reference")
        .in("raffle_id", raffleIds);

      if (allError) throw allError;

      // Helper function to calculate revenue correctly using order_total grouped by payment_reference
      type TicketWithRevenue = {
        id: string;
        raffle_id: string;
        order_total: number | null;
        payment_reference: string | null;
      };
      
      const calculateRevenue = (tickets: TicketWithRevenue[] | null, rafflesData: typeof raffles) => {
        if (!tickets || tickets.length === 0) return 0;
        
        // Group by payment_reference to avoid counting the same order multiple times
        const processedReferences = new Set<string>();
        let totalRevenue = 0;
        
        for (const ticket of tickets) {
          // If ticket has payment_reference, only count once per reference
          if (ticket.payment_reference) {
            if (processedReferences.has(ticket.payment_reference)) {
              continue; // Skip, already counted this order
            }
            processedReferences.add(ticket.payment_reference);
            
            // Use order_total if available (includes discounts)
            if (ticket.order_total) {
              totalRevenue += Number(ticket.order_total);
            } else {
              // Fallback: count all tickets with this reference
              const ticketsInOrder = tickets.filter(t => t.payment_reference === ticket.payment_reference);
              const raffle = rafflesData?.find(r => r.id === ticket.raffle_id);
              if (raffle) {
                totalRevenue += ticketsInOrder.length * Number(raffle.ticket_price);
              }
            }
          } else {
            // No payment_reference, count individually using order_total or ticket_price
            if (ticket.order_total) {
              totalRevenue += Number(ticket.order_total);
            } else {
              const raffle = rafflesData?.find(r => r.id === ticket.raffle_id);
              if (raffle) {
                totalRevenue += Number(raffle.ticket_price);
              }
            }
          }
        }
        
        return totalRevenue;
      };

      // Build daily revenue data
      const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });

      const dailyRevenue: DailyRevenue[] = days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayTickets = recentTickets?.filter(t => {
          if (!t.sold_at) return false;
          const soldDate = new Date(t.sold_at);
          return soldDate >= dayStart && soldDate < dayEnd;
        }) || [];

        // Calculate revenue correctly for this day
        const dayRevenue = calculateRevenue(dayTickets, raffles);

        return {
          date: format(day, "dd MMM", { locale: es }),
          revenue: dayRevenue,
          tickets: dayTickets.length,
        };
      });

      // Build raffle sales breakdown with correct revenue calculation
      const raffleSales: RaffleSales[] = raffles
        ?.filter(r => r.status === "active" || r.status === "completed")
        .map((raffle, index) => {
          const raffleTickets = allTickets?.filter(t => t.raffle_id === raffle.id) || [];
          const soldTickets = raffleTickets.filter(t => t.status === "sold");
          const soldCount = soldTickets.length;
          const availableCount = raffleTickets.filter(t => t.status === "available").length;

          // Calculate revenue correctly using order_total grouped by payment_reference
          const raffleRevenue = calculateRevenue(soldTickets, raffles);

          return {
            name: raffle.title.length > 20 ? raffle.title.substring(0, 20) + "..." : raffle.title,
            sold: soldCount,
            available: availableCount,
            total: raffle.total_tickets,
            revenue: raffleRevenue,
            color: CHART_COLORS[index % CHART_COLORS.length],
          };
        })
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 6) || [];

      // Calculate totals using the correct revenue calculation
      const currentRevenue = calculateRevenue(recentTickets, raffles);
      const previousRevenue = calculateRevenue(previousTickets, raffles);

      const currentTickets = recentTickets?.length || 0;
      const previousTicketsCount = previousTickets?.length || 0;

      const revenueChange = previousRevenue > 0 
        ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
        : currentRevenue > 0 ? 100 : 0;

      const ticketsChange = previousTicketsCount > 0
        ? Math.round(((currentTickets - previousTicketsCount) / previousTicketsCount) * 100)
        : currentTickets > 0 ? 100 : 0;

      return {
        dailyRevenue,
        raffleSales,
        totalRevenue: currentRevenue,
        totalTicketsSold: currentTickets,
        revenueChange,
        ticketsChange,
      };
    },
    enabled: !!organization?.id,
    staleTime: 60000, // Consider data stale after 1 minute
  });
}
