import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { eachDayOfInterval, format } from "date-fns";
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
  hasDiscounts: boolean;
  discountAmount: number;
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

  // Default to last 30 days if no date range provided
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  
  const startDate = dateRange?.from || defaultFrom;
  const endDate = dateRange?.to || now;

  // Real-time subscription for orders table
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('dashboard-charts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-charts", organization.id] });
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

      // Use the new RPC that aggregates data on the server (no 1000-row limit)
      const { data, error } = await supabase.rpc('get_dashboard_charts', {
        p_organization_id: organization.id,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      });

      if (error) {
        console.error('Error fetching dashboard charts:', error);
        throw error;
      }

      // Parse the JSONB response
      const chartData = data as {
        daily_revenue: { date: string; revenue: number; tickets: number }[];
        raffle_sales: { id: string; name: string; sold: number; available: number; total: number; revenue: number; ticket_price: number }[];
        period_totals: { tickets_sold: number; revenue: number };
        previous_totals: { tickets_sold: number; revenue: number };
      };

      // Generate all days in the range to fill gaps
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const revenueByDate = new Map<string, { revenue: number; tickets: number }>();
      
      // Index the data from RPC by date
      for (const day of chartData.daily_revenue || []) {
        revenueByDate.set(day.date, { 
          revenue: Number(day.revenue) || 0, 
          tickets: Number(day.tickets) || 0 
        });
      }

      // Build daily revenue with all days (fill gaps with 0)
      const dailyRevenue: DailyRevenue[] = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayData = revenueByDate.get(dateKey);
        return {
          date: format(day, "dd MMM", { locale: es }),
          revenue: dayData?.revenue || 0,
          tickets: dayData?.tickets || 0,
        };
      });

      // Transform raffle sales with colors and discount detection
      const raffleSales: RaffleSales[] = (chartData.raffle_sales || []).map((raffle, index) => {
        const expectedRevenue = Number(raffle.sold) * Number(raffle.ticket_price);
        const actualRevenue = Number(raffle.revenue) || 0;
        const hasDiscounts = actualRevenue < expectedRevenue * 0.99 && actualRevenue > 0; // 1% tolerance
        const discountAmount = hasDiscounts ? expectedRevenue - actualRevenue : 0;

        return {
          name: raffle.name.length > 20 ? raffle.name.substring(0, 20) + "..." : raffle.name,
          sold: Number(raffle.sold) || 0,
          available: Number(raffle.available) || 0,
          total: Number(raffle.total) || 0,
          revenue: actualRevenue,
          color: CHART_COLORS[index % CHART_COLORS.length],
          hasDiscounts,
          discountAmount,
        };
      });

      // Period totals
      const totalRevenue = Number(chartData.period_totals?.revenue) || 0;
      const totalTicketsSold = Number(chartData.period_totals?.tickets_sold) || 0;

      // Calculate percentage changes
      const previousRevenue = Number(chartData.previous_totals?.revenue) || 0;
      const previousTickets = Number(chartData.previous_totals?.tickets_sold) || 0;

      const revenueChange = previousRevenue > 0 
        ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100) 
        : totalRevenue > 0 ? 100 : 0;

      const ticketsChange = previousTickets > 0 
        ? Math.round(((totalTicketsSold - previousTickets) / previousTickets) * 100) 
        : totalTicketsSold > 0 ? 100 : 0;

      return {
        dailyRevenue,
        raffleSales,
        totalRevenue,
        totalTicketsSold,
        revenueChange,
        ticketsChange,
      };
    },
    enabled: !!organization?.id,
    staleTime: 60000, // 1 minute
  });
}
