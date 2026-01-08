import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * DEPRECATED: This function was used to backfill order_total for legacy sold_tickets.
 * 
 * With the migration to the orders table, order_total is now calculated and stored
 * at reservation time directly in the orders table.
 * 
 * This function is kept for backward compatibility but should not be called anymore.
 * It will return a deprecation notice.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[DEPRECATED] backfill-order-totals called - this function is no longer needed');

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'This function is deprecated. order_total is now stored directly in the orders table at reservation time.',
      deprecated: true,
      updated: 0 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
