import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { logger } from "@/lib/logger";

export interface AdminOverviewStats {
  totalOrgs: number;
  totalUsers: number;
  totalRaffles: number;
  activeRaffles: number;
  totalTicketsSold: number;
  newOrgsInPeriod: number;
  newUsersInPeriod: number;
  newRafflesInPeriod: number;
  ticketsSoldInPeriod: number;
  subscriptionStats: {
    basic: number;
    pro: number;
    premium: number;
    trial: number;
    active: number;
  };
}

export interface AdminFinancialStats {
  totalRevenue: number;
  mrrEstimate: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  trialConversions: number;
  churnRate: number;
  revenueByTier: {
    basic: number;
    pro: number;
    premium: number;
  };
  subscriptionsInPeriod: number;
}

export interface AdminActivityStats {
  activeRaffles: number;
  completedRaffles: number;
  ticketsSold: number;
  ticketsReserved: number;
  pendingApprovals: number;
  recentEvents: Array<{
    id: string;
    type: string;
    metadata: any;
    created_at: string;
  }>;
  topRaffles: Array<{
    id: string;
    title: string;
    organization_name: string;
    tickets_sold: number;
    total_tickets: number;
  }>;
}

export interface AdminUserStats {
  totalUsers: number;
  newUsersInPeriod: number;
  usersByRole: {
    owner: number;
    admin: number;
    member: number;
  };
  usersByPlan: {
    basic: number;
    pro: number;
    premium: number;
    trial: number;
  };
  recentRegistrations: Array<{
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    organization_name: string | null;
  }>;
}

// ============================================================================
// Phase 7: Consolidated Admin Overview Stats (replaces 10+ queries with 1)
// ============================================================================
export function useAdminOverviewStats(dateRange: DateRange | undefined) {
  return useQuery({
    queryKey: ["admin-overview-stats", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<AdminOverviewStats> => {
      const fromDate = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : null;
      const toDate = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : null;

      // Single RPC call replaces 10+ individual queries
      const { data, error } = await supabase.rpc('get_admin_overview_stats', {
        p_from_date: fromDate,
        p_to_date: toDate,
      });

      if (error) {
        console.error('[useAdminOverviewStats] RPC error:', error);
        throw error;
      }

      // Parse JSONB result
      const stats = data as {
        total_organizations: number;
        active_organizations: number;
        total_users: number;
        total_raffles: number;
        active_raffles: number;
        completed_raffles: number;
        new_orgs_in_period: number;
        new_users_in_period: number;
        new_raffles_in_period: number;
        total_tickets_sold: number;
        tickets_sold_in_period: number;
        total_revenue: number;
        subscriptions: {
          basic: number;
          pro: number;
          premium: number;
          enterprise: number;
          free: number;
          trial: number;
          active: number;
        };
      };

      return {
        totalOrgs: stats.total_organizations || 0,
        totalUsers: stats.total_users || 0,
        totalRaffles: stats.total_raffles || 0,
        activeRaffles: stats.active_raffles || 0,
        totalTicketsSold: stats.total_tickets_sold || 0,
        newOrgsInPeriod: stats.new_orgs_in_period || 0,
        newUsersInPeriod: stats.new_users_in_period || 0,
        newRafflesInPeriod: stats.new_raffles_in_period || 0,
        ticketsSoldInPeriod: stats.tickets_sold_in_period || 0,
        subscriptionStats: {
          basic: stats.subscriptions?.basic || 0,
          pro: stats.subscriptions?.pro || 0,
          premium: stats.subscriptions?.premium || 0,
          trial: stats.subscriptions?.trial || 0,
          active: stats.subscriptions?.active || 0,
        },
      };
    },
  });
}

export function useAdminFinancialStats(dateRange: DateRange | undefined) {
  return useQuery({
    queryKey: ["admin-financial-stats", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<AdminFinancialStats> => {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("subscription_tier, subscription_status, stripe_subscription_id");

      const activeSubscriptions = orgs?.filter(o => o.subscription_status === "active").length || 0;
      const canceledSubscriptions = orgs?.filter(o => o.subscription_status === "canceled").length || 0;

      // Estimate MRR based on subscription tiers
      const tierPrices = { basic: 29, pro: 79, premium: 199 };
      let mrrEstimate = 0;
      const revenueByTier = { basic: 0, pro: 0, premium: 0 };

      orgs?.forEach((org) => {
        if (org.subscription_status === "active" && org.subscription_tier) {
          const price = tierPrices[org.subscription_tier as keyof typeof tierPrices] || 0;
          mrrEstimate += price;
          revenueByTier[org.subscription_tier as keyof typeof revenueByTier] += price;
        }
      });

      const totalRevenue = mrrEstimate * 12; // Annualized estimate
      const churnRate = activeSubscriptions > 0 ? (canceledSubscriptions / (activeSubscriptions + canceledSubscriptions)) * 100 : 0;

      return {
        totalRevenue,
        mrrEstimate,
        activeSubscriptions,
        canceledSubscriptions,
        trialConversions: activeSubscriptions,
        churnRate: Math.round(churnRate * 10) / 10,
        revenueByTier,
        subscriptionsInPeriod: activeSubscriptions,
      };
    },
  });
}

export function useAdminActivityStats(dateRange: DateRange | undefined) {
  return useQuery({
    queryKey: ["admin-activity-stats", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<AdminActivityStats> => {
      const fromDate = dateRange?.from?.toISOString() || new Date(0).toISOString();
      const toDate = dateRange?.to?.toISOString() || new Date().toISOString();

      // Query orders table for activity stats
      const [
        { count: activeRaffles },
        { count: completedRaffles },
        { data: soldOrdersData },
        { data: reservedOrdersData },
        { data: pendingOrdersData },
        { data: recentEvents },
        { data: rafflesData },
      ] = await Promise.all([
        supabase.from("raffles").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("raffles").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("orders").select("ticket_count").eq("status", "sold").gte("sold_at", fromDate).lte("sold_at", toDate),
        supabase.from("orders").select("ticket_count").eq("status", "reserved"),
        supabase.from("orders").select("ticket_count").eq("status", "reserved").not("buyer_name", "is", null),
        supabase.from("analytics_events").select("id, event_type, metadata, created_at").gte("created_at", fromDate).lte("created_at", toDate).order("created_at", { ascending: false }).limit(20),
        supabase.from("raffles").select(`
          id, title, total_tickets, organization_id,
          organizations:organization_id (name)
        `).eq("status", "active").limit(10),
      ]);

      // Sum ticket_count from orders
      const ticketsSold = soldOrdersData?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;
      const ticketsReserved = reservedOrdersData?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;
      const pendingApprovals = pendingOrdersData?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;

      // Get ticket counts for each raffle from orders (batched query)
      const topRaffles: AdminActivityStats["topRaffles"] = [];
      if (rafflesData && rafflesData.length > 0) {
        const raffleIds = rafflesData.map(r => r.id);
        
        // Batch query for all raffle sold counts
        const { data: allSoldData } = await supabase
          .from("orders")
          .select("raffle_id, ticket_count")
          .in("raffle_id", raffleIds)
          .eq("status", "sold");

        // Group by raffle_id
        const soldByRaffle = new Map<string, number>();
        allSoldData?.forEach(order => {
          const current = soldByRaffle.get(order.raffle_id) || 0;
          soldByRaffle.set(order.raffle_id, current + (order.ticket_count || 0));
        });

        for (const raffle of rafflesData) {
          topRaffles.push({
            id: raffle.id,
            title: raffle.title,
            organization_name: (raffle.organizations as any)?.name || "Sin organización",
            tickets_sold: soldByRaffle.get(raffle.id) || 0,
            total_tickets: raffle.total_tickets,
          });
        }
        topRaffles.sort((a, b) => b.tickets_sold - a.tickets_sold);
      }

      return {
        activeRaffles: activeRaffles || 0,
        completedRaffles: completedRaffles || 0,
        ticketsSold: ticketsSold || 0,
        ticketsReserved: ticketsReserved || 0,
        pendingApprovals: pendingApprovals || 0,
        recentEvents: (recentEvents || []).map(e => ({
          id: e.id,
          type: e.event_type,
          metadata: e.metadata,
          created_at: e.created_at || "",
        })),
        topRaffles: topRaffles.slice(0, 5),
      };
    },
  });
}

export function useAdminUserStats(dateRange: DateRange | undefined) {
  return useQuery({
    queryKey: ["admin-user-stats", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<AdminUserStats> => {
      const fromDate = dateRange?.from?.toISOString() || new Date(0).toISOString();
      const toDate = dateRange?.to?.toISOString() || new Date().toISOString();

      const [
        { count: totalUsers },
        { count: newUsersInPeriod },
        { data: userRoles },
        { data: profiles },
        { data: recentProfiles },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("user_roles").select("role"),
        supabase.from("profiles").select(`
          id, organization_id,
          organizations:organization_id (subscription_tier, subscription_status)
        `),
        supabase.from("profiles").select(`
          id, email, full_name, created_at, organization_id,
          organizations:organization_id (name)
        `).gte("created_at", fromDate).lte("created_at", toDate).order("created_at", { ascending: false }).limit(10),
      ]);

      const usersByRole = { owner: 0, admin: 0, member: 0 };
      userRoles?.forEach((r) => {
        if (r.role in usersByRole) {
          usersByRole[r.role as keyof typeof usersByRole]++;
        }
      });

      const usersByPlan = { basic: 0, pro: 0, premium: 0, trial: 0 };
      profiles?.forEach((p) => {
        const org = p.organizations as any;
        if (org?.subscription_status === "trial") {
          usersByPlan.trial++;
        } else if (org?.subscription_tier) {
          usersByPlan[org.subscription_tier as keyof typeof usersByPlan]++;
        }
      });

      return {
        totalUsers: totalUsers || 0,
        newUsersInPeriod: newUsersInPeriod || 0,
        usersByRole,
        usersByPlan,
        recentRegistrations: (recentProfiles || []).map(p => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          created_at: p.created_at || "",
          organization_name: (p.organizations as any)?.name || null,
        })),
      };
    },
  });
}

// ============================================================================
// Phase 10: Materialized View Hooks (Ultra-fast pre-computed stats)
// ============================================================================

interface MVAdminStats {
  total_organizations: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  canceled_subscriptions: number;
  total_users: number;
  total_raffles: number;
  active_raffles: number;
  completed_raffles: number;
  total_tickets_sold: number;
  total_revenue: number;
  tier_basic: number;
  tier_pro: number;
  tier_premium: number;
  tier_enterprise: number;
  tier_none: number;
  refreshed_at: string;
}

interface MVDailyStat {
  stat_date: string;
  orders_count: number;
  tickets_sold: number;
  revenue: number;
}

interface MVTopRaffle {
  raffle_id: string;
  title: string;
  organization_id: string;
  organization_name: string;
  total_tickets: number;
  status: string;
  tickets_sold: number;
  revenue: number;
  created_at: string;
}

/**
 * Ultra-fast admin stats from materialized view
 * Refreshed every 5 minutes via scheduled function
 */
export function useAdminStatsMV() {
  return useQuery({
    queryKey: ["admin-stats-mv"],
    queryFn: async (): Promise<MVAdminStats | null> => {
      const { data, error } = await supabase
        .from('mv_admin_stats')
        .select('*')
        .single();

      if (error) {
        logger.error('[useAdminStatsMV] Error fetching MV:', error);
        throw error;
      }

      return data as MVAdminStats;
    },
    staleTime: 5 * 60 * 1000, // 5 min - matches MV refresh rate
  });
}

/**
 * Daily stats from materialized view for trend charts
 */
export function useDailyStatsMV(days: number = 30) {
  return useQuery({
    queryKey: ["daily-stats-mv", days],
    queryFn: async (): Promise<MVDailyStat[]> => {
      const cutoffDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('mv_daily_stats')
        .select('*')
        .gte('stat_date', cutoffDate)
        .order('stat_date', { ascending: true });

      if (error) {
        logger.error('[useDailyStatsMV] Error fetching MV:', error);
        throw error;
      }

      return (data || []) as MVDailyStat[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Top raffles from materialized view
 */
export function useTopRafflesMV(limit: number = 10) {
  return useQuery({
    queryKey: ["top-raffles-mv", limit],
    queryFn: async (): Promise<MVTopRaffle[]> => {
      const { data, error } = await supabase
        .from('mv_top_raffles')
        .select('*')
        .limit(limit);

      if (error) {
        logger.error('[useTopRafflesMV] Error fetching MV:', error);
        throw error;
      }

      return (data || []) as MVTopRaffle[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
