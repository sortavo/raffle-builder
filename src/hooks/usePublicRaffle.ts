import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { notifyPaymentPending } from "@/lib/notifications";
import type { Tables } from "@/integrations/supabase/types";

type Raffle = Tables<'raffles'>;
type Ticket = Tables<'tickets'>;

export interface RaffleWithStats extends Raffle {
  ticketsSold: number;
  ticketsAvailable: number;
  ticketsReserved: number;
  totalRevenue: number;
  organization?: {
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string;
  };
  packages?: {
    id: string;
    quantity: number;
    price: number;
    discount_percent: number | null;
    label: string | null;
  }[];
}

export function usePublicRaffle(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-raffle', slug],
    queryFn: async (): Promise<RaffleWithStats | null> => {
      if (!slug) return null;

      const { data: raffle, error } = await supabase
        .from('raffles')
        .select(`
          *,
          organizations (name, logo_url, phone, email)
        `)
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      if (!raffle) return null;

      // Get ticket stats
      const { data: tickets } = await supabase
        .from('tickets')
        .select('status, ticket_number')
        .eq('raffle_id', raffle.id);

      const ticketsSold = tickets?.filter(t => t.status === 'sold').length || 0;
      const ticketsReserved = tickets?.filter(t => t.status === 'reserved').length || 0;
      const ticketsAvailable = tickets?.filter(t => t.status === 'available').length || 0;

      // Get packages
      const { data: packages } = await supabase
        .from('raffle_packages')
        .select('*')
        .eq('raffle_id', raffle.id)
        .order('display_order', { ascending: true });

      return {
        ...raffle,
        ticketsSold,
        ticketsAvailable,
        ticketsReserved,
        totalRevenue: ticketsSold * Number(raffle.ticket_price),
        organization: raffle.organizations as RaffleWithStats['organization'],
        packages: packages || [],
      };
    },
    enabled: !!slug,
    staleTime: 30000,
  });
}

export function usePublicTickets(raffleId: string | undefined, page: number = 1, pageSize: number = 100) {
  return useQuery({
    queryKey: ['public-tickets', raffleId, page, pageSize],
    queryFn: async () => {
      if (!raffleId) return { tickets: [], count: 0 };

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('tickets')
        .select('id, ticket_number, status, reserved_until', { count: 'exact' })
        .eq('raffle_id', raffleId)
        .order('ticket_number', { ascending: true })
        .range(from, to);

      if (error) throw error;

      return {
        tickets: data || [],
        count: count || 0,
      };
    },
    enabled: !!raffleId,
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

// Generate a unique 8-character reference code
function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useReserveTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      raffleId,
      ticketNumbers,
      buyerData,
      reservationMinutes,
    }: {
      raffleId: string;
      ticketNumbers: string[];
      buyerData: {
        name: string;
        email: string;
        phone: string;
        city?: string;
      };
      reservationMinutes: number;
    }) => {
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + reservationMinutes);

      // Generate unique reference code for this reservation group
      const referenceCode = generateReferenceCode();
      const reservedTickets: Ticket[] = [];

      // Reserve each ticket atomically
      for (const ticketNumber of ticketNumbers) {
        const { data: ticket, error } = await supabase
          .from('tickets')
          .update({
            status: 'reserved',
            buyer_name: buyerData.name,
            buyer_email: buyerData.email,
            buyer_phone: buyerData.phone,
            buyer_city: buyerData.city || null,
            reserved_at: new Date().toISOString(),
            reserved_until: reservedUntil.toISOString(),
            payment_reference: referenceCode,
          })
          .eq('raffle_id', raffleId)
          .eq('ticket_number', ticketNumber)
          .eq('status', 'available')
          .select()
          .maybeSingle();

        if (error) throw error;
        if (!ticket) {
          throw new Error(`El boleto ${ticketNumber} ya no está disponible`);
        }
        reservedTickets.push(ticket);
      }

      return {
        tickets: reservedTickets,
        reservedUntil: reservedUntil.toISOString(),
        referenceCode,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['public-tickets', variables.raffleId] });
      queryClient.invalidateQueries({ queryKey: ['public-raffle'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al reservar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUploadPaymentProof() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      raffleId,
      ticketIds,
      file,
      buyerName,
    }: {
      raffleId: string;
      ticketIds: string[];
      file: File;
      buyerName?: string;
    }) => {
      // Upload file to storage
      const fileName = `${raffleId}/${Date.now()}-${file.name}`;
      const { data: upload, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(upload.path);

      // Update tickets with proof URL
      const { data: updatedTickets, error } = await supabase
        .from('tickets')
        .update({ payment_proof_url: publicUrl })
        .in('id', ticketIds)
        .select('ticket_number');

      if (error) throw error;

      // Get raffle info to notify the organizer
      const { data: raffle } = await supabase
        .from('raffles')
        .select('title, organization_id, created_by')
        .eq('id', raffleId)
        .single();

      if (raffle?.created_by && raffle?.organization_id) {
        const ticketNumbers = updatedTickets?.map(t => t.ticket_number) || [];
        
        // Notify the organizer about new payment proof (non-blocking)
        notifyPaymentPending(
          raffle.created_by,
          raffle.organization_id,
          raffleId,
          raffle.title,
          ticketNumbers,
          buyerName || 'Comprador'
        ).catch(console.error);
      }

      return publicUrl;
    },
    onSuccess: () => {
      toast({
        title: 'Comprobante subido',
        description: 'Estamos revisando tu pago. Recibirás confirmación pronto.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al subir comprobante',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMyTickets(email: string | undefined) {
  return useQuery({
    queryKey: ['my-tickets', email],
    queryFn: async () => {
      if (!email) return [];

      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          raffles (id, title, slug, prize_name, prize_images, draw_date, status, ticket_price, currency_code)
        `)
        .eq('buyer_email', email)
        .in('status', ['reserved', 'sold'])
        .order('reserved_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!email,
  });
}

/**
 * Cryptographically secure random number generator
 * Uses crypto.getRandomValues() for true randomness
 */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Fisher-Yates shuffle using cryptographically secure random
 * Provides unbiased, secure shuffling of arrays
 */
function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useRandomAvailableTickets() {
  return useMutation({
    mutationFn: async ({
      raffleId,
      count,
    }: {
      raffleId: string;
      count: number;
    }) => {
      const { data, error } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('raffle_id', raffleId)
        .eq('status', 'available')
        .limit(count * 3); // Get more than needed for randomization

      if (error) throw error;
      if (!data || data.length < count) {
        throw new Error(`Solo hay ${data?.length || 0} boletos disponibles`);
      }

      // Cryptographically secure shuffle using Fisher-Yates algorithm
      const shuffled = secureShuffleArray(data);
      return shuffled.slice(0, count).map(t => t.ticket_number);
    },
  });
}
