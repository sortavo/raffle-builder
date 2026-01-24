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
}

export interface CustomerStats {
  total: number;
  withEmail: number;
  withPhone: number;
  totalRevenue: number;
  totalTickets: number;
}

/**
 * Hook to fetch aggregated customer data from orders table.
 * Aggregates buyer information to provide customer-level insights.
 */
export function useCustomers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      if (!organizationId) return { customers: [], stats: emptyStats };

      // Fetch orders and aggregate by buyer email/phone
      const { data, error } = await supabase
        .from("orders")
        .select("id, buyer_name, buyer_email, buyer_phone, buyer_city, ticket_count, order_total, created_at, status")
        .eq("organization_id", organizationId)
        .in("status", ["approved", "sold"]);

      if (error) throw error;

      // Aggregate customers by email or phone
      const customerMap = new Map<string, Customer>();

      (data || []).forEach((order) => {
        const key = order.buyer_email || order.buyer_phone || order.buyer_name || order.id;
        
        const existing = customerMap.get(key);
        if (existing) {
          existing.total_orders += 1;
          existing.total_tickets += order.ticket_count || 0;
          existing.total_spent += order.order_total || 0;
          if (!existing.first_purchase_at || order.created_at < existing.first_purchase_at) {
            existing.first_purchase_at = order.created_at;
          }
          if (!existing.last_purchase_at || order.created_at > existing.last_purchase_at) {
            existing.last_purchase_at = order.created_at;
          }
        } else {
          customerMap.set(key, {
            id: key,
            organization_id: organizationId,
            email: order.buyer_email,
            phone: order.buyer_phone,
            full_name: order.buyer_name || "Sin nombre",
            city: order.buyer_city,
            total_orders: 1,
            total_tickets: order.ticket_count || 0,
            total_spent: order.order_total || 0,
            first_purchase_at: order.created_at,
            last_purchase_at: order.created_at,
          });
        }
      });

      const customers = Array.from(customerMap.values()).sort(
        (a, b) => b.total_spent - a.total_spent
      );

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
        .from("orders")
        .select("id, buyer_name, buyer_email, buyer_phone, buyer_city, ticket_count, order_total, created_at")
        .eq("organization_id", organizationId)
        .in("status", ["approved", "sold"]);

      if (searchTerm) {
        query = query.or(
          `buyer_name.ilike.%${searchTerm}%,buyer_email.ilike.%${searchTerm}%,buyer_phone.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;

      // Aggregate by customer
      const customerMap = new Map<string, Customer>();

      (data || []).forEach((order) => {
        const key = order.buyer_email || order.buyer_phone || order.buyer_name || order.id;
        
        const existing = customerMap.get(key);
        if (existing) {
          existing.total_orders += 1;
          existing.total_tickets += order.ticket_count || 0;
          existing.total_spent += order.order_total || 0;
        } else {
          customerMap.set(key, {
            id: key,
            organization_id: organizationId,
            email: order.buyer_email,
            phone: order.buyer_phone,
            full_name: order.buyer_name || "Sin nombre",
            city: order.buyer_city,
            total_orders: 1,
            total_tickets: order.ticket_count || 0,
            total_spent: order.order_total || 0,
            first_purchase_at: order.created_at,
            last_purchase_at: order.created_at,
          });
        }
      });

      return Array.from(customerMap.values())
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 100);
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
