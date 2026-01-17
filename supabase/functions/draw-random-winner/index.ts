import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderData {
  id: string;
  ticket_count: number;
  ticket_ranges: { s: number; e: number }[];
  lucky_indices: number[];
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
}

interface WinnerTicket {
  id: string;
  ticket_number: string;
  ticket_index: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
}

// Expand a single order's ranges to get the ticket index at a specific position
function getTicketIndexAtPosition(order: OrderData, position: number): number {
  let accumulated = 0;
  
  // First check regular ranges
  for (const range of order.ticket_ranges || []) {
    const rangeSize = range.e - range.s + 1;
    if (accumulated + rangeSize > position) {
      return range.s + (position - accumulated);
    }
    accumulated += rangeSize;
  }
  
  // Then check lucky indices
  const luckyPosition = position - accumulated;
  if (order.lucky_indices && luckyPosition < order.lucky_indices.length) {
    return order.lucky_indices[luckyPosition];
  }
  
  throw new Error('Position out of bounds');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ========================================
    // AUTHENTICATION: Verify JWT
    // ========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[DRAW-RANDOM-WINNER] Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[DRAW-RANDOM-WINNER] Invalid token:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DRAW-RANDOM-WINNER] Authenticated user: ${user.id} (${user.email})`);

    // Parse request body
    const { raffle_id } = await req.json();

    if (!raffle_id) {
      return new Response(
        JSON.stringify({ error: 'raffle_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========================================
    // AUTHORIZATION: Verify user is owner/admin of the organization
    // ========================================
    
    // Get the raffle and its organization_id
    const { data: raffle, error: raffleError } = await supabase
      .from('raffles')
      .select('id, organization_id, numbering_config, total_tickets')
      .eq('id', raffle_id)
      .single();

    if (raffleError || !raffle) {
      console.error('[DRAW-RANDOM-WINNER] Raffle not found:', raffle_id);
      return new Response(
        JSON.stringify({ error: 'Raffle not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's role in the organization
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', raffle.organization_id)
      .single();

    if (roleError || !userRole) {
      console.error(`[DRAW-RANDOM-WINNER] User ${user.id} has no role in organization ${raffle.organization_id}`);
      return new Response(
        JSON.stringify({ error: 'You do not have access to this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only owners and admins can execute draws
    const allowedRoles = ['owner', 'admin'];
    if (!allowedRoles.includes(userRole.role)) {
      console.error(`[DRAW-RANDOM-WINNER] User ${user.id} has role '${userRole.role}', requires owner/admin`);
      return new Response(
        JSON.stringify({ error: 'Only organization owners and admins can draw winners' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DRAW-RANDOM-WINNER] Authorized: user ${user.id} with role '${userRole.role}' for raffle ${raffle_id}`);

    // ========================================
    // BUSINESS LOGIC: Select random winner
    // ========================================
    console.log(`[DRAW-RANDOM-WINNER] Selecting random winner for raffle ${raffle_id}`);

    // Get all sold orders with their ticket counts (from orders table)
    const { data: soldOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, ticket_count, ticket_ranges, lucky_indices, buyer_name, buyer_email, buyer_phone, buyer_city')
      .eq('raffle_id', raffle_id)
      .eq('status', 'sold')
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('[DRAW-RANDOM-WINNER] Error fetching orders:', ordersError);
      throw ordersError;
    }

    // Calculate total sold tickets
    const soldCount = soldOrders?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;

    if (soldCount === 0) {
      console.log('[DRAW-RANDOM-WINNER] No sold tickets found');
      return new Response(
        JSON.stringify({ 
          error: 'No hay boletos vendidos para sortear',
          sold_count: 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DRAW-RANDOM-WINNER] Found ${soldCount} sold tickets across ${soldOrders?.length} orders`);

    // Generate cryptographically secure random offset
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const randomOffset = randomBytes[0] % soldCount;

    console.log(`[DRAW-RANDOM-WINNER] Random offset: ${randomOffset} of ${soldCount}`);

    // Find the order and ticket at this offset
    let accumulatedCount = 0;
    let winnerOrder: OrderData | null = null;
    let positionInOrder = 0;

    for (const order of soldOrders || []) {
      const orderData = order as OrderData;
      if (accumulatedCount + orderData.ticket_count > randomOffset) {
        winnerOrder = orderData;
        positionInOrder = randomOffset - accumulatedCount;
        break;
      }
      accumulatedCount += orderData.ticket_count;
    }

    if (!winnerOrder) {
      throw new Error('Could not find winner order');
    }

    // Get the actual ticket index from the order's ranges
    const winnerTicketIndex = getTicketIndexAtPosition(winnerOrder, positionInOrder);

    // Format ticket number using the raffle's config
    const { data: formattedNumber } = await supabase.rpc('format_virtual_ticket', {
      p_index: winnerTicketIndex,
      p_config: raffle?.numbering_config || {},
      p_total: raffle?.total_tickets || 1000,
    });

    const ticketNumber = formattedNumber || String(winnerTicketIndex);

    const winner: WinnerTicket = {
      id: winnerOrder.id,
      ticket_number: ticketNumber,
      ticket_index: winnerTicketIndex,
      buyer_name: winnerOrder.buyer_name,
      buyer_email: winnerOrder.buyer_email,
      buyer_phone: winnerOrder.buyer_phone,
      buyer_city: winnerOrder.buyer_city,
    };

    console.log(`[DRAW-RANDOM-WINNER] Winner selected: #${ticketNumber} - ${winner.buyer_name} (by ${user.email})`);

    return new Response(
      JSON.stringify({
        winner,
        sold_count: soldCount,
        random_offset: randomOffset,
        method: 'secure_random_orders',
        executed_by: user.id
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
