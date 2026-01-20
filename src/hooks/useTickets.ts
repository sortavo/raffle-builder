import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TicketFilters {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TicketStats {
  available: number;
  reserved: number;
  sold: number;
  canceled: number;
  total: number;
}

export const useTickets = (raffleId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get virtual tickets with pagination for display grid
  const useVirtualTicketsList = (filters?: TicketFilters) => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 100;

    return useQuery({
      queryKey: ['virtual-tickets', raffleId, filters],
      queryFn: async () => {
        if (!raffleId) return { tickets: [], count: 0, totalTickets: 0 };

        // First get raffle total_tickets for correct pagination
        const { data: raffle } = await supabase
          .from('raffles')
          .select('total_tickets, numbering_config')
          .eq('id', raffleId)
          .single();

        const totalTickets = raffle?.total_tickets || 0;
        const numberStart = (raffle?.numbering_config as any)?.start ?? 1;
        const padding = String(totalTickets + numberStart - 1).length;

        // Calculate range for current page
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize - 1, totalTickets - 1);

        // Use virtual tickets RPC
        const { data: virtualTickets, error } = await supabase.rpc('get_virtual_tickets_by_range', {
          p_raffle_id: raffleId,
          p_start_index: startIndex,
          p_end_index: endIndex,
        });

        if (error) throw error;

        // Map virtual tickets to display format - use ticket_number from RPC (already formatted with padding)
        let tickets = (virtualTickets || []).map((t: any) => ({
          id: t.order_id || `virtual-${t.ticket_index}`,
          ticket_number: t.ticket_number, // RPC now returns correctly formatted number
          ticket_index: t.ticket_index,
          status: t.status || 'available',
          buyer_name: t.buyer_name,
          buyer_email: t.buyer_email,
          buyer_phone: t.buyer_phone,
          buyer_city: t.buyer_city,
          order_id: t.order_id,
          reference_code: t.reference_code,
          reserved_until: t.reserved_until,
          payment_proof_url: t.payment_proof_url,
        }));

        // Apply status filter client-side (RPC returns all statuses)
        if (filters?.status && filters.status !== 'all') {
          tickets = tickets.filter((t: any) => t.status === filters.status);
        }

        // Apply search filter for ticket number
        if (filters?.search) {
          const searchNum = filters.search.replace(/^0+/, ''); // Remove leading zeros
          tickets = tickets.filter((t: any) => 
            t.ticket_number.includes(filters.search!) || 
            t.ticket_number.replace(/^0+/, '') === searchNum
          );
        }

        return { 
          tickets, 
          count: filters?.status || filters?.search ? tickets.length : totalTickets,
          totalTickets 
        };
      },
      enabled: !!raffleId,
    });
  };

  // Get orders with pagination and filters - for approvals tab
  const useTicketsList = (filters?: TicketFilters) => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 100;

    return useQuery({
      queryKey: ['tickets', raffleId, filters],
      queryFn: async () => {
        if (!raffleId) return { tickets: [], count: 0 };

        // Query orders table directly
        let query = supabase
          .from('orders')
          .select('*', { count: 'exact' })
          .eq('raffle_id', raffleId)
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        if (filters?.search) {
          // Search in reference_code or buyer info
          query = query.or(`reference_code.ilike.%${filters.search}%,buyer_name.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { tickets: data || [], count: count || 0 };
      },
      enabled: !!raffleId,
    });
  };

  // Get ticket stats using virtual tickets RPC
  const useTicketStats = () => {
    return useQuery({
      queryKey: ['ticket-stats', raffleId],
      queryFn: async (): Promise<TicketStats> => {
        if (!raffleId) {
          return { available: 0, reserved: 0, sold: 0, canceled: 0, total: 0 };
        }

        // Use virtual ticket counts RPC
        const [countsRes, canceledRes] = await Promise.all([
          supabase.rpc('get_virtual_ticket_counts', { p_raffle_id: raffleId }),
          supabase
            .from('orders')
            .select('ticket_count')
            .eq('raffle_id', raffleId)
            .eq('status', 'canceled'),
        ]);

        if (countsRes.error) throw countsRes.error;
        
        const counts = countsRes.data?.[0];
        const canceledCount = canceledRes.data?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;

        return {
          available: counts?.available_count || 0,
          reserved: counts?.reserved_count || 0,
          sold: counts?.sold_count || 0,
          canceled: canceledCount,
          total: counts?.total_count || 0,
        };
      },
      enabled: !!raffleId,
    });
  };

  // Approve order and send notification email + Telegram
  const approveTicket = useMutation({
    mutationFn: async ({ ticketId, raffleTitle, raffleSlug, organizationId }: { ticketId: string; raffleTitle?: string; raffleSlug?: string; organizationId?: string }) => {
      // ticketId here is actually the order ID
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'sold',
          approved_at: new Date().toISOString(),
          sold_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      
      // Send notification email (non-blocking)
      if (data?.buyer_email && raffleTitle) {
        const baseUrl = window.location.origin;
        
        // Generate ticket numbers from ranges
        const ticketNumbers = expandOrderToTicketNumbers(data.ticket_ranges, data.lucky_indices);
        
        supabase.functions.invoke('send-email', {
          body: {
            to: data.buyer_email,
            template: 'approved_bulk',
            data: {
              buyer_name: data.buyer_name || 'Participante',
              ticket_numbers: ticketNumbers,
              raffle_title: raffleTitle,
              reference_code: data.reference_code,
              raffle_url: `${baseUrl}/r/${raffleSlug}`,
              my_tickets_url: `${baseUrl}/my-tickets`,
            },
          },
        }).catch(console.error);

        // Send Telegram notification to buyer (non-blocking)
        supabase.functions.invoke('telegram-notify', {
          body: {
            type: 'buyer_payment_approved',
            buyerEmail: data.buyer_email,
            data: {
              raffleName: raffleTitle,
              ticketNumbers,
            },
          },
        }).catch(console.error);

        // Notify organizer via Telegram (non-blocking)
        if (organizationId) {
          supabase.functions.invoke('telegram-notify', {
            body: {
              type: 'payment_approved',
              organizationId,
              data: {
                buyerName: data.buyer_name,
                ticketNumbers,
              },
            },
          }).catch(console.error);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['orders', raffleId] });
      toast({ title: 'Orden aprobada', description: 'Se envió email de confirmación al comprador' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Reject order (delete from orders, tickets become available again)
  const rejectTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      // Simply delete the order - tickets become available again in virtual model
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['orders', raffleId] });
      toast({ title: 'Orden rechazada y boletos liberados' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Extend reservation
  const extendReservation = useMutation({
    mutationFn: async ({ ticketId, minutes }: { ticketId: string; minutes: number }) => {
      const newExpiry = new Date();
      newExpiry.setMinutes(newExpiry.getMinutes() + minutes);

      const { data, error } = await supabase
        .from('orders')
        .update({ reserved_until: newExpiry.toISOString() })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['orders', raffleId] });
      toast({ title: 'Reservación extendida' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Bulk approve orders
  const bulkApprove = useMutation({
    mutationFn: async ({ ticketIds, raffleTitle, raffleSlug, organizationId }: { ticketIds: string[]; raffleTitle?: string; raffleSlug?: string; organizationId?: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'sold',
          approved_at: new Date().toISOString(),
          sold_at: new Date().toISOString(),
        })
        .in('id', ticketIds)
        .select();

      if (error) throw error;
      
      // Group orders by buyer email and send notifications
      if (data && raffleTitle) {
        const baseUrl = window.location.origin;
        const ordersByEmail = data.reduce((acc, order) => {
          if (order.buyer_email) {
            if (!acc[order.buyer_email]) {
              acc[order.buyer_email] = {
                buyer_name: order.buyer_name,
                ticket_numbers: [] as string[],
                reference_code: order.reference_code,
              };
            }
            const ticketNums = expandOrderToTicketNumbers(order.ticket_ranges, order.lucky_indices);
            acc[order.buyer_email].ticket_numbers.push(...ticketNums);
          }
          return acc;
        }, {} as Record<string, { buyer_name: string | null; ticket_numbers: string[]; reference_code: string | null }>);
        
        // Send email and Telegram to each buyer (non-blocking)
        Object.entries(ordersByEmail).forEach(([email, info]) => {
          supabase.functions.invoke('send-email', {
            body: {
              to: email,
              template: 'approved_bulk',
              data: {
                buyer_name: info.buyer_name || 'Participante',
                ticket_numbers: info.ticket_numbers,
                raffle_title: raffleTitle,
                reference_code: info.reference_code,
                raffle_url: `${baseUrl}/r/${raffleSlug}`,
                my_tickets_url: `${baseUrl}/my-tickets`,
              },
            },
          }).catch(console.error);

          supabase.functions.invoke('telegram-notify', {
            body: {
              type: 'buyer_payment_approved',
              buyerEmail: email,
              data: {
                raffleName: raffleTitle,
                ticketNumbers: info.ticket_numbers,
              },
            },
          }).catch(console.error);
        });

        // Notify organizer via Telegram (non-blocking)
        if (organizationId) {
          const allTickets = data.flatMap(o => expandOrderToTicketNumbers(o.ticket_ranges, o.lucky_indices));
          supabase.functions.invoke('telegram-notify', {
            body: {
              type: 'payment_approved',
              organizationId,
              data: {
                buyerName: 'Múltiples compradores',
                ticketNumbers: allTickets,
              },
            },
          }).catch(console.error);
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['orders', raffleId] });
      toast({ title: `${data?.length} órdenes aprobadas`, description: 'Se enviaron emails de confirmación' });
    },
  });

  // Approve all orders by reference code
  const approveByReference = useMutation({
    mutationFn: async ({ referenceCode, raffleTitle, raffleSlug }: { referenceCode: string; raffleTitle?: string; raffleSlug?: string }) => {
      if (!raffleId) throw new Error('Raffle ID required');
      
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'sold',
          approved_at: new Date().toISOString(),
          sold_at: new Date().toISOString(),
        })
        .eq('raffle_id', raffleId)
        .eq('reference_code', referenceCode)
        .eq('status', 'reserved')
        .select();

      if (error) throw error;
      
      // Send notification email (non-blocking)
      if (data && data.length > 0 && data[0].buyer_email && raffleTitle) {
        const baseUrl = window.location.origin;
        const allTickets = data.flatMap(o => expandOrderToTicketNumbers(o.ticket_ranges, o.lucky_indices));
        
        supabase.functions.invoke('send-email', {
          body: {
            to: data[0].buyer_email,
            template: 'approved_bulk',
            data: {
              buyer_name: data[0].buyer_name || 'Participante',
              ticket_numbers: allTickets,
              raffle_title: raffleTitle,
              reference_code: referenceCode,
              raffle_url: `${baseUrl}/r/${raffleSlug}`,
              my_tickets_url: `${baseUrl}/my-tickets`,
            },
          },
        }).catch(console.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['orders', raffleId] });
      toast({ title: `${data?.length} órdenes aprobadas`, description: 'Se envió email de confirmación al comprador' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Bulk reject orders
  const bulkReject = useMutation({
    mutationFn: async (ticketIds: string[]) => {
      // Delete orders to release tickets
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', ticketIds);

      if (error) throw error;
      return { count: ticketIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['orders', raffleId] });
      toast({ title: `${data?.count} órdenes rechazadas` });
    },
  });

  return {
    useTicketsList,
    useVirtualTicketsList,
    useTicketStats,
    approveTicket,
    rejectTicket,
    extendReservation,
    bulkApprove,
    bulkReject,
    approveByReference,
  };
};

// Helper to expand order ranges to ticket numbers (for display/notifications)
function expandOrderToTicketNumbers(ticketRanges: any, luckyIndices?: number[]): string[] {
  const numbers: string[] = [];
  const ranges = ticketRanges as Array<{ s: number; e: number }> || [];
  
  for (const range of ranges) {
    for (let i = range.s; i <= range.e; i++) {
      numbers.push(String(i + 1)); // 0-indexed to 1-indexed
    }
  }
  
  if (luckyIndices) {
    for (const idx of luckyIndices) {
      if (!numbers.includes(String(idx + 1))) {
        numbers.push(String(idx + 1));
      }
    }
  }
  
  return numbers.sort((a, b) => Number(a) - Number(b));
}
