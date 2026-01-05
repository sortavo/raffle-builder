import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GENERATE-TICKETS] ${step}${detailsStr}`);
};

const BATCH_SIZE = 10000; // Standard batch size for all operations

interface NumberingConfig {
  mode: 'sequential' | 'random_permutation' | 'custom_list' | 'template';
  start_number: number;
  step: number;
  pad_enabled: boolean;
  pad_width: number | null;
  pad_char: string;
  prefix: string | null;
  suffix: string | null;
  separator: string;
  range_end: number | null;
  custom_numbers: string[] | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { auth: { persistSession: false } }
    );

    const url = new URL(req.url);
    const jobIdParam = url.searchParams.get("job_id");

    // If job_id is provided, return job status
    if (jobIdParam) {
      logStep("Fetching job status", { job_id: jobIdParam });
      const { data: job, error: jobError } = await supabaseClient
        .from("ticket_generation_jobs")
        .select("*")
        .eq("id", jobIdParam)
        .single();

      if (jobError) throw jobError;
      if (!job) throw new Error("Job not found");

      const progress = job.total_tickets > 0 
        ? Math.round((job.generated_count / job.total_tickets) * 100) 
        : 0;

      const estimatedTimeRemaining = job.status === 'running' && job.generated_count > 0
        ? Math.round(((job.total_tickets - job.generated_count) / job.generated_count) * 
            ((Date.now() - new Date(job.started_at).getTime()) / 1000))
        : null;

      return new Response(
        JSON.stringify({ 
          ...job, 
          progress,
          estimated_time_remaining: estimatedTimeRemaining
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Parse request body for new job
    const { raffle_id, force_rebuild = false } = await req.json();
    if (!raffle_id) throw new Error("raffle_id is required");
    logStep("Processing raffle", { raffle_id, force_rebuild });

    // Get raffle details including new numbering_config
    const { data: raffle, error: raffleError } = await supabaseClient
      .from("raffles")
      .select("*")
      .eq("id", raffle_id)
      .single();

    if (raffleError) throw raffleError;
    if (!raffle) throw new Error("Raffle not found");

    const totalTickets = raffle.total_tickets;
    const legacyFormat = raffle.ticket_number_format || "sequential";
    
    // Get numbering config (new system) or build from legacy format
    let numberingConfig: NumberingConfig = raffle.numbering_config || buildLegacyConfig(legacyFormat, totalTickets);

    logStep("Raffle found", { 
      total_tickets: totalTickets, 
      mode: numberingConfig.mode,
      legacy_format: legacyFormat 
    });

    // Check existing tickets
    const { count: existingCount, error: countError } = await supabaseClient
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("raffle_id", raffle_id);

    if (countError) throw countError;

    logStep("Existing tickets count", { existingCount, totalTickets, force_rebuild });

    // FORCE REBUILD: Delete existing tickets and regenerate from scratch
    if (force_rebuild && existingCount && existingCount > 0) {
      logStep("FORCE REBUILD: Deleting existing tickets", { count: existingCount });
      
      // Cancel any existing jobs
      await supabaseClient
        .from("ticket_generation_jobs")
        .update({ 
          status: 'cancelled', 
          error_message: 'Cancelled for force rebuild',
          completed_at: new Date().toISOString() 
        })
        .eq("raffle_id", raffle_id)
        .in("status", ["pending", "running"]);

      // Delete all tickets for this raffle
      const { error: deleteError } = await supabaseClient
        .from("tickets")
        .delete()
        .eq("raffle_id", raffle_id);

      if (deleteError) {
        logStep("Error deleting tickets", { error: deleteError.message });
        throw new Error(`Failed to delete existing tickets: ${deleteError.message}`);
      }

      logStep("Deleted all existing tickets, starting fresh generation");
    }

    // Re-check count after potential deletion
    const { count: currentCount } = await supabaseClient
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("raffle_id", raffle_id);

    const actualExistingCount = currentCount ?? 0;

    // If tickets already exist and match total_tickets, we're done
    if (actualExistingCount === totalTickets) {
      logStep("Tickets already match total_tickets", { count: actualExistingCount });
      return new Response(
        JSON.stringify({ success: true, message: "Tickets already generated correctly", count: actualExistingCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check for existing running job
    const { data: existingJob } = await supabaseClient
      .from("ticket_generation_jobs")
      .select("id, status, generated_count")
      .eq("raffle_id", raffle_id)
      .in("status", ["pending", "running"])
      .maybeSingle();

    if (existingJob) {
      logStep("Job already in progress", { job_id: existingJob.id, status: existingJob.status });
      return new Response(
        JSON.stringify({ 
          success: true, 
          job_id: existingJob.id, 
          message: "Job already in progress",
          status: existingJob.status,
          generated_count: existingJob.generated_count
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // SCENARIO: Need to modify existing tickets
    if (actualExistingCount > 0 && actualExistingCount !== totalTickets) {
      
      // CASE 1: User wants MORE tickets (INCREMENT MODE)
      if (totalTickets > actualExistingCount) {
        logStep("INCREMENT MODE - Adding new tickets", { 
          existingCount: actualExistingCount, 
          totalTickets, 
          ticketsToAdd: totalTickets - actualExistingCount 
        });
        
        // Use append_ticket_batch RPC to add new tickets without touching existing ones
        const { data: appendCount, error: appendError } = await supabaseClient.rpc(
          'append_ticket_batch',
          {
            p_raffle_id: raffle_id,
            p_existing_count: actualExistingCount,
            p_new_total: totalTickets,
            p_numbering_config: numberingConfig
          }
        );

        if (appendError) {
          logStep("Append tickets error", { error: appendError.message });
          throw appendError;
        }

        logStep("Append tickets complete", { newTicketsAdded: appendCount, total: totalTickets });
        return new Response(
          JSON.stringify({ 
            success: true, 
            count: appendCount, 
            mode: 'append',
            existingCount: actualExistingCount,
            totalTickets,
            message: `Se agregaron ${appendCount} boletos nuevos` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      
      // CASE 2: User wants FEWER tickets (NOT ALLOWED when tickets exist)
      if (totalTickets < actualExistingCount) {
        logStep("Cannot reduce tickets - already generated", { existingCount: actualExistingCount, requestedTotal: totalTickets });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `No se puede reducir la cantidad de boletos. Actualmente hay ${actualExistingCount} boletos generados. Usa force_rebuild=true para regenerar.`,
            existingCount: actualExistingCount,
            requestedTotal: totalTickets
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    // Calculate batches
    const totalBatches = Math.ceil(totalTickets / BATCH_SIZE);

    // For small raffles (<= BATCH_SIZE), use synchronous generation
    if (totalTickets <= BATCH_SIZE) {
      logStep("Small raffle - using synchronous generation", { totalTickets, mode: numberingConfig.mode });
      
      // Use new v2 function with numbering config
      const { data: count, error: genError } = await supabaseClient.rpc(
        'generate_ticket_batch_v2',
        {
          p_raffle_id: raffle_id,
          p_start_index: 1,
          p_end_index: totalTickets,
          p_numbering_config: numberingConfig
        }
      );

      if (genError) {
        logStep("V2 function failed, trying legacy", { error: genError.message });
        // Fallback to legacy function
        const { data: legacyCount, error: legacyError } = await supabaseClient.rpc(
          'generate_ticket_batch',
          {
            p_raffle_id: raffle_id,
            p_start_number: 1,
            p_end_number: totalTickets,
            p_format: legacyFormat,
            p_prefix: legacyFormat === 'prefixed' ? 'TKT' : null
          }
        );
        
        if (legacyError) throw legacyError;
        
        logStep("Legacy generation complete", { count: legacyCount });
        return new Response(
          JSON.stringify({ success: true, count: legacyCount, async: false, legacy: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Apply random permutation if mode is random_permutation
      if (numberingConfig.mode === 'random_permutation') {
        logStep("Applying random permutation");
        const { error: permError } = await supabaseClient.rpc(
          'apply_random_permutation',
          { p_raffle_id: raffle_id, p_numbering_config: numberingConfig }
        );
        if (permError) {
          logStep("Random permutation error", { error: permError.message });
        }
      }

      // Apply custom numbers if mode is custom_list
      if (numberingConfig.mode === 'custom_list') {
        logStep("Applying custom number list");
        const { error: customError } = await supabaseClient.rpc(
          'apply_custom_numbers',
          { p_raffle_id: raffle_id }
        );
        if (customError) {
          logStep("Custom numbers error", { error: customError.message });
        }
      }

      logStep("Synchronous generation complete", { count });
      return new Response(
        JSON.stringify({ success: true, count, async: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // For large raffles, create async job with status 'pending'
    // The cron job (process-ticket-batch) will handle the actual generation
    logStep("Large raffle - creating async job", { totalTickets, totalBatches, batchSize: BATCH_SIZE });

    const { data: job, error: jobError } = await supabaseClient
      .from("ticket_generation_jobs")
      .insert({
        raffle_id,
        total_tickets: totalTickets,
        total_batches: totalBatches,
        batch_size: BATCH_SIZE,
        ticket_format: numberingConfig.mode,
        ticket_prefix: numberingConfig.prefix,
        status: 'pending', // Start as pending, cron will pick it up
        generated_count: 0,
        current_batch: 0
      })
      .select()
      .single();

    if (jobError) throw jobError;

    logStep("Job created successfully", { 
      job_id: job.id, 
      total_tickets: totalTickets,
      total_batches: totalBatches,
      batch_size: BATCH_SIZE
    });

    // Return immediately with job ID (202 Accepted)
    // The cron job will process this in the background
    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id: job.id, 
        async: true,
        message: "Ticket generation job created. Processing will begin shortly.",
        total_tickets: totalTickets,
        total_batches: totalBatches,
        batch_size: BATCH_SIZE,
        estimated_time_seconds: Math.ceil(totalBatches * 2) // ~2 seconds per batch estimate
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Build config from legacy format for backwards compatibility
function buildLegacyConfig(format: string, totalTickets: number): NumberingConfig {
  const digits = Math.max(3, totalTickets.toString().length);
  
  return {
    mode: format === 'random' ? 'random_permutation' : 'sequential',
    start_number: 1,
    step: 1,
    pad_enabled: true,
    pad_width: digits,
    pad_char: '0',
    prefix: format === 'prefixed' ? 'TKT' : null,
    suffix: null,
    separator: format === 'prefixed' ? '-' : '',
    range_end: null,
    custom_numbers: null
  };
}
