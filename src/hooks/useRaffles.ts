import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generateUniqueSlug } from '@/lib/raffle-utils';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Raffle = Tables<'raffles'>;
type RaffleInsert = TablesInsert<'raffles'>;
type RaffleUpdate = TablesUpdate<'raffles'>;

export interface RaffleWithStats extends Raffle {
  tickets_sold: number;
  tickets_available: number;
  tickets_reserved: number;
  total_revenue: number;
}

export interface RaffleFilters {
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'created_at' | 'title' | 'draw_date' | 'total_tickets';
  sortOrder?: 'asc' | 'desc';
}

export const useRaffles = () => {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all raffles for the organization
  const useRafflesList = (filters?: RaffleFilters) => {
    return useQuery({
      queryKey: ['raffles', organization?.id, filters],
      queryFn: async () => {
        if (!organization?.id) return [];

        let query = supabase
          .from('raffles')
          .select('*')
          .eq('organization_id', organization.id)
          .order(filters?.sortBy || 'created_at', { ascending: filters?.sortOrder === 'asc' });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status as 'draft' | 'active' | 'paused' | 'completed' | 'canceled');
        }

        if (filters?.search) {
          query = query.ilike('title', `%${filters.search}%`);
        }

        if (filters?.startDate) {
          query = query.gte('start_date', filters.startDate.toISOString());
        }

        if (filters?.endDate) {
          query = query.lte('draw_date', filters.endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as Raffle[];
      },
      enabled: !!organization?.id,
    });
  };

  // Get single raffle with stats
  const useRaffleById = (raffleId: string | undefined) => {
    return useQuery({
      queryKey: ['raffle', raffleId],
      queryFn: async () => {
        if (!raffleId) return null;

        const { data: raffle, error: raffleError } = await supabase
          .from('raffles')
          .select('*')
          .eq('id', raffleId)
          .maybeSingle();

        if (raffleError) throw raffleError;
        if (!raffle) return null;

        // Get ticket stats
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('status, ticket_number')
          .eq('raffle_id', raffleId);

        if (ticketsError) throw ticketsError;

        const stats = {
          tickets_sold: tickets?.filter(t => t.status === 'sold').length || 0,
          tickets_available: tickets?.filter(t => t.status === 'available').length || 0,
          tickets_reserved: tickets?.filter(t => t.status === 'reserved').length || 0,
          total_revenue: (tickets?.filter(t => t.status === 'sold').length || 0) * raffle.ticket_price,
        };

        return { ...raffle, ...stats } as RaffleWithStats;
      },
      enabled: !!raffleId,
    });
  };

  // Create raffle mutation
  const createRaffle = useMutation({
    mutationFn: async (data: Partial<RaffleInsert>) => {
      if (!organization?.id) throw new Error('No organization');

      // Generate unique slug
      const slug = await generateUniqueSlug(
        data.title || 'sorteo',
        async (slug) => {
          const { data: existing } = await supabase
            .from('raffles')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();
          return !!existing;
        }
      );

      const raffleData: RaffleInsert = {
        organization_id: organization.id,
        title: data.title || 'Nuevo Sorteo',
        prize_name: data.prize_name || 'Premio',
        ticket_price: data.ticket_price || 100,
        total_tickets: data.total_tickets || 100,
        slug,
        status: 'draft',
        ...data,
      };

      const { data: raffle, error } = await supabase
        .from('raffles')
        .insert(raffleData)
        .select()
        .single();

      if (error) throw error;
      return raffle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      toast({ title: 'Sorteo creado', description: 'El sorteo se ha guardado como borrador' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update raffle mutation
  const updateRaffle = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RaffleUpdate }) => {
      const { data: raffle, error } = await supabase
        .from('raffles')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return raffle;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      queryClient.invalidateQueries({ queryKey: ['raffle', variables.id] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Publish raffle mutation
  const publishRaffle = useMutation({
    mutationFn: async (raffleId: string) => {
      // First update status
      const { data: raffle, error } = await supabase
        .from('raffles')
        .update({ status: 'active' })
        .eq('id', raffleId)
        .select()
        .single();

      if (error) throw error;

      // Generate tickets via edge function
      const { error: genError } = await supabase.functions.invoke('generate-tickets', {
        body: { raffle_id: raffleId },
      });

      if (genError) {
        // Rollback status
        await supabase.from('raffles').update({ status: 'draft' }).eq('id', raffleId);
        throw genError;
      }

      return raffle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      toast({ title: 'Sorteo publicado', description: 'Los boletos están siendo generados' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Pause/Resume raffle
  const toggleRaffleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const { data, error } = await supabase
        .from('raffles')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      toast({ title: 'Estado actualizado' });
    },
  });

  // Delete raffle
  const deleteRaffle = useMutation({
    mutationFn: async (raffleId: string) => {
      // First delete all tickets
      await supabase.from('tickets').delete().eq('raffle_id', raffleId);
      
      // Then delete packages
      await supabase.from('raffle_packages').delete().eq('raffle_id', raffleId);
      
      // Finally delete raffle
      const { error } = await supabase.from('raffles').delete().eq('id', raffleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      toast({ title: 'Sorteo eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Duplicate raffle
  const duplicateRaffle = useMutation({
    mutationFn: async (raffleId: string) => {
      const { data: original, error: fetchError } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', raffleId)
        .single();

      if (fetchError) throw fetchError;

      const slug = await generateUniqueSlug(
        `${original.title}-copia`,
        async (slug) => {
          const { data: existing } = await supabase
            .from('raffles')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();
          return !!existing;
        }
      );

      const { id, created_at, updated_at, winner_data, winner_ticket_number, ...rest } = original;

      const { data: newRaffle, error } = await supabase
        .from('raffles')
        .insert({
          ...rest,
          title: `${original.title} (Copia)`,
          slug,
          status: 'draft',
          start_date: null,
          draw_date: null,
        })
        .select()
        .single();

      if (error) throw error;
      return newRaffle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      toast({ title: 'Sorteo duplicado', description: 'Se ha creado una copia como borrador' });
    },
  });

  return {
    useRafflesList,
    useRaffleById,
    createRaffle,
    updateRaffle,
    publishRaffle,
    toggleRaffleStatus,
    deleteRaffle,
    duplicateRaffle,
  };
};
