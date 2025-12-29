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

    // Maximum limit to prevent memory issues - 100,000 tickets per request
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

    console.log(`[SELECT-RANDOM] Selecting ${quantity} random tickets for raffle ${raffle_id}`);
    console.log(`[SELECT-RANDOM] Excluding ${exclude_numbers.length} numbers`);

    // First, get total count of available tickets (excluding the ones already selected)
    let countQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('raffle_id', raffle_id)
      .eq('status', 'available');
    
    // Note: We can't efficiently exclude in the count query, so we'll handle it below
    const { count: totalAvailable, error: countError } = await countQuery;

    if (countError) {
      console.error('[SELECT-RANDOM] Error counting tickets:', countError);
      throw countError;
    }

    if (!totalAvailable || totalAvailable === 0) {
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

    console.log(`[SELECT-RANDOM] Total available tickets: ${totalAvailable}`);

    // Strategy: Use random offset sampling for efficiency with large datasets
    // Generate multiple random offsets and fetch one ticket at each offset
    const excludeSet = new Set(exclude_numbers);
    const selectedTickets: string[] = [];
    const maxAttempts = quantity * 3; // Allow retries for excluded numbers
    let attempts = 0;

    // For small quantities relative to total, use random offset method
    // For larger quantities, fetch a batch and shuffle
    const useOffsetMethod = quantity <= 1000 && totalAvailable > 10000;

    if (useOffsetMethod) {
      console.log(`[SELECT-RANDOM] Using random offset method for ${quantity} tickets`);
      
      while (selectedTickets.length < quantity && attempts < maxAttempts) {
        // Generate cryptographically secure random offset
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
        
        // Skip if excluded or already selected
        if (excludeSet.has(ticketNum) || selectedTickets.includes(ticketNum)) {
          continue;
        }

        selectedTickets.push(ticketNum);
      }
    } else {
      console.log(`[SELECT-RANDOM] Using batch shuffle method for ${quantity} tickets`);
      
      // For larger quantities, fetch more tickets and shuffle client-side
      // But use random starting offset to ensure we're sampling from the whole pool
      const batchSize = Math.min(quantity * 2 + exclude_numbers.length, 50000);
      
      // Generate random starting offset for variety
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

      if (error) {
        console.error('[SELECT-RANDOM] Error fetching batch:', error);
        throw error;
      }

      if (tickets && tickets.length > 0) {
        // Filter out excluded
        const filtered = tickets.filter(t => !excludeSet.has(t.ticket_number));
        
        // Fisher-Yates shuffle for true randomness
        for (let i = filtered.length - 1; i > 0; i--) {
          const randomBytes = new Uint32Array(1);
          crypto.getRandomValues(randomBytes);
          const j = randomBytes[0] % (i + 1);
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        
        // Take what we need
        const needed = Math.min(quantity, filtered.length);
        for (let i = 0; i < needed; i++) {
          selectedTickets.push(filtered[i].ticket_number);
        }
      }
    }

    console.log(`[SELECT-RANDOM] Selected ${selectedTickets.length} of ${quantity} requested tickets`);

    // Build response
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

    // Add warning if we couldn't fulfill the full request
    if (selectedTickets.length < quantity) {
      response.warning = `Solo ${selectedTickets.length} boletos disponibles de los ${quantity} solicitados`;
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
