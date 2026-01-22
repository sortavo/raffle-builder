import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  approvedAt: string | null;
  paymentProofUploadedAt: string | null;
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

export interface BuyersSummaryStats {
  totalBuyers: number;
  totalRevenue: number;
  pendingCount: number;
  confirmedCount: number;
  avgPerBuyer: number;
}

// Phase 7: Memory safeguards for exports
const MAX_EXPORT_PAGES = 100; // Safety: 100 × 1000 = 100k max records
const MAX_MEMORY_BYTES = 50 * 1024 * 1024; // 50MB limit

export const useBuyers = (raffleId: string | undefined) => {
  // Get summary stats (global, not paginated)
  const useSummaryStats = () => {
    return useQuery({
      queryKey: ['buyers-summary-stats', raffleId],
      queryFn: async (): Promise<BuyersSummaryStats> => {
        if (!raffleId) return { totalBuyers: 0, totalRevenue: 0, pendingCount: 0, confirmedCount: 0, avgPerBuyer: 0 };

        const { data, error } = await supabase.rpc('get_buyers_summary_stats' as any, {
          p_raffle_id: raffleId,
        });

        if (error) throw error;

        const row = (data as any)?.[0];
        return {
          totalBuyers: Number(row?.total_buyers || 0),
          totalRevenue: Number(row?.total_revenue || 0),
          pendingCount: Number(row?.pending_count || 0),
          confirmedCount: Number(row?.confirmed_count || 0),
          avgPerBuyer: Number(row?.avg_per_buyer || 0),
        };
      },
      enabled: !!raffleId,
    });
  };

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
          p_page: page,
          p_page_size: pageSize,
          p_search: filters?.search || null,
          p_status_filter: filters?.status === 'all' ? null : filters?.status || null,
        });

        if (error) throw error;

        // Transform the database response to Buyer interface
        const buyers: Buyer[] = (data || []).map((row: any, index: number) => ({
          id: row.order_id || `buyer-${index}`,
          name: row.buyer_name || '',
          email: row.buyer_email || '',
          phone: row.buyer_phone || '',
          city: row.buyer_city || '',
          tickets: row.ticket_numbers || [],
          ticketCount: Number(row.ticket_count) || 0,
          status: row.status || 'reserved',
          date: row.reserved_at || '',
          orderTotal: row.total_amount ? Number(row.total_amount) : null,
          paymentMethod: row.payment_method || null,
          paymentReference: row.reference_code || null,
          hasPaymentProof: !!row.payment_proof_url,
          soldAt: row.sold_at || null,
          approvedAt: row.approved_at || null,
          paymentProofUploadedAt: row.payment_proof_uploaded_at || null,
        }));

        // Get total count separately
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('raffle_id', raffleId)
          .not('buyer_name', 'is', null);

        return { buyers, count: count || 0 };
      },
      enabled: !!raffleId,
    });
  };

  // Get unique cities for filter - uses orders table
  const useCities = () => {
    return useQuery({
      queryKey: ['buyer-cities', raffleId],
      queryFn: async () => {
        if (!raffleId) return [];

        const { data, error } = await supabase
          .from('orders')
          .select('buyer_city')
          .eq('raffle_id', raffleId)
          .not('buyer_city', 'is', null);

        if (error) throw error;

        const cities = [...new Set(data?.map(o => o.buyer_city).filter(Boolean))];
        return cities as string[];
      },
      enabled: !!raffleId,
    });
  };

  // Export buyers to CSV - uses server-side pagination with memory safeguards
  const exportBuyers = async () => {
    if (!raffleId) return '';

    // Fetch all buyers using the paginated function but with large page size
    const allBuyers: Buyer[] = [];
    let page = 1;
    const pageSize = 1000;
    let hasMore = true;
    let memoryLimitReached = false;
    let pageLimitReached = false;

    while (hasMore && page <= MAX_EXPORT_PAGES) {
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

      if (error) {
        console.error('[exportBuyers] Error fetching page:', page, error);
        break;
      }

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
          approvedAt: row.approved_at || null,
          paymentProofUploadedAt: row.payment_proof_uploaded_at || null,
        }));

        allBuyers.push(...buyers);
        
        // Memory check - estimate size of accumulated data
        const estimatedSize = JSON.stringify(allBuyers).length;
        if (estimatedSize > MAX_MEMORY_BYTES) {
          console.warn(`[exportBuyers] Export truncated at ${allBuyers.length} records (memory limit: ${MAX_MEMORY_BYTES} bytes)`);
          memoryLimitReached = true;
          hasMore = false;
        } else if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // Check if we hit the page limit
    if (page > MAX_EXPORT_PAGES) {
      pageLimitReached = true;
    }

    // Show warnings for truncated exports
    if (memoryLimitReached) {
      toast.warning(`Export parcial: límite de memoria alcanzado (${allBuyers.length} registros)`);
    } else if (pageLimitReached) {
      toast.warning(`Export limitado a ${MAX_EXPORT_PAGES * pageSize} registros`);
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
    useSummaryStats,
    exportBuyers,
    getWhatsAppLink,
    getMailtoLink,
  };
};

// Cursor-based pagination hook for infinite scroll (O(log n) performance)
interface BuyersCursorResult {
  buyers: Buyer[];
  hasMore: boolean;
  nextCursor: { id: string; createdAt: string } | null;
}

export function useBuyersCursor(
  raffleId: string | undefined,
  options?: {
    status?: string;
    search?: string;
    limit?: number;
  }
) {
  const [cursor, setCursor] = useState<{ id: string; createdAt: string } | null>(null);
  const [allBuyers, setAllBuyers] = useState<Buyer[]>([]);

  // Reset when filters change
  useEffect(() => {
    setCursor(null);
    setAllBuyers([]);
  }, [raffleId, options?.status, options?.search]);

  const query = useQuery({
    queryKey: ['buyers-cursor', raffleId, options?.status, options?.search, cursor?.id],
    queryFn: async (): Promise<BuyersCursorResult> => {
      if (!raffleId) return { buyers: [], hasMore: false, nextCursor: null };

      const { data, error } = await supabase.rpc('get_buyers_cursor' as any, {
        p_raffle_id: raffleId,
        p_status: options?.status === 'all' ? null : options?.status || null,
        p_search: options?.search || null,
        p_limit: options?.limit || 50,
        p_cursor_id: cursor?.id || null,
        p_cursor_created_at: cursor?.createdAt || null,
      });

      if (error) throw error;

      const rawData = (data || []) as any[];
      const hasMore = rawData.length > 0 && rawData[0].has_more;
      
      const buyers: Buyer[] = rawData.map((row: any) => ({
        id: row.id,
        name: row.buyer_name || '',
        email: row.buyer_email || '',
        phone: row.buyer_phone || '',
        city: row.buyer_city || '',
        tickets: [],
        ticketCount: Number(row.ticket_count) || 0,
        status: row.status || 'reserved',
        date: row.created_at || '',
        orderTotal: row.order_total ? Number(row.order_total) : null,
        paymentMethod: row.payment_method || null,
        paymentReference: row.reference_code || null,
        hasPaymentProof: !!row.payment_proof_url,
        soldAt: row.sold_at || null,
        approvedAt: row.approved_at || null,
        paymentProofUploadedAt: row.payment_proof_uploaded_at || null,
      }));

      const lastBuyer = buyers[buyers.length - 1];
      const nextCursor = hasMore && lastBuyer
        ? { id: lastBuyer.id, createdAt: lastBuyer.date }
        : null;

      return { buyers, hasMore, nextCursor };
    },
    enabled: !!raffleId,
  });

  // Accumulate buyers for infinite scroll
  useEffect(() => {
    if (query.data?.buyers) {
      if (cursor === null) {
        setAllBuyers(query.data.buyers);
      } else {
        setAllBuyers(prev => [...prev, ...query.data.buyers]);
      }
    }
  }, [query.data, cursor]);

  const loadMore = useCallback(() => {
    if (query.data?.nextCursor) {
      setCursor(query.data.nextCursor);
    }
  }, [query.data?.nextCursor]);

  const reset = useCallback(() => {
    setCursor(null);
    setAllBuyers([]);
  }, []);

  return {
    buyers: allBuyers,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasMore: query.data?.hasMore ?? false,
    loadMore,
    reset,
    refetch: query.refetch,
  };
}
