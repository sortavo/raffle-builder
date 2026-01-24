import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyWinnerSelected, notifyRaffleCompleted } from '@/lib/notifications';
import type { Json } from '@/integrations/supabase/types';

interface WinnerData {
  ticket_id: string;
  ticket_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_city: string | null;
  draw_method: 'manual' | 'lottery' | 'random_org';
  draw_timestamp: string;
  metadata?: Record<string, unknown>;
}

interface SelectWinnerParams {
  raffleId: string;
  ticketNumber: string;
  ticketId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  buyerCity: string | null;
  drawMethod: 'manual' | 'lottery' | 'random_org';
  metadata?: Record<string, any>;
}

interface NotifyWinnerParams {
  raffleId: string;
  buyerName: string;
  buyerEmail: string;
  ticketNumber: string;
  prizeName: string;
  raffleTitle: string;
  orgName: string;
  drawMethod: string;
}

export function useDrawWinner() {
  const queryClient = useQueryClient();

  const selectWinner = useMutation({
    mutationFn: async (params: SelectWinnerParams) => {
      const {
        raffleId,
        ticketNumber,
        ticketId,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerCity,
        drawMethod,
        metadata,
      } = params;

      // Verify ticket exists in orders and is sold
      // ticketId in this context is the order ID
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status, buyer_name, buyer_email, buyer_phone, buyer_city, lucky_indices, ticket_ranges')
        .eq('id', ticketId)
        .eq('status', 'sold')
        .maybeSingle();

      if (orderError || !order) {
        throw new Error('La orden no existe o no está vendida');
      }

      const winnerData: WinnerData = {
        ticket_id: ticketId,
        ticket_number: ticketNumber,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        buyer_city: buyerCity,
        draw_method: drawMethod,
        draw_timestamp: new Date().toISOString(),
        metadata,
      };

      // Update raffle with winner
      const { error: raffleError } = await supabase
        .from('raffles')
        .update({
          status: 'completed',
          winner_ticket_number: ticketNumber,
          winner_data: winnerData as unknown as Json,
        })
        .eq('id', raffleId);

      if (raffleError) {
        throw new Error('Error al guardar el ganador: ' + raffleError.message);
      }

      // Get raffle info for notifications
      const { data: raffle } = await supabase
        .from('raffles')
        .select('organization_id, created_by, title, prize_name')
        .eq('id', raffleId)
        .single();

      if (raffle) {
        // Log to analytics
        await supabase.from('analytics_events').insert([{
          organization_id: raffle.organization_id,
          raffle_id: raffleId,
          event_type: 'winner_selected',
          metadata: winnerData as unknown as Json,
        }]);

        // Send in-app notification to winner if they have an account
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', buyerEmail)
          .maybeSingle();

        if (winnerProfile?.id) {
          notifyWinnerSelected(
            winnerProfile.id,
            raffle.title,
            ticketNumber,
            raffle.prize_name
          ).catch(console.error);
        }

        // Notify the organizer about raffle completion
        if (raffle.created_by && raffle.organization_id) {
          notifyRaffleCompleted(
            raffle.created_by,
            raffle.organization_id,
            raffleId,
            raffle.title,
            buyerName,
            ticketNumber
          ).catch(console.error);
        }
      }

      return winnerData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
      toast.success('¡Ganador seleccionado exitosamente!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const notifyWinner = useMutation({
    mutationFn: async (params: NotifyWinnerParams) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.buyerEmail,
          template: 'winner',
          data: {
            buyer_name: params.buyerName,
            ticket_numbers: [params.ticketNumber],
            prize_name: params.prizeName,
            raffle_title: params.raffleTitle,
            org_name: params.orgName,
            draw_method: params.drawMethod,
          },
        },
      });

      if (error) {
        throw new Error('Error al enviar notificación: ' + error.message);
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Notificación enviada al ganador');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const publishResult = useMutation({
    mutationFn: async (raffleId: string) => {
      const { error } = await supabase
        .from('raffles')
        .update({ winner_announced: true })
        .eq('id', raffleId);

      if (error) {
        throw new Error('Error al publicar resultado');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      toast.success('Resultado publicado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const generateRandomNumber = (max: number): number => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return (array[0] % max) + 1;
  };

  // New: Draw random winner from server for scalability with millions of tickets
  const drawRandomWinner = async (raffleId: string) => {
    const { data, error } = await supabase.functions.invoke('draw-random-winner', {
      body: { raffle_id: raffleId },
    });

    if (error) {
      throw new Error('Error al sortear ganador: ' + error.message);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data.winner as {
      id: string;
      ticket_number: string;
      buyer_name: string | null;
      buyer_email: string | null;
      buyer_phone: string | null;
      buyer_city: string | null;
    };
  };

  return {
    selectWinner,
    notifyWinner,
    publishResult,
    generateRandomNumber,
    drawRandomWinner,
  };
}
