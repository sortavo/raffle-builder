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

const BATCH_SIZE = 50000; // Optimal batch size for PostgreSQL

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
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

    // Get raffle details
    const { data: raffle, error: raffleError } = await supabaseClient
      .from("raffles")
      .select("*")
      .eq("id", raffle_id)
      .single();

    if (raffleError) throw raffleError;
    if (!raffle) throw new Error("Raffle not found");

    const totalTickets = raffle.total_tickets;
    const format = raffle.ticket_number_format || "sequential";

    logStep("Raffle found", { total_tickets: totalTickets, format });

    // Check existing tickets
    const { count: existingCount, error: countError } = await supabaseClient
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("raffle_id", raffle_id);

    if (countError) throw countError;

    logStep("Existing tickets count", { existingCount, totalTickets });

    // If tickets already exist and match total_tickets, we're done
    if (existingCount && existingCount === totalTickets) {
      logStep("Tickets already match total_tickets", { count: existingCount });
      return new Response(
        JSON.stringify({ success: true, message: "Tickets already generated correctly", count: existingCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check for existing running job
    const { data: existingJob } = await supabaseClient
      .from("ticket_generation_jobs")
      .select("id, status")
      .eq("raffle_id", raffle_id)
      .in("status", ["pending", "running"])
      .single();

    if (existingJob) {
      logStep("Job already in progress", { job_id: existingJob.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          job_id: existingJob.id, 
          message: "Job already in progress",
          status: existingJob.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if any tickets are sold/reserved before rebuild
    if (existingCount && existingCount > 0 && existingCount !== totalTickets) {
      const { count: nonAvailableCount, error: nonAvailableError } = await supabaseClient
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("raffle_id", raffle_id)
        .neq("status", "available");

      if (nonAvailableError) throw nonAvailableError;

      if (nonAvailableCount && nonAvailableCount > 0 && !force_rebuild) {
        logStep("Cannot rebuild - tickets already sold/reserved", { nonAvailableCount });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `No se pueden regenerar los boletos porque ${nonAvailableCount} ya están vendidos o reservados`,
            nonAvailableCount 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Delete existing tickets for rebuild
      logStep("Deleting existing tickets for rebuild");
      const { error: deleteError } = await supabaseClient
        .from("tickets")
        .delete()
        .eq("raffle_id", raffle_id);

      if (deleteError) throw deleteError;
      logStep("Deleted existing tickets");
    }

    // Calculate batches
    const totalBatches = Math.ceil(totalTickets / BATCH_SIZE);

    // For small raffles (<= 50K), use synchronous generation
    if (totalTickets <= BATCH_SIZE) {
      logStep("Small raffle - using synchronous generation", { totalTickets });
      
      const { data: count, error: genError } = await supabaseClient.rpc(
        'generate_ticket_batch',
        {
          p_raffle_id: raffle_id,
          p_start_number: 1,
          p_end_number: totalTickets,
          p_format: format,
          p_prefix: format === 'prefixed' ? 'TKT' : null
        }
      );

      if (genError) throw genError;

      logStep("Synchronous generation complete", { count });
      return new Response(
        JSON.stringify({ success: true, count, async: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // For large raffles, create async job
    logStep("Large raffle - creating async job", { totalTickets, totalBatches });

    const { data: job, error: jobError } = await supabaseClient
      .from("ticket_generation_jobs")
      .insert({
        raffle_id,
        total_tickets: totalTickets,
        total_batches: totalBatches,
        batch_size: BATCH_SIZE,
        ticket_format: format,
        ticket_prefix: format === 'prefixed' ? 'TKT' : null,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) throw jobError;

    logStep("Job created", { job_id: job.id });

    // Start processing first batches in background
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(
      processJobBatches(supabaseUrl, supabaseKey, job.id, raffle_id, totalTickets, format, BATCH_SIZE)
    );

    // Return immediately with job ID (202 Accepted)
    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id: job.id, 
        async: true,
        message: "Ticket generation started",
        total_tickets: totalTickets,
        estimated_time_seconds: Math.ceil(totalTickets / 50000) * 2
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

// Background job processor
async function processJobBatches(
  supabaseUrl: string,
  supabaseKey: string,
  jobId: string,
  raffleId: string,
  totalTickets: number,
  format: string,
  batchSize: number
) {
  const logJob = (msg: string, details?: Record<string, unknown>) => {
    console.log(`[JOB:${jobId}] ${msg}`, details ? JSON.stringify(details) : '');
  };

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  try {
    logJob("Background processing started");

    const totalBatches = Math.ceil(totalTickets / batchSize);
    let generatedCount = 0;

    for (let batch = 0; batch < totalBatches; batch++) {
      const startNumber = batch * batchSize + 1;
      const endNumber = Math.min((batch + 1) * batchSize, totalTickets);

      logJob(`Processing batch ${batch + 1}/${totalBatches}`, { startNumber, endNumber });

      // Use SQL function for massive insertion via direct fetch
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_ticket_batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          p_raffle_id: raffleId,
          p_start_number: startNumber,
          p_end_number: endNumber,
          p_format: format,
          p_prefix: format === 'prefixed' ? 'TKT' : null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logJob("Batch generation error", { error: errorText });
        throw new Error(errorText);
      }

      const count = await response.json();

      generatedCount += count || (endNumber - startNumber + 1);

      // Update job progress via REST API
      await fetch(`${supabaseUrl}/rest/v1/ticket_generation_jobs?id=eq.${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          generated_count: generatedCount,
          current_batch: batch + 1
        })
      });

      logJob(`Batch ${batch + 1} complete`, { generatedCount, total: totalTickets });
    }

    // Mark job as completed via REST API
    await fetch(`${supabaseUrl}/rest/v1/ticket_generation_jobs?id=eq.${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        status: 'completed',
        generated_count: generatedCount,
        completed_at: new Date().toISOString()
      })
    });

    logJob("Job completed successfully", { generatedCount });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logJob("Job failed", { error: errorMessage });

    // Mark job as failed via REST API
    await fetch(`${supabaseUrl}/rest/v1/ticket_generation_jobs?id=eq.${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
    });
  }
}
