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
  organization?: {
    name: string;
    logo_url: string | null;
    slug: string | null;
  };
}

export interface RaffleFilters {
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'created_at' | 'title' | 'draw_date' | 'total_tickets';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedRaffles {
  data: Raffle[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const useRaffles = () => {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all raffles for the organization with pagination
  const useRafflesList = (filters?: RaffleFilters) => {
    return useQuery({
      queryKey: ['raffles', organization?.id, filters],
      queryFn: async (): Promise<PaginatedRaffles> => {
        if (!organization?.id) return { data: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 };

        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('raffles')
          .select('*', { count: 'exact' })
          .eq('organization_id', organization.id)
          .is('archived_at', null) // Exclude archived raffles for scalability
          .order(filters?.sortBy || 'created_at', { ascending: filters?.sortOrder === 'asc' })
          .range(from, to);

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

        const { data, error, count } = await query;

        if (error) throw error;
        
        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        return {
          data: data as Raffle[],
          totalCount,
          page,
          pageSize,
          totalPages,
        };
      },
      enabled: !!organization?.id,
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 120000, // Keep in cache for 2 minutes
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
          .select('*, organizations:organization_id(name, logo_url, slug)')
          .eq('id', raffleId)
          .maybeSingle();

        if (raffleError) throw raffleError;
        if (!raffle) return null;

        // Extract organization data
        const organizationData = raffle.organizations as { name: string; logo_url: string | null; slug: string | null } | null;

        // Try to get ticket stats using RPC (bypasses RLS) first, fallback to direct query
        let stats = {
          tickets_sold: 0,
          tickets_available: 0,
          tickets_reserved: 0,
          total_revenue: 0,
        };

        try {
          // Use RPC function that bypasses RLS for public access
          const { data: ticketCounts } = await supabase
            .rpc('get_public_ticket_counts', { p_raffle_id: raffleId });

          if (ticketCounts && ticketCounts[0]) {
            stats.tickets_sold = ticketCounts[0].sold_count || 0;
            stats.tickets_available = ticketCounts[0].available_count || 0;
            stats.tickets_reserved = ticketCounts[0].reserved_count || 0;
          }

          // Calculate revenue separately - try direct query for authenticated users
          const { data: revenueData } = await supabase
            .from('sold_tickets')
            .select('payment_reference, order_total')
            .eq('raffle_id', raffleId)
            .eq('status', 'sold')
            .not('payment_reference', 'is', null);

          if (revenueData && revenueData.length > 0) {
            const uniqueGroups = new Map<string, number>();
            for (const ticket of revenueData) {
              if (ticket.payment_reference && ticket.order_total !== null) {
                uniqueGroups.set(ticket.payment_reference, Number(ticket.order_total));
              }
            }
            stats.total_revenue = Array.from(uniqueGroups.values()).reduce((sum, val) => sum + val, 0);
          }

          // Fallback: for sold tickets without order_total, use ticket_price
          const soldWithOrderTotal = revenueData?.filter(t => t.order_total !== null).length || 0;
          const soldWithoutOrderTotal = stats.tickets_sold - soldWithOrderTotal;
          if (soldWithoutOrderTotal > 0) {
            stats.total_revenue += soldWithoutOrderTotal * raffle.ticket_price;
          }
        } catch (error) {
          console.warn('Could not fetch ticket stats, using defaults:', error);
          // Stats remain at 0 defaults - page will still render
        }

        // Remove the organizations field from raffle and add organization
        const { organizations: _, ...raffleWithoutOrg } = raffle;

        return { 
          ...raffleWithoutOrg, 
          ...stats, 
          organization: organizationData || undefined 
        } as RaffleWithStats;
      },
      enabled: !!raffleId,
      staleTime: 15000, // Cache for 15 seconds
      gcTime: 60000, // Keep in cache for 1 minute
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
      
      // If total_tickets changed on a published raffle, trigger ticket generation
      // The edge function will handle append mode if needed
      if (data.total_tickets && raffle.status !== 'draft') {
        const { data: genResult, error: genError } = await supabase.functions.invoke('generate-tickets', {
          body: { raffle_id: id },
        });
        
        if (genError) {
          console.error('Error generating additional tickets:', genError);
          // Don't throw - the raffle was updated successfully
        } else if (genResult?.mode === 'append') {
          console.log(`Added ${genResult.count} new tickets to raffle`);
        }
      }
      
      return raffle;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      queryClient.invalidateQueries({ queryKey: ['raffle', variables.id] });
      // Also invalidate public raffle cache so changes reflect immediately
      if (data?.slug) {
        queryClient.invalidateQueries({ queryKey: ['public-raffle', data.slug] });
      }
      queryClient.invalidateQueries({ queryKey: ['public-raffle'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Publish raffle mutation
  const publishRaffle = useMutation({
    mutationFn: async (raffleId: string) => {
      // Get organization ID from the raffle
      const { data: raffleData, error: raffleError } = await supabase
        .from('raffles')
        .select('organization_id')
        .eq('id', raffleId)
        .single();

      if (raffleError) throw raffleError;

      // Check for enabled payment methods
      const { data: paymentMethods, error: paymentError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('organization_id', raffleData.organization_id)
        .eq('enabled', true)
        .limit(1);

      if (paymentError) throw paymentError;

      if (!paymentMethods || paymentMethods.length === 0) {
        throw new Error('PAYMENT_METHODS_REQUIRED');
      }

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
      if (error.message === 'PAYMENT_METHODS_REQUIRED') {
        toast({ 
          title: 'Métodos de pago requeridos', 
          description: 'Configura al menos un método de pago habilitado antes de publicar',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    },
  });

  // Pause/Resume raffle with optimistic updates
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
    // Optimistic update
    onMutate: async ({ id, currentStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['raffles'] });
      
      // Snapshot previous value
      const previousRaffles = queryClient.getQueriesData({ queryKey: ['raffles'] });
      
      // Optimistically update to new value
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      queryClient.setQueriesData({ queryKey: ['raffles'] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((raffle: Raffle) =>
            raffle.id === id ? { ...raffle, status: newStatus } : raffle
          ),
        };
      });
      
      return { previousRaffles };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousRaffles) {
        context.previousRaffles.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
    },
    onSuccess: (_data, { currentStatus }) => {
      const newStatus = currentStatus === 'active' ? 'pausado' : 'activado';
      toast({ title: `Sorteo ${newStatus}` });
    },
  });

  // Delete raffle
  const deleteRaffle = useMutation({
    mutationFn: async (raffleId: string) => {
      // First delete all sold tickets
      await supabase.from('sold_tickets').delete().eq('raffle_id', raffleId);
      
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
