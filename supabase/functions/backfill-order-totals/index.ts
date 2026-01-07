import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting backfill-order-totals job...');

    // Find all reserved tickets with missing order_total, grouped by payment_reference
    const { data: ticketsNeedingBackfill, error: fetchError } = await supabase
      .from('sold_tickets')
      .select('payment_reference, raffle_id, ticket_number')
      .eq('status', 'reserved')
      .is('order_total', null)
      .not('payment_reference', 'is', null);

    if (fetchError) {
      console.error('Error fetching tickets:', fetchError);
      throw fetchError;
    }

    if (!ticketsNeedingBackfill || ticketsNeedingBackfill.length === 0) {
      console.log('No tickets need backfill');
      return new Response(
        JSON.stringify({ success: true, message: 'No tickets need backfill', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group tickets by payment_reference
    const groupedByRef: Record<string, { raffle_id: string; count: number }> = {};
    for (const ticket of ticketsNeedingBackfill) {
      if (!ticket.payment_reference) continue;
      if (!groupedByRef[ticket.payment_reference]) {
        groupedByRef[ticket.payment_reference] = {
          raffle_id: ticket.raffle_id,
          count: 0,
        };
      }
      groupedByRef[ticket.payment_reference].count++;
    }

    console.log(`Found ${Object.keys(groupedByRef).length} groups needing backfill`);

    // Get unique raffle IDs
    const raffleIds = [...new Set(Object.values(groupedByRef).map(g => g.raffle_id))];

    // Fetch all packages for these raffles
    const { data: packages, error: packagesError } = await supabase
      .from('raffle_packages')
      .select('raffle_id, quantity, price')
      .in('raffle_id', raffleIds);

    if (packagesError) {
      console.error('Error fetching packages:', packagesError);
      throw packagesError;
    }

    // Create a map of raffle_id -> quantity -> price
    const packageMap: Record<string, Record<number, number>> = {};
    for (const pkg of packages || []) {
      if (!packageMap[pkg.raffle_id]) {
        packageMap[pkg.raffle_id] = {};
      }
      packageMap[pkg.raffle_id][pkg.quantity] = pkg.price;
    }

    // Fetch ticket prices for raffles (fallback when no package matches)
    const { data: raffles, error: rafflesError } = await supabase
      .from('raffles')
      .select('id, ticket_price')
      .in('id', raffleIds);

    if (rafflesError) {
      console.error('Error fetching raffles:', rafflesError);
      throw rafflesError;
    }

    const rafflePriceMap: Record<string, number> = {};
    for (const raffle of raffles || []) {
      rafflePriceMap[raffle.id] = raffle.ticket_price;
    }

    let totalUpdated = 0;
    const updates: { ref: string; total: number; count: number }[] = [];

    // Update each group
    for (const [paymentRef, group] of Object.entries(groupedByRef)) {
      const { raffle_id, count } = group;
      
      // Try to find matching package
      let orderTotal: number;
      const rafflePackages = packageMap[raffle_id] || {};
      
      if (rafflePackages[count]) {
        // Exact package match
        orderTotal = rafflePackages[count];
      } else {
        // Fallback to unit price * count
        const unitPrice = rafflePriceMap[raffle_id] || 0;
        orderTotal = unitPrice * count;
      }

      if (orderTotal > 0) {
        const { error: updateError, count: updatedCount } = await supabase
          .from('sold_tickets')
          .update({ order_total: orderTotal })
          .eq('payment_reference', paymentRef)
          .eq('status', 'reserved')
          .is('order_total', null);

        if (updateError) {
          console.error(`Error updating ${paymentRef}:`, updateError);
        } else {
          totalUpdated += updatedCount || 0;
          updates.push({ ref: paymentRef, total: orderTotal, count });
          console.log(`Updated ${paymentRef}: ${count} tickets -> $${orderTotal}`);
        }
      }
    }

    console.log(`Backfill complete. Updated ${totalUpdated} tickets in ${updates.length} groups`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${totalUpdated} tickets`,
        updates 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
