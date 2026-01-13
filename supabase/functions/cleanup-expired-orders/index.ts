// Cleanup Expired Orders Edge Function
// Removes expired reservations and old abandoned orders
// Recommended schedule: Every hour via cron job

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupResult {
  expiredReservations: number;
  oldCancelledOrders: number;
  oldPendingOrders: number;
  totalCleaned: number;
  executionTimeMs: number;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLEANUP-EXPIRED-ORDERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    logStep("Starting cleanup process");

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Clean up expired reservations (reserved_until < now)
    logStep("Cleaning expired reservations");
    const { data: expiredReservations, error: expiredError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        canceled_at: now,
      })
      .eq('status', 'reserved')
      .lt('reserved_until', now)
      .select('id');

    if (expiredError) {
      logStep("Error cleaning expired reservations", { error: expiredError.message });
    }

    const expiredCount = expiredReservations?.length || 0;
    logStep("Expired reservations cleaned", { count: expiredCount });

    // 2. Delete old cancelled orders (>7 days old)
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

    // 3. Delete very old pending orders that were never completed (>30 days)
    // These are likely abandoned checkouts that never got payment proof
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

    const executionTimeMs = Date.now() - startTime;
    const totalCleaned = expiredCount + oldCancelledCount + oldPendingCount;

    logStep("Cleanup completed", { 
      expiredReservations: expiredCount,
      oldCancelledOrders: oldCancelledCount,
      oldPendingOrders: oldPendingCount,
      totalCleaned,
      executionTimeMs,
    });

    const result: CleanupResult = {
      expiredReservations: expiredCount,
      oldCancelledOrders: oldCancelledCount,
      oldPendingOrders: oldPendingCount,
      totalCleaned,
      executionTimeMs,
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
