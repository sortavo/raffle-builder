import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Ticket = Tables<'tickets'>;

export interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tickets: string[];
  status: string;
  date: string;
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
  // Get buyers with pagination and filters
  const useBuyersList = (filters?: BuyerFilters) => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;

    return useQuery({
      queryKey: ['buyers', raffleId, filters],
      queryFn: async () => {
        if (!raffleId) return { buyers: [], count: 0 };

        let query = supabase
          .from('tickets')
          .select('*', { count: 'exact' })
          .eq('raffle_id', raffleId)
          .not('buyer_name', 'is', null)
          .order('reserved_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status as 'available' | 'reserved' | 'sold' | 'canceled');
        }

        if (filters?.city) {
          query = query.eq('buyer_city', filters.city);
        }

        if (filters?.search) {
          query = query.or(
            `buyer_name.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%,buyer_phone.ilike.%${filters.search}%`
          );
        }

        if (filters?.startDate) {
          query = query.gte('reserved_at', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
          query = query.lte('reserved_at', filters.endDate.toISOString());
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // Group tickets by buyer
        const buyerMap = new Map<string, Buyer>();
        
        (data as Ticket[])?.forEach(ticket => {
          const key = ticket.buyer_email || ticket.buyer_phone || ticket.buyer_name;
          if (!key) return;

          if (buyerMap.has(key)) {
            const buyer = buyerMap.get(key)!;
            buyer.tickets.push(ticket.ticket_number);
          } else {
            buyerMap.set(key, {
              id: ticket.id,
              name: ticket.buyer_name || '',
              email: ticket.buyer_email || '',
              phone: ticket.buyer_phone || '',
              city: ticket.buyer_city || '',
              tickets: [ticket.ticket_number],
              status: ticket.status || 'reserved',
              date: ticket.reserved_at || ticket.created_at || '',
            });
          }
        });

        const buyers = Array.from(buyerMap.values())
          .slice((page - 1) * pageSize, page * pageSize);

        return { buyers, count: buyerMap.size };
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
          .from('tickets')
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

  // Export buyers to CSV
  const exportBuyers = async () => {
    if (!raffleId) return '';

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .not('buyer_name', 'is', null)
      .in('status', ['sold', 'reserved']);

    if (error) throw error;

    const headers = ['Nombre', 'Email', 'Teléfono', 'Ciudad', 'Boleto', 'Estado', 'Fecha'];
    const rows = (data as Ticket[]).map(t => [
      t.buyer_name || '',
      t.buyer_email || '',
      t.buyer_phone || '',
      t.buyer_city || '',
      t.ticket_number,
      t.status || '',
      t.reserved_at ? new Date(t.reserved_at).toLocaleDateString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
