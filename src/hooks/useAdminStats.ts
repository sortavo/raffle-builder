import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";

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

export function useAdminOverviewStats(dateRange: DateRange | undefined) {
  return useQuery({
    queryKey: ["admin-overview-stats", dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<AdminOverviewStats> => {
      const fromDate = dateRange?.from?.toISOString() || new Date(0).toISOString();
      const toDate = dateRange?.to?.toISOString() || new Date().toISOString();

      const [
        { count: totalOrgs },
        { count: totalUsers },
        { count: totalRaffles },
        { count: activeRaffles },
        { count: totalTicketsSold },
        { count: newOrgsInPeriod },
        { count: newUsersInPeriod },
        { count: newRafflesInPeriod },
        { count: ticketsSoldInPeriod },
        { data: subscriptionData },
      ] = await Promise.all([
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("raffles").select("*", { count: "exact", head: true }),
        supabase.from("raffles").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("sold_tickets").select("*", { count: "exact", head: true }).eq("status", "sold"),
        supabase.from("organizations").select("*", { count: "exact", head: true }).gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("raffles").select("*", { count: "exact", head: true }).gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("sold_tickets").select("*", { count: "exact", head: true }).eq("status", "sold").gte("sold_at", fromDate).lte("sold_at", toDate),
        supabase.from("organizations").select("subscription_tier, subscription_status"),
      ]);

      const subscriptionStats = { basic: 0, pro: 0, premium: 0, trial: 0, active: 0 };
      subscriptionData?.forEach((org) => {
        if (org.subscription_tier) {
          subscriptionStats[org.subscription_tier as keyof typeof subscriptionStats]++;
        }
        if (org.subscription_status === "trial") {
          subscriptionStats.trial++;
        } else if (org.subscription_status === "active") {
          subscriptionStats.active++;
        }
      });

      return {
        totalOrgs: totalOrgs || 0,
        totalUsers: totalUsers || 0,
        totalRaffles: totalRaffles || 0,
        activeRaffles: activeRaffles || 0,
        totalTicketsSold: totalTicketsSold || 0,
        newOrgsInPeriod: newOrgsInPeriod || 0,
        newUsersInPeriod: newUsersInPeriod || 0,
        newRafflesInPeriod: newRafflesInPeriod || 0,
        ticketsSoldInPeriod: ticketsSoldInPeriod || 0,
        subscriptionStats,
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
      const trialOrgs = orgs?.filter(o => o.subscription_status === "trial").length || 0;

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

      const [
        { count: activeRaffles },
        { count: completedRaffles },
        { count: ticketsSold },
        { count: ticketsReserved },
        { count: pendingApprovals },
        { data: recentEvents },
        { data: rafflesData },
      ] = await Promise.all([
        supabase.from("raffles").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("raffles").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("sold_tickets").select("*", { count: "exact", head: true }).eq("status", "sold").gte("sold_at", fromDate).lte("sold_at", toDate),
        supabase.from("sold_tickets").select("*", { count: "exact", head: true }).eq("status", "reserved"),
        supabase.from("sold_tickets").select("*", { count: "exact", head: true }).eq("status", "reserved").not("buyer_name", "is", null),
        supabase.from("analytics_events").select("id, event_type, metadata, created_at").gte("created_at", fromDate).lte("created_at", toDate).order("created_at", { ascending: false }).limit(20),
        supabase.from("raffles").select(`
          id, title, total_tickets, organization_id,
          organizations:organization_id (name)
        `).eq("status", "active").limit(10),
      ]);

      // Get ticket counts for each raffle
      const topRaffles: AdminActivityStats["topRaffles"] = [];
      if (rafflesData) {
        for (const raffle of rafflesData) {
          const { count } = await supabase
            .from("sold_tickets")
            .select("*", { count: "exact", head: true })
            .eq("raffle_id", raffle.id)
            .eq("status", "sold");

          topRaffles.push({
            id: raffle.id,
            title: raffle.title,
            organization_name: (raffle.organizations as any)?.name || "Sin organización",
            tickets_sold: count || 0,
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
