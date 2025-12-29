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
    id: string;
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string;
    brand_color: string | null;
    slug: string | null;
    description: string | null;
    whatsapp_number: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    website_url: string | null;
    city: string | null;
    verified: boolean | null;
    created_at: string | null;
    // New array fields for multiple contacts
    emails: string[] | null;
    phones: string[] | null;
    whatsapp_numbers: string[] | null;
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
          organizations (
            id, name, logo_url, phone, email, brand_color, slug,
            description, whatsapp_number, facebook_url, instagram_url,
            tiktok_url, website_url, city, verified, created_at,
            emails, phones, whatsapp_numbers
          )
        `)
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      if (!raffle) return null;

      // Get ticket counts and revenue data using count queries (no limit issues)
      const [soldResult, reservedResult, availableResult, revenueResult] = await Promise.all([
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('raffle_id', raffle.id)
          .eq('status', 'sold'),
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('raffle_id', raffle.id)
          .eq('status', 'reserved'),
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('raffle_id', raffle.id)
          .eq('status', 'available'),
        // Get revenue by summing unique order_total per payment_reference group
        supabase
          .from('tickets')
          .select('payment_reference, order_total')
          .eq('raffle_id', raffle.id)
          .eq('status', 'sold')
          .not('payment_reference', 'is', null),
      ]);

      const ticketsSold = soldResult.count || 0;
      const ticketsReserved = reservedResult.count || 0;
      const ticketsAvailable = availableResult.count || 0;

      // Calculate total revenue from unique payment groups
      let totalRevenue = 0;
      if (revenueResult.data && revenueResult.data.length > 0) {
        const uniqueGroups = new Map<string, number>();
        for (const ticket of revenueResult.data) {
          if (ticket.payment_reference && ticket.order_total !== null) {
            uniqueGroups.set(ticket.payment_reference, Number(ticket.order_total));
          }
        }
        totalRevenue = Array.from(uniqueGroups.values()).reduce((sum, val) => sum + val, 0);
      }
      
      // Fallback: for sold tickets without order_total, use ticket_price
      const soldWithOrderTotal = revenueResult.data?.filter(t => t.order_total !== null).length || 0;
      const soldWithoutOrderTotal = ticketsSold - soldWithOrderTotal;
      if (soldWithoutOrderTotal > 0) {
        totalRevenue += soldWithoutOrderTotal * Number(raffle.ticket_price);
      }

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
        totalRevenue,
        organization: raffle.organizations as RaffleWithStats['organization'],
        packages: packages || [],
      };
    },
    enabled: !!slug,
    staleTime: 60000, // Cache for 1 minute (was 30s)
    gcTime: 300000, // Keep in cache for 5 minutes
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
      orderTotal,
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
      orderTotal?: number;
    }) => {
      const reservedUntil = new Date();
      reservedUntil.setMinutes(reservedUntil.getMinutes() + reservationMinutes);

      // Generate unique reference code for this reservation group
      const referenceCode = generateReferenceCode();

      // ATOMIC OPERATION: Use a single update with .in() to reserve all tickets at once
      // This prevents race conditions where some tickets get reserved by other users
      const { data: reservedTickets, error } = await supabase
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
          order_total: orderTotal ?? null,
        })
        .eq('raffle_id', raffleId)
        .eq('status', 'available') // Only update available tickets
        .in('ticket_number', ticketNumbers)
        .select();

      if (error) throw error;

      // Verify ALL requested tickets were reserved (atomic validation)
      if (!reservedTickets || reservedTickets.length !== ticketNumbers.length) {
        // ROLLBACK: Release any tickets that were partially reserved
        if (reservedTickets && reservedTickets.length > 0) {
          await supabase
            .from('tickets')
            .update({
              status: 'available',
              buyer_name: null,
              buyer_email: null,
              buyer_phone: null,
              buyer_city: null,
              reserved_at: null,
              reserved_until: null,
              payment_reference: null,
            })
            .eq('raffle_id', raffleId)
            .eq('payment_reference', referenceCode);
        }

        const reservedCount = reservedTickets?.length || 0;
        const failedCount = ticketNumbers.length - reservedCount;
        throw new Error(
          `${failedCount} boleto(s) ya no estaban disponibles. Por favor, selecciona otros boletos.`
        );
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
      buyerEmail,
      referenceCode,
    }: {
      raffleId: string;
      ticketIds: string[];
      file: File;
      buyerName?: string;
      buyerEmail?: string;
      referenceCode?: string;
    }) => {
      // CRITICAL: Require referenceCode for reliable association
      if (!referenceCode) {
        throw new Error('Falta la clave de reserva. No podemos registrar tu comprobante sin ella.');
      }

      // Get file extension safely
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      const safeExtension = validExtensions.includes(extension) ? extension : 'jpg';
      
      // Create a clean filename with referenceCode for organization
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const cleanFileName = `proof_${timestamp}_${randomSuffix}.${safeExtension}`;
      
      // Include referenceCode in path for better organization and auditability
      const storagePath = `${raffleId}/${referenceCode}/${cleanFileName}`;
      
      console.log('Uploading payment proof:', { raffleId, referenceCode, storagePath });
      
      // Upload file to storage
      const { data: upload, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Error al subir el archivo. Intenta de nuevo.');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(upload.path);

      console.log('File uploaded, associating with tickets via edge function:', { publicUrl, referenceCode, buyerEmail });

      // ALWAYS use edge function for reliable association with elevated permissions
      const { data, error } = await supabase.functions.invoke('submit-payment-proof', {
        body: { 
          raffleId, 
          referenceCode, 
          publicUrl,
          buyerEmail: buyerEmail?.toLowerCase(),
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('No se pudo registrar el comprobante. Contacta al organizador con tu clave: ' + referenceCode);
      }

      if (!data?.success) {
        console.error('Edge function returned failure:', data);
        throw new Error(data?.error || 'Error al asociar el comprobante. Contacta al organizador.');
      }

      if (!data?.updatedCount || data.updatedCount === 0) {
        throw new Error('No se encontraron boletos para esta reservación. Verifica tu clave: ' + referenceCode);
      }

      console.log('Payment proof associated successfully:', data);
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

export function useMyTickets(
  searchValue: string | undefined, 
  searchType: 'email' | 'reference' | 'phone' = 'email'
) {
  return useQuery({
    queryKey: ['my-tickets', searchValue, searchType],
    queryFn: async () => {
      if (!searchValue) return [];

      let query = supabase
        .from('tickets')
        .select(`
          *,
          raffles (id, title, slug, prize_name, prize_images, draw_date, status, ticket_price, currency_code)
        `)
        .in('status', ['reserved', 'sold'])
        .order('reserved_at', { ascending: false });

      if (searchType === 'email') {
        query = query.eq('buyer_email', searchValue.toLowerCase());
      } else if (searchType === 'reference') {
        // Search by payment reference (reservation code) - case insensitive
        query = query.eq('payment_reference', searchValue.toUpperCase());
      } else if (searchType === 'phone') {
        // Search by phone - strip non-digits and search
        const cleanPhone = searchValue.replace(/\D/g, '');
        query = query.ilike('buyer_phone', `%${cleanPhone}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!searchValue,
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
      excludeNumbers = [],
    }: {
      raffleId: string;
      count: number;
      excludeNumbers?: string[];
    }) => {
      // For large quantities (>100), use the edge function for better performance
      if (count > 100) {
        console.log(`Using edge function for ${count} random tickets`);
        
        const { data, error } = await supabase.functions.invoke('select-random-tickets', {
          body: {
            raffle_id: raffleId,
            quantity: count,
            exclude_numbers: excludeNumbers,
          },
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error('Error al generar boletos aleatorios');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.selected || data.selected.length === 0) {
          throw new Error('No hay boletos disponibles');
        }

        if (data.selected.length < count) {
          console.warn(`Only ${data.selected.length} tickets available, requested ${count}`);
        }

        return data.selected as string[];
      }

      // For small counts (<=100), use client-side approach
      const { count: availableCount, error: countError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('raffle_id', raffleId)
        .eq('status', 'available');

      if (countError) throw countError;
      if (!availableCount || availableCount < count) {
        throw new Error(`Solo hay ${availableCount || 0} boletos disponibles`);
      }

      // Fetch enough tickets to shuffle
      const { data, error } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('raffle_id', raffleId)
        .eq('status', 'available')
        .limit(Math.min(count * 3, 1000));

      if (error) throw error;
      if (!data || data.length < count) {
        throw new Error(`Solo hay ${data?.length || 0} boletos disponibles`);
      }

      // Filter out excluded numbers
      let filtered = data;
      if (excludeNumbers.length > 0) {
        const excludeSet = new Set(excludeNumbers);
        filtered = data.filter(t => !excludeSet.has(t.ticket_number));
      }

      if (filtered.length < count) {
        throw new Error(`Solo hay ${filtered.length} boletos disponibles después de excluir los seleccionados`);
      }

      const shuffled = secureShuffleArray(filtered);
      return shuffled.slice(0, count).map(t => t.ticket_number);
    },
  });
}

export function useCheckTicketsAvailability() {
  return useMutation({
    mutationFn: async ({
      raffleId,
      ticketNumbers,
    }: {
      raffleId: string;
      ticketNumbers: string[];
    }): Promise<string[]> => {
      if (ticketNumbers.length === 0) return [];

      const { data, error } = await supabase
        .from('tickets')
        .select('ticket_number, status')
        .eq('raffle_id', raffleId)
        .in('ticket_number', ticketNumbers);

      if (error) throw error;

      // Return only the available ticket numbers
      return (data || [])
        .filter(t => t.status === 'available')
        .map(t => t.ticket_number);
    },
  });
}

export function useRepairTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (raffleId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-tickets', {
        body: { raffle_id: raffleId, force_rebuild: false },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, raffleId) => {
      toast({
        title: data.rebuilt ? 'Boletos regenerados' : 'Boletos generados',
        description: `Se generaron ${data.count} boletos correctamente`,
      });
      queryClient.invalidateQueries({ queryKey: ['public-tickets', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['public-raffle'] });
      queryClient.invalidateQueries({ queryKey: ['raffle', raffleId] });
      queryClient.invalidateQueries({ queryKey: ['raffles'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al generar boletos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSearchTickets() {
  return useMutation({
    mutationFn: async ({
      raffleId,
      searchTerm,
      limit = 100,
    }: {
      raffleId: string;
      searchTerm: string;
      limit?: number;
    }) => {
      if (!searchTerm || searchTerm.trim() === '') return [];

      const term = searchTerm.trim();
      
      // Optimize search: use prefix match when possible (much faster with index)
      // Only use ILIKE with leading wildcard for short search terms
      let query = supabase
        .from('tickets')
        .select('id, ticket_number, status')
        .eq('raffle_id', raffleId);

      // If the search term looks like a ticket number (padded), use exact or prefix match
      if (term.length >= 3) {
        // Use prefix matching for longer terms (faster with btree index)
        query = query.gte('ticket_number', term).lt('ticket_number', term + 'z');
      } else {
        // For short terms, use ILIKE but with suffix match (no leading wildcard = uses index)
        query = query.like('ticket_number', `%${term}`);
      }

      const { data, error } = await query
        .order('ticket_number', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
}
