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

  // Rate limit: 10 requests per minute per IP (strict for payment submissions)
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`payment-proof:${clientIP}`, 10, 60000);
  
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
    const { raffleId, referenceCode, publicUrl, buyerEmail } = await req.json();

    if (!raffleId || !referenceCode || !publicUrl) {
      console.error('Missing required fields:', { raffleId, referenceCode, publicUrl: !!publicUrl });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: raffleId, referenceCode, publicUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PAYMENT-PROOF] Processing for raffle ${raffleId}, reference ${referenceCode}, IP: ${clientIP}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify tickets exist for this reference code
    const { data: existingTickets, error: queryError } = await supabase
      .from('sold_tickets')
      .select('id, ticket_number, buyer_email, buyer_name, payment_proof_url')
      .eq('raffle_id', raffleId)
      .eq('payment_reference', referenceCode)
      .eq('status', 'reserved');

    if (queryError) {
      console.error('Error querying tickets:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al buscar boletos', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingTickets || existingTickets.length === 0) {
      console.warn('No reserved tickets found for reference:', referenceCode);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No se encontraron boletos reservados con esta clave',
          updatedCount: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optional: validate buyerEmail matches if provided
    if (buyerEmail) {
      const ticketEmail = existingTickets[0]?.buyer_email?.toLowerCase();
      if (ticketEmail && ticketEmail !== buyerEmail.toLowerCase()) {
        console.warn('Email mismatch:', { provided: buyerEmail, stored: ticketEmail });
      }
    }

    const hadPreviousProof = existingTickets.some(t => t.payment_proof_url);
    if (hadPreviousProof) {
      console.log('Replacing existing payment proof for reference:', referenceCode);
    }

    // Update all reserved tickets with this reference code
    const { data: updatedTickets, error: updateError } = await supabase
      .from('sold_tickets')
      .update({ payment_proof_url: publicUrl })
      .eq('raffle_id', raffleId)
      .eq('payment_reference', referenceCode)
      .eq('status', 'reserved')
      .select('id, ticket_number');

    if (updateError) {
      console.error('Error updating tickets:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update tickets', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedCount = updatedTickets?.length || 0;
    console.log(`[PAYMENT-PROOF] Updated ${updatedCount} tickets with payment proof`);

    // Notify the organizer
    if (updatedCount > 0) {
      const { data: raffle } = await supabase
        .from('raffles')
        .select('title, organization_id, created_by')
        .eq('id', raffleId)
        .single();

      if (raffle?.created_by && raffle?.organization_id) {
        const ticketNumbers = updatedTickets.map(t => t.ticket_number);
        const buyerName = existingTickets[0]?.buyer_name || 'Un comprador';

        await supabase.from('notifications').insert({
          user_id: raffle.created_by,
          organization_id: raffle.organization_id,
          type: 'payment_pending',
          title: hadPreviousProof ? 'Comprobante actualizado' : 'Nuevo comprobante de pago',
          message: `${buyerName} ha ${hadPreviousProof ? 'actualizado' : 'subido'} comprobante para los boletos ${ticketNumbers.join(', ')}`,
          link: `/dashboard/raffles/${raffleId}?tab=approvals`,
          metadata: {
            raffle_id: raffleId,
            ticket_numbers: ticketNumbers,
            buyer_name: buyerName,
            reference_code: referenceCode,
            replaced_previous: hadPreviousProof,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedCount,
        ticketNumbers: updatedTickets?.map(t => t.ticket_number) || [],
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
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
