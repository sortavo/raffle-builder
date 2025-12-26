import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationWithRaffles {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  brand_color: string | null;
  email: string;
  phone: string | null;
  raffles: {
    id: string;
    title: string;
    slug: string;
    prize_name: string;
    prize_images: string[] | null;
    ticket_price: number;
    total_tickets: number;
    draw_date: string | null;
    currency_code: string | null;
    status: string | null;
    tickets_sold: number;
    tickets_available: number;
  }[];
}

export function useOrganizationBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["organization-by-slug", slug],
    queryFn: async (): Promise<OrganizationWithRaffles | null> => {
      if (!slug) return null;

      // Fetch organization by slug
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url, brand_color, email, phone")
        .eq("slug", slug)
        .single();

      if (orgError || !org) return null;

      // Fetch active raffles for this organization
      const { data: raffles, error: rafflesError } = await supabase
        .from("raffles")
        .select("id, title, slug, prize_name, prize_images, ticket_price, total_tickets, draw_date, currency_code, status")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .order("draw_date", { ascending: true });

      if (rafflesError) {
        console.error("Error fetching raffles:", rafflesError);
        return { ...org, raffles: [] };
      }

      // Get ticket counts for each raffle
      const rafflesWithCounts = await Promise.all(
        (raffles || []).map(async (raffle) => {
          const { count: soldCount } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("raffle_id", raffle.id)
            .eq("status", "sold");

          const { count: availableCount } = await supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("raffle_id", raffle.id)
            .eq("status", "available");

          return {
            ...raffle,
            tickets_sold: soldCount || 0,
            tickets_available: availableCount || 0,
          };
        })
      );

      return {
        ...org,
        raffles: rafflesWithCounts,
      };
    },
    enabled: !!slug,
  });
}

export function useRaffleByOrgAndSlug(orgSlug: string | undefined, raffleSlug: string | undefined) {
  return useQuery({
    queryKey: ["raffle-by-org-slug", orgSlug, raffleSlug],
    queryFn: async () => {
      if (!orgSlug || !raffleSlug) return null;

      // First get the organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url, brand_color")
        .eq("slug", orgSlug)
        .single();

      if (orgError || !org) return null;

      // Then get the raffle by slug within this organization
      const { data: raffle, error: raffleError } = await supabase
        .from("raffles")
        .select("*")
        .eq("organization_id", org.id)
        .eq("slug", raffleSlug)
        .eq("status", "active")
        .single();

      if (raffleError || !raffle) return null;

      return { organization: org, raffle };
    },
    enabled: !!orgSlug && !!raffleSlug,
  });
}
