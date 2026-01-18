// ============================================================================
// Reserve Tickets V2 - Enterprise Scalability
// ============================================================================
// High-performance ticket reservation with:
// - Distributed rate limiting via Upstash Redis
// - Atomic O(k) reservations via atomic_reserve_tickets_v2 RPC
// - No global locks - enables parallel reservations
// - Automatic cache invalidation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

interface ReservationRequest {
  raffle_id: string;
  ticket_indices: number[];
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  buyer_city?: string;
  reservation_minutes?: number;
  order_total?: number;
  is_lucky_numbers?: boolean;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RESERVE-TICKETS-V2] ${step}${detailsStr}`);
};

/**
 * Rate limiting with Upstash Redis using INCR + EXPIRE pattern
 */
async function checkRateLimit(
  redisUrl: string,
  redisToken: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    // INCR the counter
    const incrResponse = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['INCR', key]),
    });

    const incrData = await incrResponse.json();
    const current = incrData.result || 0;

    if (current === 1) {
      // First request in window, set TTL
      await fetch(redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['EXPIRE', key, windowSeconds]),
      });
    }

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    return {
      allowed,
      remaining,
      retryAfter: allowed ? undefined : windowSeconds,
    };
  } catch (error) {
    logStep('Rate limit check failed, allowing request', { error: String(error) });
    // Fail open - allow request if Redis is unavailable
    return { allowed: true, remaining: limit };
  }
}

/**
 * Invalidate ticket counts cache for a raffle
 */
async function invalidateCountsCache(
  redisUrl: string,
  redisToken: string,
  raffleId: string
): Promise<void> {
  try {
    await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', `counts:${raffleId}`]),
    });
    logStep('Cache invalidated', { raffleId });
  } catch (error) {
    logStep('Cache invalidation failed', { raffleId, error: String(error) });
  }
}

/**
 * Get client IP from request headers
 */
function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    const clientIP = getClientIP(req);

    logStep('Reservation request received', { clientIP });

    // Rate limiting: 10 reservations per IP per minute
    if (redisUrl && redisToken) {
      const rateCheck = await checkRateLimit(
        redisUrl,
        redisToken,
        `ratelimit:reserve:${clientIP}`,
        10,  // 10 requests
        60   // per 60 seconds
      );

      if (!rateCheck.allowed) {
        logStep('Rate limit exceeded', { clientIP, remaining: rateCheck.remaining });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Demasiadas solicitudes. Por favor espera un momento.',
            retryAfter: rateCheck.retryAfter,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(rateCheck.retryAfter || 60),
              'X-RateLimit-Remaining': String(rateCheck.remaining),
            },
          }
        );
      }
    }

    // Parse request body
    const body: ReservationRequest = await req.json();
    const {
      raffle_id,
      ticket_indices,
      buyer_name,
      buyer_email,
      buyer_phone,
      buyer_city,
      reservation_minutes = 15,
      order_total,
      is_lucky_numbers = false,
    } = body;

    // Validate required fields
    if (!raffle_id || !ticket_indices || !Array.isArray(ticket_indices) || ticket_indices.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'raffle_id y ticket_indices son requeridos',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!buyer_name || !buyer_email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'buyer_name y buyer_email son requeridos',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit tickets per request to prevent abuse
    if (ticket_indices.length > 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Máximo 100 boletos por reservación. Para compras mayores, divide en múltiples solicitudes.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyer_email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Formato de email inválido',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Calling atomic_reserve_tickets_v2', {
      raffleId: raffle_id,
      ticketCount: ticket_indices.length,
      buyerEmail: buyer_email,
    });

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Call the optimized reservation function
    const { data, error } = await supabase.rpc('atomic_reserve_tickets_v2', {
      p_raffle_id: raffle_id,
      p_ticket_indices: ticket_indices,
      p_buyer_name: buyer_name,
      p_buyer_email: buyer_email,
      p_buyer_phone: buyer_phone || null,
      p_buyer_city: buyer_city || null,
      p_reservation_minutes: reservation_minutes,
      p_order_total: order_total || null,
      p_is_lucky_numbers: is_lucky_numbers,
    });

    if (error) {
      logStep('RPC error', { error: error.message, code: error.code });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al procesar la reservación. Por favor intenta de nuevo.',
          details: error.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data?.[0];
    const executionTimeMs = Date.now() - startTime;

    if (!result) {
      logStep('No result from RPC', { executionTimeMs });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Sin respuesta del servidor',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalidate cache on successful reservation
    if (result.success && redisUrl && redisToken) {
      await invalidateCountsCache(redisUrl, redisToken, raffle_id);
    }

    logStep('Reservation complete', {
      success: result.success,
      orderId: result.order_id,
      ticketCount: result.ticket_count,
      conflictCount: result.conflict_indices?.length || 0,
      executionTimeMs,
    });

    // Return appropriate response
    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          order_id: result.order_id,
          reference_code: result.reference_code,
          reserved_until: result.reserved_until,
          ticket_count: result.ticket_count,
          reserved_indices: result.reserved_indices,
          execution_time_ms: executionTimeMs,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error_message || 'Algunos boletos ya no están disponibles',
          conflict_indices: result.conflict_indices,
        }),
        {
          status: 409, // Conflict
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Unhandled error', { error: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
