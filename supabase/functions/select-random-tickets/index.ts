import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ INLINE RATE LIMITER ============
interface RateLimitEntry { count: number; windowStart: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);
  
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 1, windowStart: now };
    rateLimitStore.set(identifier, entry);
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 };
  }
  
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }
  
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfter: 0 };
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || req.headers.get('cf-connecting-ip') 
    || 'unknown';
}

// Secure random integer using crypto
function secureRandomInt(max: number): number {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] % max;
}

// Fisher-Yates shuffle with crypto random
function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Format ticket number based on raffle config
function formatTicketNumber(index: number, numberStart: number, totalTickets: number): string {
  const ticketNum = numberStart + index;
  const digits = Math.max(String(totalTickets + numberStart - 1).length, 1);
  return String(ticketNum).padStart(digits, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit: 30 requests per minute per IP
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`random-tickets:${clientIP}`, 30, 60000);
  
  if (!rateLimit.allowed) {
    console.warn(`[RATE-LIMIT] IP ${clientIP} exceeded limit for select-random-tickets`);
    return new Response(
      JSON.stringify({ 
        error: 'Demasiadas solicitudes. Intenta de nuevo en ' + rateLimit.retryAfter + ' segundos.' 
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': rateLimit.retryAfter.toString(),
        } 
      }
    );
  }

  try {
    const { raffle_id, quantity, exclude_numbers = [] } = await req.json();

    if (!raffle_id || !quantity) {
      return new Response(
        JSON.stringify({ error: 'raffle_id and quantity are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MAX_TICKETS = 100000;
    if (quantity > MAX_TICKETS) {
      return new Response(
        JSON.stringify({ error: `Máximo ${MAX_TICKETS.toLocaleString()} boletos por solicitud` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[SELECT-RANDOM] IP: ${clientIP}, Selecting ${quantity} random tickets for raffle ${raffle_id}`);

    // 1. Get raffle config for total tickets and numbering
    // PHASE 1: Read from numbering_config.start_number for consistency with frontend
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('total_tickets, numbering_config')
      .eq('id', raffle_id)
      .single();

    if (raffleError || !raffle) {
      console.error('[SELECT-RANDOM] Raffle not found:', raffleError);
      return new Response(
        JSON.stringify({ error: 'Rifa no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalTickets = raffle.total_tickets;
    // Use numbering_config.start_number (consistent with frontend TicketSelector)
    const numberingConfig = raffle.numbering_config as { start_number?: number } | null;
    const numberStart = numberingConfig?.start_number ?? 1;
    
    console.log(`[SELECT-RANDOM] Total tickets: ${totalTickets}, Number start: ${numberStart}`);

    // 2. Get ALL unavailable ticket indices (sold + reserved that haven't expired)
    // IMPORTANT: default API limit is 1000 rows, so we must paginate.
    const nowIso = new Date().toISOString();
    const PAGE_SIZE = 1000;

    const fetchAllIndices = async (
      status: 'sold' | 'reserved'
    ): Promise<number[]> => {
      const indices: number[] = [];
      let from = 0;

      while (true) {
        let q = supabase
          .from('sold_tickets')
          .select('ticket_index')
          .eq('raffle_id', raffle_id)
          .eq('status', status)
          .order('ticket_index', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (status === 'reserved') {
          q = q.gt('reserved_until', nowIso);
        }

        const { data, error } = await q;
        if (error) throw error;

        const batch = (data || []) as { ticket_index: number }[];
        if (batch.length === 0) break;

        indices.push(...batch.map((t) => t.ticket_index));
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      return indices;
    };

    const [soldIndices, reservedActiveIndices] = await Promise.all([
      fetchAllIndices('sold'),
      fetchAllIndices('reserved'),
    ]);

    const unavailableSet = new Set<number>([...soldIndices, ...reservedActiveIndices]);

    // Also exclude numbers already in exclude_numbers (convert to indices)
    const excludeSet = new Set<string>(exclude_numbers);
    
    // Calculate available count
    const unavailableCount = unavailableSet.size;
    const totalAvailable = totalTickets - unavailableCount;
    
    console.log(`[SELECT-RANDOM] Unavailable: ${unavailableCount}, Available: ${totalAvailable}`);

    if (totalAvailable === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No hay boletos disponibles', 
          selected: [],
          requested: quantity,
          available: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Generate random available tickets
    const selectedTickets: string[] = [];
    const selectedIndexArray: number[] = [];
    const selectedIndices = new Set<number>();
    const needed = Math.min(quantity, totalAvailable);
    
    // Strategy: For small quantities relative to total, use random sampling
    // For large quantities, build array of available indices and shuffle
    
    const samplingThreshold = Math.min(totalTickets * 0.1, 50000); // 10% of total or 50K max
    
    if (needed <= samplingThreshold && totalTickets > 10000) {
      // Random sampling strategy - good for selecting small % of large pool
      console.log(`[SELECT-RANDOM] Using sampling strategy for ${needed} tickets from ${totalTickets}`);
      
      let attempts = 0;
      const maxAttempts = needed * 10; // Allow some retries for collisions
      
      while (selectedIndices.size < needed && attempts < maxAttempts) {
        const randomIndex = secureRandomInt(totalTickets);
        attempts++;
        
        // Skip if already selected or unavailable
        if (selectedIndices.has(randomIndex) || unavailableSet.has(randomIndex)) {
          continue;
        }
        
        // Format ticket number
        const ticketNumber = formatTicketNumber(randomIndex, numberStart, totalTickets);
        
        // Skip if in exclude list
        if (excludeSet.has(ticketNumber)) {
          continue;
        }
        
        selectedIndices.add(randomIndex);
        selectedTickets.push(ticketNumber);
        selectedIndexArray.push(randomIndex);
      }
    } else {
      // Build-and-shuffle strategy - good for large selections or small pools
      console.log(`[SELECT-RANDOM] Using shuffle strategy for ${needed} tickets`);
      
      // Build array of available indices
      const availableIndices: number[] = [];
      for (let i = 0; i < totalTickets; i++) {
        if (!unavailableSet.has(i)) {
          const ticketNumber = formatTicketNumber(i, numberStart, totalTickets);
          if (!excludeSet.has(ticketNumber)) {
            availableIndices.push(i);
          }
        }
      }
      
      console.log(`[SELECT-RANDOM] Built available array with ${availableIndices.length} indices`);
      
      // Shuffle and take what we need
      const shuffled = secureShuffleArray(availableIndices);
      const selected = shuffled.slice(0, needed);
      
      for (const index of selected) {
        const ticketNumber = formatTicketNumber(index, numberStart, totalTickets);
        selectedTickets.push(ticketNumber);
        selectedIndexArray.push(index);
      }
    }

    console.log(`[SELECT-RANDOM] Selected ${selectedTickets.length} of ${quantity} requested`);

    const response: {
      selected: string[];
      indices: number[];
      requested: number;
      available: number;
      warning?: string;
    } = {
      selected: selectedTickets,
      indices: selectedIndexArray,
      requested: quantity,
      available: totalAvailable - exclude_numbers.length
    };

    if (selectedTickets.length < quantity) {
      response.warning = `Solo ${selectedTickets.length} boletos disponibles de los ${quantity} solicitados`;
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        } 
      }
    );

  } catch (error) {
    console.error('[SELECT-RANDOM] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
