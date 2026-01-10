import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Customer {
  id: string;
  organization_id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  city: string | null;
  total_orders: number;
  total_tickets: number;
  total_spent: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerStats {
  total: number;
  withEmail: number;
  withPhone: number;
  totalRevenue: number;
  totalTickets: number;
}

/**
 * Hook to fetch all customers for an organization from the permanent customers table.
 * This data persists even after orders are archived (90+ days old).
 */
export function useCustomers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      if (!organizationId) return { customers: [], stats: emptyStats };

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("total_spent", { ascending: false });

      if (error) throw error;

      const customers = (data || []) as Customer[];

      // Calculate stats
      const stats: CustomerStats = {
        total: customers.length,
        withEmail: customers.filter((c) => c.email).length,
        withPhone: customers.filter((c) => c.phone).length,
        totalRevenue: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
        totalTickets: customers.reduce((sum, c) => sum + (c.total_tickets || 0), 0),
      };

      return { customers, stats };
    },
    enabled: !!organizationId,
  });
}

const emptyStats: CustomerStats = {
  total: 0,
  withEmail: 0,
  withPhone: 0,
  totalRevenue: 0,
  totalTickets: 0,
};

/**
 * Hook to search customers with filters
 */
export function useCustomerSearch(
  organizationId: string | undefined,
  searchTerm: string
) {
  return useQuery({
    queryKey: ["customers-search", organizationId, searchTerm],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organizationId)
        .order("total_spent", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return (data || []) as Customer[];
    },
    enabled: !!organizationId,
  });
}

/**
 * Get WhatsApp link for a customer
 */
export function getCustomerWhatsAppLink(
  phone: string,
  customerName: string,
  organizationName?: string
): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Hola ${customerName}, gracias por tu preferencia en ${organizationName || "nuestra organización"}`
  );
  return `https://wa.me/${cleanPhone}?text=${message}`;
}

/**
 * Get mailto link for a customer
 */
export function getCustomerMailtoLink(
  email: string,
  subject?: string,
  body?: string
): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${email}${query ? `?${query}` : ""}`;
}
