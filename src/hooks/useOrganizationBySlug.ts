import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationRaffle {
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
  winner_announced?: boolean;
  winner_data?: {
    buyer_name?: string;
    ticket_number?: string;
  } | null;
}

interface OrganizationWithRaffles {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  brand_color: string | null;
  email: string;
  phone: string | null;
  description: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp_number: string | null;
  city: string | null;
  cover_image_url: string | null;
  verified: boolean | null;
  created_at: string | null;
  // New array fields for multiple contacts
  emails: string[] | null;
  phones: string[] | null;
  whatsapp_numbers: string[] | null;
  raffles: OrganizationRaffle[];
  completedRaffles: OrganizationRaffle[];
  stats: {
    totalRaffles: number;
    totalTicketsSold: number;
    totalWinners: number;
  };
}

export function useOrganizationBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["organization-by-slug", slug],
    queryFn: async (): Promise<OrganizationWithRaffles | null> => {
      if (!slug) return null;

      // Fetch organization by slug with all new fields including arrays
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select(`
          id, name, slug, logo_url, brand_color, email, phone,
          description, website_url, facebook_url, instagram_url, 
          tiktok_url, whatsapp_number, city, cover_image_url,
          verified, created_at, emails, phones, whatsapp_numbers
        `)
        .eq("slug", slug)
        .single();

      if (orgError || !org) return null;

      // Fetch active raffles for this organization
      const { data: activeRaffles, error: activeError } = await supabase
        .from("raffles")
        .select("id, title, slug, prize_name, prize_images, ticket_price, total_tickets, draw_date, currency_code, status")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .order("draw_date", { ascending: true });

      if (activeError) {
        console.error("Error fetching active raffles:", activeError);
      }

      // Fetch completed raffles for history
      const { data: completedRaffles, error: completedError } = await supabase
        .from("raffles")
        .select("id, title, slug, prize_name, prize_images, ticket_price, total_tickets, draw_date, currency_code, status, winner_announced, winner_data")
        .eq("organization_id", org.id)
        .eq("status", "completed")
        .order("draw_date", { ascending: false })
        .limit(10);

      if (completedError) {
        console.error("Error fetching completed raffles:", completedError);
      }

      // Get ticket counts for active raffles using RPC to bypass RLS
      const activeRafflesWithCounts = await Promise.all(
        (activeRaffles || []).map(async (raffle) => {
          const { data: counts } = await supabase
            .rpc("get_public_ticket_counts", { p_raffle_id: raffle.id });

          const ticketCounts = counts?.[0] || { sold_count: 0, available_count: 0 };

          return {
            ...raffle,
            tickets_sold: ticketCounts.sold_count || 0,
            tickets_available: ticketCounts.available_count || 0,
          };
        })
      );

      // Get ticket counts for completed raffles - use direct query since no RPC for completed
      // For completed raffles, we sum all sold tickets from active raffles already fetched
      const completedRafflesWithCounts = (completedRaffles || []).map((raffle) => ({
        ...raffle,
        tickets_sold: raffle.total_tickets, // Completed raffles show total as sold
        tickets_available: 0,
        winner_data: raffle.winner_data as OrganizationRaffle["winner_data"],
      }));

      // Calculate stats
      const allRafflesCount = (activeRaffles?.length || 0) + (completedRaffles?.length || 0);
      const totalTicketsSold = [...activeRafflesWithCounts, ...completedRafflesWithCounts]
        .reduce((sum, r) => sum + r.tickets_sold, 0);
      const totalWinners = completedRafflesWithCounts.filter(r => r.winner_announced).length;

      return {
        ...org,
        raffles: activeRafflesWithCounts,
        completedRaffles: completedRafflesWithCounts,
        stats: {
          totalRaffles: allRafflesCount,
          totalTicketsSold,
          totalWinners,
        },
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
