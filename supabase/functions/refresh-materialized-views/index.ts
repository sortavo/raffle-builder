/**
 * Phase 10: Refresh Materialized Views
 * Refreshes all analytics materialized views concurrently
 * Schedule: Every 5 minutes via cron
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Call the RPC function that refreshes all MVs
    const { data, error } = await supabase.rpc('refresh_all_materialized_views');

    if (error) {
      console.error('[refresh-materialized-views] RPC error:', error);
      throw error;
    }

    // Parse results
    const results = data as Array<{
      view_name: string;
      success: boolean;
      error_message: string | null;
    }>;

    const successCount = results.filter(r => r.success).length;
    const failedViews = results.filter(r => !r.success);

    if (failedViews.length > 0) {
      console.warn('[refresh-materialized-views] Some views failed to refresh:', failedViews);
    }

    console.log(`[refresh-materialized-views] Refreshed ${successCount}/${results.length} views in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        refreshed: successCount,
        total: results.length,
        results,
        runtimeMs: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[refresh-materialized-views] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        runtimeMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
