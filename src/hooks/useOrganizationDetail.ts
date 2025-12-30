import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationUser {
  user_id: string;
  role: "owner" | "admin" | "member";
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string | null;
  } | null;
}

interface OrganizationRaffle {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  total_tickets: number;
  ticket_price: number;
  created_at: string | null;
  draw_date: string | null;
}

interface TicketStats {
  total: number;
  sold: number;
  reserved: number;
  available: number;
  revenue: number;
}

export function useOrganizationDetail(orgId: string | undefined) {
  // Organization basic info
  const organizationQuery = useQuery({
    queryKey: ["admin-organization-detail", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("Organization ID is required");
      
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Organization users with roles
  const usersQuery = useQuery({
    queryKey: ["admin-organization-users", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("Organization ID is required");

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", orgId);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      // Get profiles for these users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge roles with profiles
      const usersWithRoles: OrganizationUser[] = roles.map(role => ({
        user_id: role.user_id,
        role: role.role,
        profile: profiles?.find(p => p.id === role.user_id) || null,
      }));

      return usersWithRoles;
    },
    enabled: !!orgId,
  });

  // Organization raffles
  const rafflesQuery = useQuery({
    queryKey: ["admin-organization-raffles", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("Organization ID is required");

      const { data, error } = await supabase
        .from("raffles")
        .select("id, title, slug, status, total_tickets, ticket_price, created_at, draw_date")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrganizationRaffle[];
    },
    enabled: !!orgId,
  });

  // Ticket statistics (aggregate)
  const statsQuery = useQuery({
    queryKey: ["admin-organization-stats", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("Organization ID is required");

      // Get all raffle IDs for this organization
      const { data: raffles, error: rafflesError } = await supabase
        .from("raffles")
        .select("id")
        .eq("organization_id", orgId);

      if (rafflesError) throw rafflesError;
      if (!raffles || raffles.length === 0) {
        return { total: 0, sold: 0, reserved: 0, available: 0, revenue: 0 };
      }

      const raffleIds = raffles.map(r => r.id);

      // Get ticket counts by status
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("status, order_total")
        .in("raffle_id", raffleIds);

      if (ticketsError) throw ticketsError;

      const stats: TicketStats = {
        total: tickets?.length || 0,
        sold: 0,
        reserved: 0,
        available: 0,
        revenue: 0,
      };

      const processedReferences = new Set<string>();

      tickets?.forEach(ticket => {
        switch (ticket.status) {
          case "sold":
            stats.sold++;
            // Only count revenue once per order
            if (ticket.order_total) {
              stats.revenue += Number(ticket.order_total);
            }
            break;
          case "reserved":
            stats.reserved++;
            break;
          case "available":
            stats.available++;
            break;
        }
      });

      return stats;
    },
    enabled: !!orgId,
  });

  return {
    organization: organizationQuery.data,
    users: usersQuery.data || [],
    raffles: rafflesQuery.data || [],
    stats: statsQuery.data,
    isLoading: organizationQuery.isLoading || usersQuery.isLoading || rafflesQuery.isLoading || statsQuery.isLoading,
    isError: organizationQuery.isError || usersQuery.isError || rafflesQuery.isError || statsQuery.isError,
    refetch: () => {
      organizationQuery.refetch();
      usersQuery.refetch();
      rafflesQuery.refetch();
      statsQuery.refetch();
    },
  };
}
