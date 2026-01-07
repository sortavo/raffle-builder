import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tickets: string[];
  ticketCount: number;
  status: string;
  date: string;
  orderTotal: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  hasPaymentProof: boolean;
  soldAt: string | null;
}

export interface BuyerFilters {
  status?: string;
  city?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export const useBuyers = (raffleId: string | undefined) => {
  // Get buyers with server-side pagination using the database function
  const useBuyersList = (filters?: BuyerFilters) => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;

    return useQuery({
      queryKey: ['buyers', raffleId, filters],
      queryFn: async () => {
        if (!raffleId) return { buyers: [], count: 0 };

        const { data, error } = await supabase.rpc('get_buyers_paginated', {
          p_raffle_id: raffleId,
          p_status: filters?.status || null,
          p_city: filters?.city || null,
          p_search: filters?.search || null,
          p_start_date: filters?.startDate?.toISOString() || null,
          p_end_date: filters?.endDate?.toISOString() || null,
          p_page: page,
          p_page_size: pageSize,
        });

        if (error) throw error;

        // Transform the database response to Buyer interface
        const buyers: Buyer[] = (data || []).map((row: any, index: number) => ({
          id: `${row.buyer_key}-${index}`,
          name: row.buyer_name || '',
          email: row.buyer_email || '',
          phone: row.buyer_phone || '',
          city: row.buyer_city || '',
          tickets: row.ticket_numbers || [],
          ticketCount: Number(row.ticket_count) || 0,
          status: row.status || 'reserved',
          date: row.first_reserved_at || '',
          orderTotal: row.order_total ? Number(row.order_total) : null,
          paymentMethod: row.payment_method || null,
          paymentReference: row.payment_reference || null,
          hasPaymentProof: row.has_payment_proof || false,
          soldAt: row.sold_at || null,
        }));

        // Get total count from first row (all rows have the same total_count)
        const count = data && data.length > 0 ? Number(data[0].total_count) : 0;

        return { buyers, count };
      },
      enabled: !!raffleId,
    });
  };

  // Get unique cities for filter
  const useCities = () => {
    return useQuery({
      queryKey: ['buyer-cities', raffleId],
      queryFn: async () => {
        if (!raffleId) return [];

        const { data, error } = await supabase
          .from('sold_tickets')
          .select('buyer_city')
          .eq('raffle_id', raffleId)
          .not('buyer_city', 'is', null);

        if (error) throw error;

        const cities = [...new Set(data?.map(t => t.buyer_city).filter(Boolean))];
        return cities as string[];
      },
      enabled: !!raffleId,
    });
  };

  // Export buyers to CSV - uses server-side pagination for large datasets
  const exportBuyers = async () => {
    if (!raffleId) return '';

    // Fetch all buyers using the paginated function but with large page size
    const allBuyers: Buyer[] = [];
    let page = 1;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.rpc('get_buyers_paginated', {
        p_raffle_id: raffleId,
        p_status: null,
        p_city: null,
        p_search: null,
        p_start_date: null,
        p_end_date: null,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        const buyers = data.map((row: any, index: number) => ({
          id: `${row.buyer_key}-${index}`,
          name: row.buyer_name || '',
          email: row.buyer_email || '',
          phone: row.buyer_phone || '',
          city: row.buyer_city || '',
          tickets: row.ticket_numbers || [],
          ticketCount: Number(row.ticket_count) || 0,
          status: row.status || 'reserved',
          date: row.first_reserved_at || '',
          orderTotal: row.order_total ? Number(row.order_total) : null,
          paymentMethod: row.payment_method || null,
          paymentReference: row.payment_reference || null,
          hasPaymentProof: row.has_payment_proof || false,
          soldAt: row.sold_at || null,
        }));

        allBuyers.push(...buyers);
        
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Boletos', 'Cantidad', 'Estado', 'Fecha'];
    const rows = allBuyers.map(buyer => [
      buyer.name,
      buyer.email,
      buyer.phone,
      buyer.city,
      buyer.tickets.join('; '),
      buyer.ticketCount.toString(),
      buyer.status,
      buyer.date ? new Date(buyer.date).toLocaleDateString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    return csv;
  };

  // Generate WhatsApp link
  const getWhatsAppLink = (phone: string, message?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = message ? encodeURIComponent(message) : '';
    return `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
  };

  // Generate mailto link
  const getMailtoLink = (email: string, subject?: string, body?: string) => {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);
    const query = params.toString();
    return `mailto:${email}${query ? `?${query}` : ''}`;
  };

  return {
    useBuyersList,
    useCities,
    exportBuyers,
    getWhatsAppLink,
    getMailtoLink,
  };
};
