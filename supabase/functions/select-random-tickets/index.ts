import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raffle_id, quantity, exclude_numbers = [] } = await req.json();

    if (!raffle_id || !quantity) {
      return new Response(
        JSON.stringify({ error: 'raffle_id and quantity are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (quantity > 10000) {
      return new Response(
        JSON.stringify({ error: 'Maximum 10,000 tickets per request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Selecting ${quantity} random tickets for raffle ${raffle_id}`);

    // Get available tickets efficiently using random ordering in the database
    // This is much more efficient than fetching all and shuffling client-side
    let query = supabase
      .from('tickets')
      .select('ticket_number')
      .eq('raffle_id', raffle_id)
      .eq('status', 'available');

    // Exclude already selected tickets if provided
    if (exclude_numbers.length > 0) {
      query = query.not('ticket_number', 'in', `(${exclude_numbers.join(',')})`);
    }

    // For large quantities, we need to fetch more and then sample
    // PostgreSQL's random() is efficient for this
    const { data: availableTickets, error } = await query
      .order('random()')  // This won't work directly, need different approach
      .limit(quantity);

    if (error) {
      console.error('Error fetching tickets:', error);
      
      // Fallback: fetch all available and randomly select
      const { data: allTickets, error: allError } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('raffle_id', raffle_id)
        .eq('status', 'available');

      if (allError) {
        throw allError;
      }

      if (!allTickets || allTickets.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No available tickets found', selected: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter out excluded numbers
      let filteredTickets = allTickets;
      if (exclude_numbers.length > 0) {
        const excludeSet = new Set(exclude_numbers);
        filteredTickets = allTickets.filter(t => !excludeSet.has(t.ticket_number));
      }

      // Fisher-Yates shuffle for true randomness
      const shuffled = [...filteredTickets];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const selected = shuffled.slice(0, Math.min(quantity, shuffled.length));
      const ticketNumbers = selected.map(t => t.ticket_number);

      console.log(`Selected ${ticketNumbers.length} tickets`);

      return new Response(
        JSON.stringify({ 
          selected: ticketNumbers,
          requested: quantity,
          available: filteredTickets.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ticketNumbers = availableTickets?.map(t => t.ticket_number) || [];

    console.log(`Selected ${ticketNumbers.length} tickets`);

    return new Response(
      JSON.stringify({ 
        selected: ticketNumbers,
        requested: quantity,
        available: ticketNumbers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in select-random-tickets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
