// ============================================================================
// Cleanup Expired Orders Edge Function
// ============================================================================
// Removes expired reservations and old abandoned orders
// Uses optimized batch cleanup with auto-scaling and SKIP LOCKED
// Recommended schedule: Every 5-15 minutes via cron job

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { redisPipeline } from "../_shared/redis-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupResult {
  expiredTicketsReleased: number;
  batchesProcessed: number;
  affectedRaffles: number;
  oldCancelledOrders: number;
  oldPendingOrders: number;
  totalCleaned: number;
  executionTimeMs: number;
  autoScaled: boolean;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-EXPIRED-ORDERS] ${step}${detailsStr}`);
};

/**
 * Invalidate Redis cache for multiple raffles using pipeline
 * Much more efficient than individual DEL commands
 */
async function invalidateCachesForRaffles(
  redisUrl: string,
  redisToken: string,
  raffleIds: string[]
): Promise<void> {
  if (!raffleIds || raffleIds.length === 0) return;

  logStep('Invalidating Redis cache for affected raffles (pipeline)', { count: raffleIds.length });

  // Use pipeline for batch deletion
  const commands = raffleIds.map(id => ['DEL', `counts:${id}`]);
  const result = await redisPipeline(redisUrl, redisToken, commands);

  if (result.error) {
    logStep('Pipeline cache invalidation failed', { error: result.error });
  } else {
    logStep('Pipeline cache invalidation complete', { 
      raffleCount: raffleIds.length,
      results: result.results?.length || 0 
    });
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    logStep("Starting cleanup process with auto-scaling");

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // =========================================================================
    // 1. Clean up expired ticket reservations using optimized batch function
    //    WITH AUTO-SCALING based on queue depth
    // =========================================================================
    logStep("Cleaning expired ticket reservations (auto-scale mode)");

    const { data: ticketCleanupData, error: ticketCleanupError } = await supabase.rpc(
      'cleanup_expired_tickets_batch',
      { 
        p_batch_size: 500, 
        p_max_batches: 20,
        p_auto_scale: true  // Enable auto-scaling
      }
    );

    let expiredTicketsReleased = 0;
    let batchesProcessed = 0;
    let affectedRaffleIds: string[] = [];
    let autoScaled = false;
    
    interface ExpiredOrder {
      id: string;
      raffle_id: string;
      buyer_email: string | null;
      buyer_name: string | null;
      organization_id: string;
      ticket_count: number;
      raffles: { title: string }[] | null;
    }
    let expiredOrders: ExpiredOrder[] = [];

    if (ticketCleanupError) {
      logStep("Error in batch ticket cleanup", { error: ticketCleanupError.message });
      
      // Fallback to direct order update for expired reservations
      const { data: expiredReservations, error: expiredError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          canceled_at: now,
        })
        .eq('status', 'reserved')
        .lt('reserved_until', now)
        .select('id, raffle_id, buyer_email, buyer_name, organization_id, ticket_count, raffles(title)');

      if (!expiredError && expiredReservations) {
        expiredTicketsReleased = expiredReservations.length;
        affectedRaffleIds = [...new Set(expiredReservations.map(o => o.raffle_id))];
        expiredOrders = expiredReservations as unknown as ExpiredOrder[];
      }
    } else {
      const result = ticketCleanupData?.[0];
      expiredTicketsReleased = result?.total_released || 0;
      batchesProcessed = result?.batches_processed || 0;
      affectedRaffleIds = result?.affected_raffles || [];
      
      // Check if auto-scaling was triggered (batch size > default 500)
      autoScaled = batchesProcessed > 20 || expiredTicketsReleased > 10000;
      
      // Fetch expired orders for notifications if batch cleanup was used
      if (expiredTicketsReleased > 0 && affectedRaffleIds.length > 0) {
        const { data: recentExpired } = await supabase
          .from('orders')
          .select('id, raffle_id, buyer_email, buyer_name, organization_id, ticket_count, raffles(title)')
          .eq('status', 'cancelled')
          .gte('canceled_at', new Date(Date.now() - 60 * 1000).toISOString()) // Last minute
          .in('raffle_id', affectedRaffleIds)
          .limit(100);
        
        expiredOrders = (recentExpired || []) as unknown as ExpiredOrder[];
      }
      
      logStep("Expired ticket reservations cleaned", {
        released: expiredTicketsReleased,
        batches: batchesProcessed,
        raffles: affectedRaffleIds.length,
        autoScaled,
      });
    }

    // =========================================================================
    // 1b. Send Telegram notifications for expired reservations
    // =========================================================================
    if (expiredOrders.length > 0) {
      logStep("Sending reservation_expired notifications", { count: expiredOrders.length });
      
      // Group by organization to send batch notifications
      const byOrg = new Map<string, typeof expiredOrders>();
      for (const order of expiredOrders) {
        const orgOrders = byOrg.get(order.organization_id) || [];
        orgOrders.push(order);
        byOrg.set(order.organization_id, orgOrders);
      }

      // Send notifications per organization (non-blocking)
      for (const [orgId, orders] of byOrg) {
        const totalTickets = orders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
        const raffleData = orders[0]?.raffles as { title: string }[] | { title: string } | null;
        const raffleName = (Array.isArray(raffleData) ? raffleData[0]?.title : (raffleData as { title: string } | null)?.title) || 'Sorteo';
        
        supabase.functions.invoke('telegram-notify', {
          body: {
            type: 'reservation_expired',
            organizationId: orgId,
            data: {
              raffleName,
              expiredCount: orders.length,
              totalTickets,
              buyers: orders.slice(0, 5).map(o => o.buyer_name || 'Anónimo'),
            },
          },
        }).catch(err => logStep("Telegram notify error", { error: String(err) }));
      }
    }

    // Invalidate Redis cache for affected raffles using pipeline
    if (affectedRaffleIds.length > 0 && redisUrl && redisToken) {
      await invalidateCachesForRaffles(redisUrl, redisToken, affectedRaffleIds);
    }

    // =========================================================================
    // 2. Delete old cancelled orders (>7 days old)
    // =========================================================================
    logStep("Deleting old cancelled orders");
    const { data: oldCancelled, error: cancelledError } = await supabase
      .from('orders')
      .delete()
      .eq('status', 'cancelled')
      .lt('canceled_at', sevenDaysAgo)
      .select('id');

    if (cancelledError) {
      logStep("Error deleting old cancelled orders", { error: cancelledError.message });
    }

    const oldCancelledCount = oldCancelled?.length || 0;
    logStep("Old cancelled orders deleted", { count: oldCancelledCount });

    // =========================================================================
    // 3. Delete very old pending orders that were never completed (>30 days)
    // =========================================================================
    logStep("Deleting old abandoned pending orders");
    const { data: oldPending, error: pendingError } = await supabase
      .from('orders')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', thirtyDaysAgo)
      .is('payment_proof_url', null)
      .select('id');

    if (pendingError) {
      logStep("Error deleting old pending orders", { error: pendingError.message });
    }

    const oldPendingCount = oldPending?.length || 0;
    logStep("Old pending orders deleted", { count: oldPendingCount });

    // =========================================================================
    // Summary
    // =========================================================================
    const executionTimeMs = Date.now() - startTime;
    const totalCleaned = expiredTicketsReleased + oldCancelledCount + oldPendingCount;

    logStep("Cleanup completed", {
      expiredTicketsReleased,
      batchesProcessed,
      affectedRaffles: affectedRaffleIds.length,
      oldCancelledOrders: oldCancelledCount,
      oldPendingOrders: oldPendingCount,
      totalCleaned,
      executionTimeMs,
      autoScaled,
    });

    const result: CleanupResult = {
      expiredTicketsReleased,
      batchesProcessed,
      affectedRaffles: affectedRaffleIds.length,
      oldCancelledOrders: oldCancelledCount,
      oldPendingOrders: oldPendingCount,
      totalCleaned,
      executionTimeMs,
      autoScaled,
    };

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cleanup", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
