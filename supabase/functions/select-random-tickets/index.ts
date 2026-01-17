import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

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

// Format ticket number based on raffle config (supports step for non-sequential numbering)
function formatTicketNumber(index: number, numberStart: number, step: number, totalTickets: number): string {
  const ticketNum = numberStart + (index * step);
  const maxTicketNum = numberStart + ((totalTickets - 1) * step);
  const digits = Math.max(String(maxTicketNum).length, 1);
  return String(ticketNum).padStart(digits, '0');
}

// Expand order ranges/indices to a set of ticket indices
function expandOrderToIndices(order: { ticket_ranges: { s: number; e: number }[]; lucky_indices?: number[] }): number[] {
  const indices: number[] = [];
  
  for (const range of order.ticket_ranges || []) {
    for (let i = range.s; i <= range.e; i++) {
      indices.push(i);
    }
  }
  
  if (order.lucky_indices) {
    indices.push(...order.lucky_indices);
  }
  
  return indices;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

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
    // Parse body with try-catch
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return corsJsonResponse(req, { error: 'Invalid JSON body' }, 400);
    }

    const { raffle_id, quantity, exclude_numbers = [] } = body;

    if (!raffle_id || !quantity) {
      return corsJsonResponse(req, { error: 'raffle_id and quantity are required' }, 400);
    }

    const MAX_TICKETS = 100000;
    if (quantity > MAX_TICKETS) {
      return corsJsonResponse(req, { error: `Máximo ${MAX_TICKETS.toLocaleString()} boletos por solicitud` }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[SELECT-RANDOM] IP: ${clientIP}, Selecting ${quantity} random tickets for raffle ${raffle_id}`);

    // 1. Get raffle config for total tickets and numbering - also check status
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('total_tickets, numbering_config, status')
      .eq('id', raffle_id)
      .single();

    if (raffleError || !raffle) {
      console.error('[SELECT-RANDOM] Raffle not found:', raffleError);
      return corsJsonResponse(req, { error: 'Rifa no encontrada' }, 404);
    }

    // Only allow for active raffles (public access)
    if (raffle.status !== 'active') {
      console.warn(`[SELECT-RANDOM] Raffle ${raffle_id} is not active (status: ${raffle.status})`);
      return corsJsonResponse(req, { error: 'Esta rifa no está activa' }, 403);
    }

    const totalTickets = raffle.total_tickets;
    const numberingConfig = raffle.numbering_config as { start_number?: number; step?: number } | null;
    const numberStart = numberingConfig?.start_number ?? 1;
    const numberStep = numberingConfig?.step ?? 1;
    
    console.log(`[SELECT-RANDOM] Total tickets: ${totalTickets}, Number start: ${numberStart}, Step: ${numberStep}`);

    // 2. Try to use optimized blocks first, fall back to order expansion
    let unavailableSet = new Set<number>();
    
    // Check if blocks are available for this raffle
    const { data: blocks, error: blocksError } = await supabase
      .from('ticket_block_status')
      .select('block_start, sold_count, reserved_count')
      .eq('raffle_id', raffle_id);

    if (!blocksError && blocks && blocks.length > 0) {
      // Use blocks - much faster for mega raffles
      console.log(`[SELECT-RANDOM] Using block-based selection (${blocks.length} blocks)`);
      
      // Only fetch orders from blocks that have sold/reserved tickets
      const occupiedBlocks = blocks.filter(b => b.sold_count > 0 || b.reserved_count > 0);
      
      if (occupiedBlocks.length > 0) {
        // Fetch unavailable indices only from occupied blocks
        const nowIso = new Date().toISOString();
        
        for (const block of occupiedBlocks) {
          const blockEnd = block.block_start + 1000;
          
          // Get orders that might have tickets in this block
          const { data: orders } = await supabase
            .from('orders')
            .select('ticket_ranges, lucky_indices, status, reserved_until')
            .eq('raffle_id', raffle_id)
            .in('status', ['sold', 'reserved']);
          
          for (const order of orders || []) {
            if (order.status === 'reserved' && order.reserved_until && order.reserved_until < nowIso) {
              continue; // Expired reservation
            }
            
            const indices = expandOrderToIndices(order);
            for (const idx of indices) {
              if (idx >= block.block_start && idx < blockEnd) {
                unavailableSet.add(idx);
              }
            }
          }
        }
      }
      
      console.log(`[SELECT-RANDOM] Blocks: ${blocks.length}, Unavailable from blocks: ${unavailableSet.size}`);
    } else {
      // Fallback: Fetch ALL unavailable ticket indices from orders table
      console.log('[SELECT-RANDOM] Falling back to full order scan');
      
      const nowIso = new Date().toISOString();
      const PAGE_SIZE = 1000;

      const fetchAllOrderIndices = async (status: 'sold' | 'reserved'): Promise<number[]> => {
        const indices: number[] = [];
        let from = 0;

        while (true) {
          let q = supabase
            .from('orders')
            .select('ticket_ranges, lucky_indices, reserved_until')
            .eq('raffle_id', raffle_id)
            .eq('status', status)
            .range(from, from + PAGE_SIZE - 1);

          if (status === 'reserved') {
            q = q.gt('reserved_until', nowIso);
          }

          const { data, error } = await q;
          if (error) throw error;

          const batch = (data || []) as { ticket_ranges: { s: number; e: number }[]; lucky_indices?: number[] }[];
          if (batch.length === 0) break;

          for (const order of batch) {
            const orderIndices = expandOrderToIndices(order);
            indices.push(...orderIndices);
          }

          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        return indices;
      };

      const [soldIndices, reservedActiveIndices] = await Promise.all([
        fetchAllOrderIndices('sold'),
        fetchAllOrderIndices('reserved'),
      ]);

      unavailableSet = new Set<number>([...soldIndices, ...reservedActiveIndices]);
    }

    // Also exclude numbers already in exclude_numbers (convert to indices)
    const excludeSet = new Set<string>(exclude_numbers);
    
    // Calculate available count
    const unavailableCount = unavailableSet.size;
    const totalAvailable = totalTickets - unavailableCount;
    
    console.log(`[SELECT-RANDOM] Unavailable: ${unavailableCount}, Available: ${totalAvailable}`);

    if (totalAvailable === 0) {
      return corsJsonResponse(req, { 
        error: 'No hay boletos disponibles', 
        selected: [],
        requested: quantity,
        available: 0
      });
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
        const ticketNumber = formatTicketNumber(randomIndex, numberStart, numberStep, totalTickets);
        
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
          const ticketNumber = formatTicketNumber(i, numberStart, numberStep, totalTickets);
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
        const ticketNumber = formatTicketNumber(index, numberStart, numberStep, totalTickets);
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
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
