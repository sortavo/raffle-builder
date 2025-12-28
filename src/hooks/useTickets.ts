import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Ticket = Tables<'tickets'>;

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

  // Get tickets with pagination and filters
  const useTicketsList = (filters?: TicketFilters) => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 100;

    return useQuery({
      queryKey: ['tickets', raffleId, filters],
      queryFn: async () => {
        if (!raffleId) return { tickets: [], count: 0 };

        let query = supabase
          .from('tickets')
          .select('*', { count: 'exact' })
          .eq('raffle_id', raffleId)
          .order('ticket_number', { ascending: true })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status as 'available' | 'reserved' | 'sold' | 'canceled');
        }

        if (filters?.search) {
          query = query.ilike('ticket_number', `%${filters.search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { tickets: data as Ticket[], count: count || 0 };
      },
      enabled: !!raffleId,
    });
  };

  // Get ticket stats using count queries (no 1000 row limit)
  const useTicketStats = () => {
    return useQuery({
      queryKey: ['ticket-stats', raffleId],
      queryFn: async (): Promise<TicketStats> => {
        if (!raffleId) {
          return { available: 0, reserved: 0, sold: 0, canceled: 0, total: 0 };
        }

        // Use parallel count queries to avoid the 1000 row limit
        const [availableRes, reservedRes, soldRes, canceledRes, totalRes] = await Promise.all([
          supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('raffle_id', raffleId)
            .eq('status', 'available'),
          supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('raffle_id', raffleId)
            .eq('status', 'reserved'),
          supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('raffle_id', raffleId)
            .eq('status', 'sold'),
          supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('raffle_id', raffleId)
            .eq('status', 'canceled'),
          supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('raffle_id', raffleId),
        ]);

        return {
          available: availableRes.count || 0,
          reserved: reservedRes.count || 0,
          sold: soldRes.count || 0,
          canceled: canceledRes.count || 0,
          total: totalRes.count || 0,
        };
      },
      enabled: !!raffleId,
    });
  };

  // Approve ticket and send notification email
  const approveTicket = useMutation({
    mutationFn: async ({ ticketId, raffleTitle, raffleSlug }: { ticketId: string; raffleTitle?: string; raffleSlug?: string }) => {
      const { data, error } = await supabase
        .from('tickets')
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
        supabase.functions.invoke('send-email', {
          body: {
            to: data.buyer_email,
            template: 'approved_bulk',
            data: {
              buyer_name: data.buyer_name || 'Participante',
              ticket_numbers: [data.ticket_number],
              raffle_title: raffleTitle,
              reference_code: data.payment_reference,
              raffle_url: `${baseUrl}/r/${raffleSlug}`,
              my_tickets_url: `${baseUrl}/my-tickets`,
            },
          },
        }).catch(console.error);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      toast({ title: 'Boleto aprobado', description: 'Se envió email de confirmación al comprador' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Reject ticket (return to available)
  const rejectTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'available',
          buyer_id: null,
          buyer_name: null,
          buyer_email: null,
          buyer_phone: null,
          buyer_city: null,
          payment_proof_url: null,
          payment_reference: null,
          payment_method: null,
          reserved_at: null,
          reserved_until: null,
          canceled_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      toast({ title: 'Boleto rechazado y liberado' });
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
        .from('tickets')
        .update({ reserved_until: newExpiry.toISOString() })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      toast({ title: 'Reservación extendida' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Bulk approve tickets and send notification email
  const bulkApprove = useMutation({
    mutationFn: async ({ ticketIds, raffleTitle, raffleSlug }: { ticketIds: string[]; raffleTitle?: string; raffleSlug?: string }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'sold',
          approved_at: new Date().toISOString(),
          sold_at: new Date().toISOString(),
        })
        .in('id', ticketIds)
        .select();

      if (error) throw error;
      
      // Group tickets by buyer email and send notifications
      if (data && raffleTitle) {
        const baseUrl = window.location.origin;
        const ticketsByEmail = data.reduce((acc, ticket) => {
          if (ticket.buyer_email) {
            if (!acc[ticket.buyer_email]) {
              acc[ticket.buyer_email] = {
                buyer_name: ticket.buyer_name,
                ticket_numbers: [],
                reference_code: ticket.payment_reference,
              };
            }
            acc[ticket.buyer_email].ticket_numbers.push(ticket.ticket_number);
          }
          return acc;
        }, {} as Record<string, { buyer_name: string | null; ticket_numbers: string[]; reference_code: string | null }>);
        
        // Send email to each buyer (non-blocking)
        Object.entries(ticketsByEmail).forEach(([email, info]) => {
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
        });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      toast({ title: `${data?.length} boletos aprobados`, description: 'Se enviaron emails de confirmación' });
    },
  });

  // Approve all tickets by reference code and send notification email
  const approveByReference = useMutation({
    mutationFn: async ({ referenceCode, raffleTitle, raffleSlug }: { referenceCode: string; raffleTitle?: string; raffleSlug?: string }) => {
      if (!raffleId) throw new Error('Raffle ID required');
      
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'sold',
          approved_at: new Date().toISOString(),
          sold_at: new Date().toISOString(),
        })
        .eq('raffle_id', raffleId)
        .eq('payment_reference', referenceCode)
        .eq('status', 'reserved')
        .select();

      if (error) throw error;
      
      // Send notification email (non-blocking)
      if (data && data.length > 0 && data[0].buyer_email && raffleTitle) {
        const baseUrl = window.location.origin;
        supabase.functions.invoke('send-email', {
          body: {
            to: data[0].buyer_email,
            template: 'approved_bulk',
            data: {
              buyer_name: data[0].buyer_name || 'Participante',
              ticket_numbers: data.map(t => t.ticket_number),
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
      toast({ title: `${data?.length} boletos aprobados`, description: 'Se envió email de confirmación al comprador' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Bulk reject tickets
  const bulkReject = useMutation({
    mutationFn: async (ticketIds: string[]) => {
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'available',
          buyer_id: null,
          buyer_name: null,
          buyer_email: null,
          buyer_phone: null,
          buyer_city: null,
          payment_proof_url: null,
          payment_reference: null,
          payment_method: null,
          reserved_at: null,
          reserved_until: null,
          canceled_at: new Date().toISOString(),
        })
        .in('id', ticketIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      toast({ title: `${data?.length} boletos rechazados` });
    },
  });

  return {
    useTicketsList,
    useTicketStats,
    approveTicket,
    rejectTicket,
    extendReservation,
    bulkApprove,
    bulkReject,
    approveByReference,
  };
};
