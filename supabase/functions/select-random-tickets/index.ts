import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fisher-Yates shuffle for true randomness
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

    console.log(`[SELECT-RANDOM] Selecting ${quantity} random tickets for raffle ${raffle_id}`);
    console.log(`[SELECT-RANDOM] Excluding ${exclude_numbers.length} numbers`);

    // Calculate appropriate limit based on quantity requested
    // We need to fetch enough tickets to have a good pool for random selection
    const fetchLimit = Math.max(quantity * 2, 10000);

    // Fetch available tickets with explicit limit
    const { data: allTickets, error } = await supabase
      .from('tickets')
      .select('ticket_number')
      .eq('raffle_id', raffle_id)
      .eq('status', 'available')
      .limit(fetchLimit);

    if (error) {
      console.error('[SELECT-RANDOM] Error fetching tickets:', error);
      throw error;
    }

    if (!allTickets || allTickets.length === 0) {
      console.log('[SELECT-RANDOM] No available tickets found');
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

    console.log(`[SELECT-RANDOM] Fetched ${allTickets.length} available tickets`);

    // Filter out excluded numbers if provided
    let filteredTickets = allTickets;
    if (exclude_numbers.length > 0) {
      const excludeSet = new Set(exclude_numbers);
      filteredTickets = allTickets.filter(t => !excludeSet.has(t.ticket_number));
      console.log(`[SELECT-RANDOM] After excluding: ${filteredTickets.length} tickets`);
    }

    // Check if we have enough tickets
    if (filteredTickets.length === 0) {
      console.log('[SELECT-RANDOM] No tickets available after filtering');
      return new Response(
        JSON.stringify({ 
          selected: [],
          requested: quantity,
          available: 0,
          warning: 'No hay boletos disponibles después de excluir los ya seleccionados'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Shuffle the tickets using Fisher-Yates
    const shuffled = shuffleArray(filteredTickets);

    // Select the requested quantity (or all available if less)
    const selectCount = Math.min(quantity, shuffled.length);
    const selected = shuffled.slice(0, selectCount);
    const ticketNumbers = selected.map(t => t.ticket_number);

    console.log(`[SELECT-RANDOM] Selected ${ticketNumbers.length} of ${quantity} requested tickets`);

    // Build response
    const response: {
      selected: string[];
      requested: number;
      available: number;
      warning?: string;
    } = {
      selected: ticketNumbers,
      requested: quantity,
      available: filteredTickets.length
    };

    // Add warning if we couldn't fulfill the full request
    if (ticketNumbers.length < quantity) {
      response.warning = `Solo ${ticketNumbers.length} boletos disponibles de los ${quantity} solicitados`;
      console.log(`[SELECT-RANDOM] Warning: ${response.warning}`);
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
