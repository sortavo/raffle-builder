import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WinnerTicket {
  id: string;
  ticket_number: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
  ticket_index: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raffle_id } = await req.json();

    if (!raffle_id) {
      return new Response(
        JSON.stringify({ error: 'raffle_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[DRAW-RANDOM-WINNER] Selecting random winner for raffle ${raffle_id}`);

    // Get count of sold tickets first
    const { count: soldCount, error: countError } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('raffle_id', raffle_id)
      .eq('status', 'sold');

    if (countError) {
      console.error('[DRAW-RANDOM-WINNER] Error counting sold tickets:', countError);
      throw countError;
    }

    if (!soldCount || soldCount === 0) {
      console.log('[DRAW-RANDOM-WINNER] No sold tickets found');
      return new Response(
        JSON.stringify({ 
          error: 'No hay boletos vendidos para sortear',
          sold_count: 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DRAW-RANDOM-WINNER] Found ${soldCount} sold tickets`);

    // Generate cryptographically secure random offset
    // Using Web Crypto API for true randomness
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const randomOffset = randomBytes[0] % soldCount;

    console.log(`[DRAW-RANDOM-WINNER] Random offset: ${randomOffset} of ${soldCount}`);

    // Select winner using SQL ORDER BY with random offset
    // This efficiently selects a single random row from potentially millions
    const { data: winner, error: winnerError } = await supabase
      .from('tickets')
      .select('id, ticket_number, buyer_name, buyer_email, buyer_phone, buyer_city, ticket_index')
      .eq('raffle_id', raffle_id)
      .eq('status', 'sold')
      .order('ticket_index', { ascending: true })
      .range(randomOffset, randomOffset)
      .single();

    if (winnerError) {
      console.error('[DRAW-RANDOM-WINNER] Error selecting winner:', winnerError);
      
      // Fallback: If range fails, try with offset/limit pattern
      console.log('[DRAW-RANDOM-WINNER] Trying fallback method...');
      const { data: winnerFallback, error: fallbackError } = await supabase
        .from('tickets')
        .select('id, ticket_number, buyer_name, buyer_email, buyer_phone, buyer_city, ticket_index')
        .eq('raffle_id', raffle_id)
        .eq('status', 'sold')
        .order('created_at', { ascending: true })
        .range(randomOffset, randomOffset)
        .single();
      
      if (fallbackError) {
        console.error('[DRAW-RANDOM-WINNER] Fallback also failed:', fallbackError);
        throw fallbackError;
      }
      
      const typedWinner = winnerFallback as unknown as WinnerTicket;
      console.log(`[DRAW-RANDOM-WINNER] Winner selected via fallback: #${typedWinner.ticket_number}`);
      
      return new Response(
        JSON.stringify({
          winner: typedWinner,
          sold_count: soldCount,
          random_offset: randomOffset,
          method: 'secure_random_offset_fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const typedWinner = winner as unknown as WinnerTicket;
    console.log(`[DRAW-RANDOM-WINNER] Winner selected: #${typedWinner.ticket_number} - ${typedWinner.buyer_name}`);

    return new Response(
      JSON.stringify({
        winner: typedWinner,
        sold_count: soldCount,
        random_offset: randomOffset,
        method: 'secure_random_offset'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DRAW-RANDOM-WINNER] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
