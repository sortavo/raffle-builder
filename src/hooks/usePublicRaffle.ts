import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { notifyPaymentPending } from "@/lib/notifications";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Raffle = Tables<'raffles'>;
type Ticket = Tables<'sold_tickets'>;

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
    // Array fields for multiple contacts
    emails: string[] | null;
    phones: string[] | null;
    whatsapp_numbers: string[] | null;
    // Additional trust/location fields
    address: string | null;
    years_experience: number | null;
    total_raffles_completed: number | null;
  };
  packages?: {
    id: string;
    quantity: number;
    price: number;
    discount_percent: number | null;
    label: string | null;
  }[];
}

export function usePublicRaffle(slug: string | undefined, orgSlug?: string) {
  return useQuery({
    queryKey: ['public-raffle', slug, orgSlug],
    queryFn: async (): Promise<RaffleWithStats | null> => {
      if (!slug) return null;

      let query = supabase
        .from('raffles')
        .select(`
          *,
          organizations!inner (
            id, name, logo_url, phone, email, brand_color, slug,
            description, whatsapp_number, facebook_url, instagram_url,
            tiktok_url, website_url, city, verified, created_at,
            emails, phones, whatsapp_numbers, address,
            years_experience, total_raffles_completed
          )
        `)
        .eq('slug', slug)
        .eq('status', 'active');

      // If orgSlug provided, filter by organization slug
      if (orgSlug) {
        query = query.eq('organizations.slug', orgSlug);
      }

      const { data: raffle, error } = await query.maybeSingle();

      if (error) throw error;
      if (!raffle) return null;

      // Use SECURITY DEFINER RPC for public-safe counts (bypasses RLS for anon users)
      const [countsResult, revenueResult] = await Promise.all([
        supabase.rpc('get_public_ticket_counts', {
          p_raffle_id: raffle.id,
        }),
        // Revenue query - will return empty for anon users (fine, revenue is org-only data)
        supabase
          .from('sold_tickets')
          .select('payment_reference, order_total')
          .eq('raffle_id', raffle.id)
          .eq('status', 'sold')
          .not('payment_reference', 'is', null),
      ]);

      // Extract counts from RPC result (works for anonymous users)
      const counts = countsResult.data?.[0];
      const ticketsSold = Number(counts?.sold_count) || 0;
      const ticketsReserved = Number(counts?.reserved_count) || 0;
      const ticketsAvailable = Number(counts?.available_count) || 0;

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

// Legacy hooks (usePublicTickets, useReserveTickets) have been removed.
// Use useVirtualTickets and useReserveVirtualTickets from useVirtualTickets.ts instead.

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
      
      if (import.meta.env.DEV) console.log('Uploading payment proof:', { raffleId, referenceCode, storagePath });
      
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

      if (import.meta.env.DEV) console.log('File uploaded, associating with tickets via edge function:', { publicUrl, referenceCode, buyerEmail });

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

      if (import.meta.env.DEV) console.log('Payment proof associated successfully:', data);
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
        .from('sold_tickets')
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
        if (import.meta.env.DEV) console.log(`Using edge function for ${count} random tickets`);
        
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

      // For small counts (<=100), use virtual tickets approach
      // Fetch a page of virtual tickets and filter for available ones
      const { data: virtualTickets, error: ticketsError } = await supabase.rpc('get_virtual_tickets', {
        p_raffle_id: raffleId,
        p_page: 1,
        p_page_size: Math.min(count * 10, 1000), // Get more than needed to account for sold/reserved
      });

      if (ticketsError) throw ticketsError;
      
      // Filter to only available tickets
      const availableTickets = (virtualTickets || []).filter(
        (t: { status: string; ticket_number: string }) => 
          t.status === 'available' && !excludeNumbers.includes(t.ticket_number)
      );

      if (availableTickets.length < count) {
        throw new Error(`Solo hay ${availableTickets.length} boletos disponibles`);
      }

      // Secure shuffle
      const shuffled = secureShuffleArray(availableTickets);
      return shuffled.slice(0, count).map((t: { ticket_number: string }) => t.ticket_number);
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

      // In virtual model, a ticket is available if it does NOT exist in sold_tickets
      // or if it exists with expired reservation
      const { data, error } = await supabase
        .from('sold_tickets')
        .select('ticket_number, status, reserved_until')
        .eq('raffle_id', raffleId)
        .in('ticket_number', ticketNumbers);

      if (error) throw error;

      // Build a set of unavailable tickets
      const unavailableSet = new Set(
        (data || [])
          .filter(t => {
            // Sold tickets are not available
            if (t.status === 'sold') return true;
            // Reserved tickets are unavailable ONLY if not expired
            if (t.status === 'reserved') {
              const reservedUntil = t.reserved_until ? new Date(t.reserved_until) : null;
              return reservedUntil && reservedUntil > new Date();
            }
            return false;
          })
          .map(t => t.ticket_number)
      );

      // Return tickets that are NOT in the unavailable set (they're available)
      return ticketNumbers.filter(tn => !unavailableSet.has(tn));
    },
  });
}

// useRepairTickets removed - virtual tickets don't need repair

export function useSearchTickets() {
  return useMutation({
    mutationFn: async ({
      raffleId,
      searchTerm,
      limit = 50,
    }: {
      raffleId: string;
      searchTerm: string;
      limit?: number;
    }) => {
      if (!searchTerm || searchTerm.trim() === '') return [];

      const term = searchTerm.trim();
      
      // Use secure RPC function that only returns public fields
      // Protected: buyer_email, buyer_phone, payment_reference, order_total
      const { data, error } = await supabase.rpc('search_public_tickets', {
        p_raffle_id: raffleId,
        p_search: term,
        p_limit: limit,
      });

      if (error) throw error;
      return data || [];
    },
  });
}

// Preview hook for organizers to see their draft raffles
export interface PreviewRaffleResult extends RaffleWithStats {
  isPreviewMode: boolean;
}

export function usePreviewRaffle(slug: string | undefined, enabled: boolean = false) {
  const { user, organization } = useAuth();

  return useQuery({
    queryKey: ['preview-raffle', slug, organization?.id],
    queryFn: async (): Promise<PreviewRaffleResult | null> => {
      if (!slug || !user || !organization) return null;

      // Fetch raffle without status filter - authenticated user query
      const { data: raffle, error } = await supabase
        .from('raffles')
        .select(`
          *,
          organizations (
            id, name, logo_url, phone, email, brand_color, slug,
            description, whatsapp_number, facebook_url, instagram_url,
            tiktok_url, website_url, city, verified, created_at,
            emails, phones, whatsapp_numbers, address,
            years_experience, total_raffles_completed
          )
        `)
        .eq('slug', slug)
        .eq('organization_id', organization.id) // Only fetch if belongs to user's org
        .maybeSingle();

      if (error) throw error;
      if (!raffle) return null;

      // Get ticket counts using virtual RPC
      const { data: countsData, error: statsError } = await supabase.rpc('get_virtual_ticket_counts', {
        p_raffle_id: raffle.id,
      });

      if (statsError) throw statsError;

      const counts = countsData?.[0];
      const ticketsSold = counts?.sold_count || 0;
      const ticketsReserved = counts?.reserved_count || 0;
      const ticketsAvailable = counts?.available_count || 0;

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
        totalRevenue: 0, // Not important for preview
        organization: raffle.organizations as RaffleWithStats['organization'],
        packages: packages || [],
        isPreviewMode: raffle.status !== 'active',
      };
    },
    enabled: enabled && !!slug && !!user && !!organization,
    staleTime: 30000,
  });
}
