import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    console.log("[REFRESH-STATS] Starting refresh cycle");

    // 1. Refresh materialized view
    const { data: refreshData, error: refreshError } = await supabase.rpc('refresh_raffle_stats');
    if (refreshError) {
      console.error("[REFRESH-STATS] MV refresh error:", refreshError);
    } else {
      console.log("[REFRESH-STATS] MV refreshed:", refreshData);
    }

    // 2. Cleanup expired reservations in batches
    const { data: cleanupData, error: cleanupError } = await supabase.rpc(
      'cleanup_expired_reservations_batch',
      { p_batch_size: 100, p_max_batches: 50 }
    );

    if (cleanupError) {
      console.error("[REFRESH-STATS] Cleanup error:", cleanupError);
    } else {
      const cleanup = cleanupData?.[0];
      console.log("[REFRESH-STATS] Cleanup completed:", cleanup);
      
      // Invalidate Redis cache for affected raffles if any tickets were freed
      if (cleanup?.total_released > 0) {
        const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
        const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
        
        if (redisUrl && redisToken) {
          try {
            // Delete all counts cache keys
            const keysResponse = await fetch(`${redisUrl}/keys/counts:*`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${redisToken}`,
              },
            });
            
            if (keysResponse.ok) {
              const keysData = await keysResponse.json();
              const keys = keysData.result || [];
              
              if (keys.length > 0) {
                // Delete each key
                for (const key of keys) {
                  await fetch(`${redisUrl}/del/${key}`, {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${redisToken}`,
                    },
                  });
                }
                console.log(`[REFRESH-STATS] Invalidated ${keys.length} Redis cache keys`);
              }
            }
          } catch (e) {
            console.error("[REFRESH-STATS] Redis invalidation error:", e);
          }
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      mvRefreshed: !refreshError,
      cleanup: cleanupData?.[0] || null,
      executionTimeMs,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[REFRESH-STATS] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
