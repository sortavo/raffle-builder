import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PROCESS-TICKET-BATCH] ${step}${detailsStr}`);
};

const BATCH_SIZE = 50000;
const MAX_BATCHES_PER_RUN = 20; // Process up to 20 batches per cron run (1M tickets)
const STALE_THRESHOLD_MINUTES = 10; // Reset jobs stuck for more than 10 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Worker started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Auto-recovery: Reset stale jobs (running for too long without progress)
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();
    const { data: staleJobs, error: staleError } = await supabaseClient
      .from("ticket_generation_jobs")
      .update({ status: 'pending', started_at: null })
      .eq("status", "running")
      .lt("started_at", staleThreshold)
      .select("id");

    if (staleJobs && staleJobs.length > 0) {
      logStep("Reset stale jobs", { count: staleJobs.length, jobIds: staleJobs.map(j => j.id) });
    }

    // Find pending or running jobs that need processing
    const { data: jobs, error: jobsError } = await supabaseClient
      .from("ticket_generation_jobs")
      .select("*")
      .in("status", ["pending", "running"])
      .order("created_at", { ascending: true })
      .limit(5);

    if (jobsError) throw jobsError;

    if (!jobs || jobs.length === 0) {
      logStep("No pending jobs found");
      return new Response(
        JSON.stringify({ success: true, message: "No pending jobs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Found jobs to process", { count: jobs.length });

    const results = [];

    for (const job of jobs) {
      logStep(`Processing job ${job.id}`, { 
        raffle_id: job.raffle_id, 
        progress: `${job.generated_count}/${job.total_tickets}` 
      });

      // Update job to running if pending
      if (job.status === 'pending') {
        await supabaseClient
          .from("ticket_generation_jobs")
          .update({ 
            status: 'running', 
            started_at: new Date().toISOString() 
          })
          .eq("id", job.id);
      }

      let batchesProcessed = 0;
      let generatedCount = job.generated_count;
      const startBatch = job.current_batch;

      // Process batches for this job
      while (batchesProcessed < MAX_BATCHES_PER_RUN && generatedCount < job.total_tickets) {
        const currentBatch = startBatch + batchesProcessed;
        const startNumber = currentBatch * BATCH_SIZE + 1;
        const endNumber = Math.min((currentBatch + 1) * BATCH_SIZE, job.total_tickets);

        logStep(`Job ${job.id}: Processing batch ${currentBatch + 1}/${job.total_batches}`, { 
          startNumber, 
          endNumber 
        });

        try {
          // Use SQL function for massive insertion
          const { data: count, error: genError } = await supabaseClient.rpc(
            'generate_ticket_batch',
            {
              p_raffle_id: job.raffle_id,
              p_start_number: startNumber,
              p_end_number: endNumber,
              p_format: job.ticket_format,
              p_prefix: job.ticket_prefix
            }
          );

          if (genError) {
            logStep(`Batch generation error for job ${job.id}`, { error: genError.message });
            
            // Mark job as failed
            await supabaseClient
              .from("ticket_generation_jobs")
              .update({
                status: 'failed',
                error_message: genError.message,
                completed_at: new Date().toISOString()
              })
              .eq("id", job.id);
            
            break;
          }

          generatedCount += count || (endNumber - startNumber + 1);
          batchesProcessed++;

          // Update job progress
          await supabaseClient
            .from("ticket_generation_jobs")
            .update({
              generated_count: generatedCount,
              current_batch: currentBatch + 1
            })
            .eq("id", job.id);

          logStep(`Job ${job.id}: Batch ${currentBatch + 1} complete`, { 
            generatedCount, 
            total: job.total_tickets 
          });

        } catch (batchError) {
          const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
          logStep(`Job ${job.id}: Batch error`, { error: errorMsg });
          
          await supabaseClient
            .from("ticket_generation_jobs")
            .update({
              status: 'failed',
              error_message: errorMsg,
              completed_at: new Date().toISOString()
            })
            .eq("id", job.id);
          
          break;
        }
      }

      // Check if job is complete
      if (generatedCount >= job.total_tickets) {
        await supabaseClient
          .from("ticket_generation_jobs")
          .update({
            status: 'completed',
            generated_count: generatedCount,
            completed_at: new Date().toISOString()
          })
          .eq("id", job.id);

        logStep(`Job ${job.id} completed`, { generatedCount });
      }

      results.push({
        job_id: job.id,
        batches_processed: batchesProcessed,
        generated_count: generatedCount,
        completed: generatedCount >= job.total_tickets
      });
    }

    logStep("Worker completed", { jobs_processed: results.length });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
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
