import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Prize } from '@/types/prize';

export interface RaffleDraw {
  id: string;
  raffle_id: string;
  prize_id: string;
  prize_name: string;
  prize_value: number | null;
  ticket_id: string | null;
  ticket_number: string;
  winner_name: string | null;
  winner_email: string | null;
  winner_phone: string | null;
  winner_city: string | null;
  draw_method: 'manual' | 'lottery' | 'random_org';
  draw_metadata: Record<string, unknown>;
  draw_type: 'pre_draw' | 'main_draw';
  scheduled_date: string | null;
  drawn_at: string;
  announced: boolean;
  announced_at: string | null;
  winner_notified: boolean;
  winner_notified_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface CreateDrawParams {
  raffleId: string;
  prizeId: string;
  prizeName: string;
  prizeValue?: number | null;
  ticketId: string;
  ticketNumber: string;
  winnerName: string;
  winnerEmail: string;
  winnerPhone?: string | null;
  winnerCity?: string | null;
  drawMethod: 'manual' | 'lottery' | 'random_org';
  drawMetadata?: Record<string, unknown>;
  drawType: 'pre_draw' | 'main_draw';
}

export function useRaffleDraws(raffleId: string | undefined) {
  const queryClient = useQueryClient();

  // Get all draws for a raffle
  const { data: draws = [], isLoading, error } = useQuery({
    queryKey: ['raffle-draws', raffleId],
    queryFn: async () => {
      if (!raffleId) return [];
      
      const { data, error } = await supabase
        .from('raffle_draws')
        .select('*')
        .eq('raffle_id', raffleId)
        .order('drawn_at', { ascending: false });

      if (error) throw error;
      return data as RaffleDraw[];
    },
    enabled: !!raffleId,
  });

  // Get completed draws
  const completedDraws = draws.filter(d => d.ticket_id !== null);
  
  // Get announced draws
  const announcedDraws = draws.filter(d => d.announced);

  // Get prize IDs that have been drawn
  const drawnPrizeIds = new Set(completedDraws.map(d => d.prize_id));

  // Check if a specific prize has been drawn
  const isPrizeDrawn = (prizeId: string) => drawnPrizeIds.has(prizeId);

  // Create a new draw record
  const createDraw = useMutation({
    mutationFn: async (params: CreateDrawParams) => {
      const { data: user } = await supabase.auth.getUser();
      
      const insertData = {
        raffle_id: params.raffleId,
        prize_id: params.prizeId,
        prize_name: params.prizeName,
        prize_value: params.prizeValue,
        ticket_id: params.ticketId,
        ticket_number: params.ticketNumber,
        winner_name: params.winnerName,
        winner_email: params.winnerEmail,
        winner_phone: params.winnerPhone,
        winner_city: params.winnerCity,
        draw_method: params.drawMethod,
        draw_metadata: params.drawMetadata || {},
        draw_type: params.drawType,
        drawn_at: new Date().toISOString(),
        created_by: user?.user?.id,
      };
      
      const { data, error } = await supabase
        .from('raffle_draws')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as RaffleDraw;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle-draws', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      toast.success('Sorteo registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar sorteo: ' + error.message);
    },
  });

  // Announce a draw result
  const announceDraw = useMutation({
    mutationFn: async (drawId: string) => {
      const { error } = await supabase
        .from('raffle_draws')
        .update({
          announced: true,
          announced_at: new Date().toISOString(),
        })
        .eq('id', drawId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle-draws', raffleId] });
      toast.success('Resultado publicado');
    },
    onError: (error: Error) => {
      toast.error('Error al publicar: ' + error.message);
    },
  });

  // Mark winner as notified
  const markWinnerNotified = useMutation({
    mutationFn: async (drawId: string) => {
      const { error } = await supabase
        .from('raffle_draws')
        .update({
          winner_notified: true,
          winner_notified_at: new Date().toISOString(),
        })
        .eq('id', drawId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle-draws', raffleId] });
      toast.success('Ganador notificado');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Delete a draw (for corrections)
  const deleteDraw = useMutation({
    mutationFn: async (drawId: string) => {
      const { error } = await supabase
        .from('raffle_draws')
        .delete()
        .eq('id', drawId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle-draws', raffleId] });
      toast.success('Sorteo eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  return {
    draws,
    completedDraws,
    announcedDraws,
    drawnPrizeIds,
    isPrizeDrawn,
    isLoading,
    error,
    createDraw,
    announceDraw,
    markWinnerNotified,
    deleteDraw,
  };
}

// Hook for public view of announced draws
export function usePublicDraws(raffleId: string | undefined) {
  return useQuery({
    queryKey: ['public-draws', raffleId],
    queryFn: async () => {
      if (!raffleId) return [];
      
      const { data, error } = await supabase
        .from('raffle_draws')
        .select('id, prize_id, prize_name, prize_value, ticket_number, winner_name, winner_city, draw_method, draw_type, drawn_at, announced_at')
        .eq('raffle_id', raffleId)
        .eq('announced', true)
        .order('drawn_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!raffleId,
  });
}

// Helper to get remaining prizes that haven't been drawn
export function getRemainingPrizes(prizes: Prize[], drawnPrizeIds: Set<string>): Prize[] {
  return prizes.filter(p => !drawnPrizeIds.has(p.id));
}
