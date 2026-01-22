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

// Helper to expand ticket ranges into readable format
function formatTicketRanges(ranges: { s: number; e: number }[], luckyIndices: number[]): string[] {
  const result: string[] = [];
  
  for (const range of ranges || []) {
    if (range.s === range.e) {
      result.push(`#${range.s}`);
    } else {
      result.push(`#${range.s}-${range.e}`);
    }
  }
  
  for (const idx of luckyIndices || []) {
    result.push(`#${idx}★`);
  }
  
  return result;
}
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  // Rate limit: 5 requests per minute per IP (strict for payment submissions)
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`payment-proof:${clientIP}`, 5, 60000);
  
  if (!rateLimit.allowed) {
    console.warn(`[RATE-LIMIT] IP ${clientIP} exceeded limit for submit-payment-proof`);
    return new Response(
      JSON.stringify({ 
        success: false, 
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

    const { raffleId, referenceCode, publicUrl, buyerEmail } = body;

    if (!raffleId || !referenceCode || !publicUrl) {
      console.error('Missing required fields:', { raffleId, referenceCode, publicUrl: !!publicUrl });
      return corsJsonResponse(req, { success: false, error: 'Missing required fields: raffleId, referenceCode, publicUrl' }, 400);
    }

    console.log(`[PAYMENT-PROOF] Processing for raffle ${raffleId}, reference ${referenceCode}, IP: ${clientIP}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query the orders table (new compressed architecture)
    const { data: existingOrder, error: queryError } = await supabase
      .from('orders')
      .select('id, ticket_count, ticket_ranges, lucky_indices, buyer_email, buyer_name, payment_proof_url, order_total')
      .eq('raffle_id', raffleId)
      .eq('reference_code', referenceCode)
      .eq('status', 'reserved')
      .maybeSingle();

    if (queryError) {
      console.error('Error querying order:', queryError);
      return corsJsonResponse(req, { success: false, error: 'Error al buscar orden', details: queryError.message }, 500);
    }

    if (!existingOrder) {
      console.warn('No reserved order found for reference:', referenceCode);
      return corsJsonResponse(req, { 
        success: false, 
        error: 'No se encontró orden reservada con esta clave',
        updatedCount: 0 
      });
    }

    // Validate buyerEmail matches if provided (strict check)
    if (buyerEmail) {
      const orderEmail = existingOrder.buyer_email?.toLowerCase();
      if (orderEmail && orderEmail !== buyerEmail.toLowerCase()) {
        console.warn('Email mismatch:', { provided: buyerEmail, stored: orderEmail });
        return corsJsonResponse(req, { 
          success: false, 
          error: 'El email no coincide con la reservación' 
        }, 403);
      }
    }

    const hadPreviousProof = !!existingOrder.payment_proof_url;
    if (hadPreviousProof) {
      console.log('Replacing existing payment proof for reference:', referenceCode);
    }

    // Update the order with the payment proof
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_proof_url: publicUrl })
      .eq('id', existingOrder.id);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return corsJsonResponse(req, { success: false, error: 'Failed to update order', details: updateError.message }, 500);
    }

    const updatedCount = existingOrder.ticket_count || 1;
    console.log(`[PAYMENT-PROOF] Updated order with ${updatedCount} tickets with payment proof`);

    // Notify the organizer
    const { data: raffle } = await supabase
      .from('raffles')
      .select('title, organization_id, created_by, currency_code')
      .eq('id', raffleId)
      .single();

    if (raffle?.created_by && raffle?.organization_id) {
      const ticketDisplay = formatTicketRanges(
        existingOrder.ticket_ranges as { s: number; e: number }[] || [],
        existingOrder.lucky_indices as number[] || []
      );
      const buyerName = existingOrder.buyer_name || 'Un comprador';

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: raffle.created_by,
        organization_id: raffle.organization_id,
        type: 'payment_pending',
        title: hadPreviousProof ? 'Comprobante actualizado' : 'Nuevo comprobante de pago',
        message: `${buyerName} ha ${hadPreviousProof ? 'actualizado' : 'subido'} comprobante para ${updatedCount} boleto${updatedCount > 1 ? 's' : ''}: ${ticketDisplay.slice(0, 5).join(', ')}${ticketDisplay.length > 5 ? '...' : ''}`,
        link: `/dashboard/raffles/${raffleId}?tab=approvals`,
        metadata: {
          raffle_id: raffleId,
          ticket_count: updatedCount,
          ticket_ranges: existingOrder.ticket_ranges,
          buyer_name: buyerName,
          reference_code: referenceCode,
          replaced_previous: hadPreviousProof,
        },
      });

      // Send Telegram notification with approve/reject buttons (non-blocking)
      supabase.functions.invoke('telegram-notify', {
        body: {
          type: 'payment_proof_uploaded',
          organizationId: raffle.organization_id,
          data: {
            raffleName: raffle.title,
            buyerName: buyerName,
            ticketCount: updatedCount,
            reference: referenceCode,
            orderId: existingOrder.id,
            total: existingOrder.order_total || 0,
            currency: raffle.currency_code || 'MXN',
            paymentProofUrl: publicUrl,
          },
        },
      }).catch((err: Error) => console.error('[TELEGRAM] Error sending notification:', err));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedCount,
        ticketRanges: existingOrder.ticket_ranges,
        replacedPrevious: hadPreviousProof,
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        } 
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return corsJsonResponse(req, { success: false, error: 'Internal server error', details: message }, 500);
  }
});
