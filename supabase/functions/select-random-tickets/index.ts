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
// ============================================

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

    // Get total count of available tickets
    const { count: totalAvailable, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('raffle_id', raffle_id)
      .eq('status', 'available');

    if (countError) {
      console.error('[SELECT-RANDOM] Error counting tickets:', countError);
      throw countError;
    }

    if (!totalAvailable || totalAvailable === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No available tickets found', 
          selected: [],
          requested: quantity,
          available: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SELECT-RANDOM] Total available: ${totalAvailable}`);

    const excludeSet = new Set(exclude_numbers);
    const selectedTickets: string[] = [];
    const maxAttempts = quantity * 3;
    let attempts = 0;

    const useOffsetMethod = quantity <= 1000 && totalAvailable > 10000;

    if (useOffsetMethod) {
      while (selectedTickets.length < quantity && attempts < maxAttempts) {
        const randomBytes = new Uint32Array(1);
        crypto.getRandomValues(randomBytes);
        const randomOffset = randomBytes[0] % totalAvailable;

        const { data: ticket, error } = await supabase
          .from('tickets')
          .select('ticket_number')
          .eq('raffle_id', raffle_id)
          .eq('status', 'available')
          .order('ticket_index', { ascending: true })
          .range(randomOffset, randomOffset)
          .single();

        attempts++;
        if (error || !ticket) continue;

        const ticketNum = ticket.ticket_number;
        if (excludeSet.has(ticketNum) || selectedTickets.includes(ticketNum)) continue;

        selectedTickets.push(ticketNum);
      }
    } else {
      const batchSize = Math.min(quantity * 2 + exclude_numbers.length, 50000);
      const randomBytes = new Uint32Array(1);
      crypto.getRandomValues(randomBytes);
      const startOffset = totalAvailable > batchSize 
        ? randomBytes[0] % (totalAvailable - batchSize) 
        : 0;

      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('raffle_id', raffle_id)
        .eq('status', 'available')
        .order('ticket_index', { ascending: true })
        .range(startOffset, startOffset + batchSize - 1);

      if (error) throw error;

      if (tickets && tickets.length > 0) {
        const filtered = tickets.filter(t => !excludeSet.has(t.ticket_number));
        
        // Fisher-Yates shuffle
        for (let i = filtered.length - 1; i > 0; i--) {
          const randomBytes = new Uint32Array(1);
          crypto.getRandomValues(randomBytes);
          const j = randomBytes[0] % (i + 1);
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        
        const needed = Math.min(quantity, filtered.length);
        for (let i = 0; i < needed; i++) {
          selectedTickets.push(filtered[i].ticket_number);
        }
      }
    }

    console.log(`[SELECT-RANDOM] Selected ${selectedTickets.length} of ${quantity} requested`);

    const response: {
      selected: string[];
      requested: number;
      available: number;
      warning?: string;
    } = {
      selected: selectedTickets,
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
