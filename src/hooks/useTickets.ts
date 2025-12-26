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

  // Approve ticket
  const approveTicket = useMutation({
    mutationFn: async (ticketId: string) => {
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      toast({ title: 'Boleto aprobado' });
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

  // Bulk approve tickets
  const bulkApprove = useMutation({
    mutationFn: async (ticketIds: string[]) => {
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
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      toast({ title: `${data?.length} boletos aprobados` });
    },
  });

  // Approve all tickets by reference code
  const approveByReference = useMutation({
    mutationFn: async (referenceCode: string) => {
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
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-stats', raffleId] });
      toast({ title: `${data?.length} boletos aprobados por código de referencia` });
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
