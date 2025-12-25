import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subDays, format, startOfDay, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";

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

export function useDashboardCharts() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["dashboard-charts", organization?.id],
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

      const thirtyDaysAgo = subDays(new Date(), 30);
      const sixtyDaysAgo = subDays(new Date(), 60);

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
          start: thirtyDaysAgo,
          end: new Date(),
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

      // Fetch tickets sold in the last 30 days
      const { data: recentTickets, error: recentError } = await supabase
        .from("tickets")
        .select("id, raffle_id, sold_at, status")
        .in("raffle_id", raffleIds)
        .eq("status", "sold")
        .gte("sold_at", thirtyDaysAgo.toISOString());

      if (recentError) throw recentError;

      // Fetch tickets sold in previous 30 days (for comparison)
      const { data: previousTickets, error: previousError } = await supabase
        .from("tickets")
        .select("id, raffle_id, sold_at")
        .in("raffle_id", raffleIds)
        .eq("status", "sold")
        .gte("sold_at", sixtyDaysAgo.toISOString())
        .lt("sold_at", thirtyDaysAgo.toISOString());

      if (previousError) throw previousError;

      // Fetch all tickets for raffle breakdown
      const { data: allTickets, error: allError } = await supabase
        .from("tickets")
        .select("id, raffle_id, status")
        .in("raffle_id", raffleIds);

      if (allError) throw allError;

      // Build daily revenue data
      const days = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: new Date(),
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

        let dayRevenue = 0;
        for (const ticket of dayTickets) {
          const raffle = raffles?.find(r => r.id === ticket.raffle_id);
          if (raffle) {
            dayRevenue += Number(raffle.ticket_price);
          }
        }

        return {
          date: format(day, "dd MMM", { locale: es }),
          revenue: dayRevenue,
          tickets: dayTickets.length,
        };
      });

      // Build raffle sales breakdown
      const raffleSales: RaffleSales[] = raffles
        ?.filter(r => r.status === "active" || r.status === "completed")
        .map((raffle, index) => {
          const raffleTickets = allTickets?.filter(t => t.raffle_id === raffle.id) || [];
          const soldCount = raffleTickets.filter(t => t.status === "sold").length;
          const availableCount = raffleTickets.filter(t => t.status === "available").length;

          return {
            name: raffle.title.length > 20 ? raffle.title.substring(0, 20) + "..." : raffle.title,
            sold: soldCount,
            available: availableCount,
            total: raffle.total_tickets,
            revenue: soldCount * Number(raffle.ticket_price),
            color: CHART_COLORS[index % CHART_COLORS.length],
          };
        })
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 6) || [];

      // Calculate totals and changes
      let currentRevenue = 0;
      let previousRevenue = 0;

      for (const ticket of recentTickets || []) {
        const raffle = raffles?.find(r => r.id === ticket.raffle_id);
        if (raffle) {
          currentRevenue += Number(raffle.ticket_price);
        }
      }

      for (const ticket of previousTickets || []) {
        const raffle = raffles?.find(r => r.id === ticket.raffle_id);
        if (raffle) {
          previousRevenue += Number(raffle.ticket_price);
        }
      }

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
