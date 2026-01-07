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

// Constants for batch processing - OPTIMIZED FOR PARALLEL WORKERS
const DEFAULT_BATCH_SIZE = 5000; // Default for raffles < 1M tickets
const MAX_BATCHES_PER_RUN = 100; // ✅ REDUCED: 100 batches per worker (~500K tickets) to reduce DB pressure
const STALE_THRESHOLD_MINUTES = 10; // Reset jobs stuck for more than 10 minutes
const MAX_RETRIES = 3; // Maximum retries for a batch
const BASE_RETRY_DELAY_MS = 1000; // 1 second base delay for exponential backoff

// Dynamic batch size based on total tickets to prevent timeouts on massive raffles
const getDynamicBatchSize = (totalTickets: number): number => {
  if (totalTickets >= 10000000) return 2500;  // 10M+: 2.5K per batch (~4000 batches)
  if (totalTickets >= 5000000) return 2500;   // 5M+: 2.5K per batch (more conservative)
  if (totalTickets >= 1000000) return 4000;   // 1M+: 4K per batch (~250 batches)
  return 5000;                                 // Default: 5K per batch
};

// Exponential backoff helper
const getRetryDelay = (attempt: number): number => {
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt), 30000); // Max 30 seconds
};

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create notification for a user
async function createCompletionNotification(
  supabaseUrl: string,
  supabaseKey: string,
  raffleId: string,
  totalTickets: number,
  success: boolean,
  errorMessage?: string
) {
  try {
    // Get raffle details
    const raffleResponse = await fetch(
      `${supabaseUrl}/rest/v1/raffles?id=eq.${raffleId}&select=title,organization_id,created_by,numbering_config`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (!raffleResponse.ok) {
      console.log("[PROCESS-TICKET-BATCH] Could not fetch raffle for notification");
      return;
    }

    const raffles = await raffleResponse.json();
    if (!raffles || raffles.length === 0) return;
    
    const raffle = raffles[0];

    // Get all users from the organization
    const usersResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?organization_id=eq.${raffle.organization_id}&select=user_id`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        }
      }
    );

    if (!usersResponse.ok) {
      console.log("[PROCESS-TICKET-BATCH] Could not fetch org users for notification");
      return;
    }

    const orgUsers = await usersResponse.json();
    if (!orgUsers || orgUsers.length === 0) return;

    // Create notifications for all org users
    const notifications = orgUsers.map((user: { user_id: string }) => ({
      user_id: user.user_id,
      organization_id: raffle.organization_id,
      type: success ? 'raffle_completed' : 'system',
      title: success 
        ? '✅ Boletos generados exitosamente' 
        : '❌ Error en generación de boletos',
      message: success
        ? `Se han generado ${totalTickets.toLocaleString()} boletos para "${raffle.title}". Tu rifa está lista.`
        : `Hubo un error generando boletos para "${raffle.title}": ${errorMessage}`,
      link: `/rifas/${raffleId}`,
      metadata: { raffle_id: raffleId, total_tickets: totalTickets, success }
    }));

    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(notifications)
      }
    );

    if (!insertResponse.ok) {
      console.log("[PROCESS-TICKET-BATCH] Error creating notifications:", await insertResponse.text());
    } else {
      console.log(`[PROCESS-TICKET-BATCH] Notifications created - count: ${notifications.length}, success: ${success}`);
    }
  } catch (err) {
    console.log("[PROCESS-TICKET-BATCH] Notification creation failed:", err instanceof Error ? err.message : String(err));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate unique worker ID for SKIP LOCKED claim
    const workerId = crypto.randomUUID();
    logStep("Worker started - v4 parallel safe", { workerId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { auth: { persistSession: false } }
    );

    // Auto-recovery: Reset stale jobs (running for too long without progress)
    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();
    const { data: staleJobs } = await supabaseClient
      .from("ticket_generation_jobs")
      .update({ status: 'pending', started_at: null })
      .eq("status", "running")
      .lt("started_at", staleThreshold)
      .select("id");

    if (staleJobs && staleJobs.length > 0) {
      logStep("Reset stale jobs", { count: staleJobs.length, jobIds: staleJobs.map(j => j.id) });
    }

    // ✅ Use SKIP LOCKED to claim exactly 1 job atomically (no race conditions)
    let jobs: Array<{
      id: string;
      raffle_id: string;
      total_tickets: number;
      generated_count: number;
      current_batch: number;
      batch_size: number;
      ticket_format?: string;
      ticket_prefix?: string;
      total_batches?: number;
      status?: string;
    }> = [];

    const { data: claimedJobs, error: claimError } = await supabaseClient
      .rpc('claim_next_job', { p_worker_id: workerId, p_limit: 1 });

    if (claimError) {
      logStep("Claim error, falling back to select", { error: claimError.message });
      // Fallback to old method if RPC not available
      const { data: fallbackJobs, error: fbError } = await supabaseClient
        .from("ticket_generation_jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);
      
      if (fbError) throw fbError;
      if (!fallbackJobs || fallbackJobs.length === 0) {
        logStep("No pending jobs found");
        return new Response(
          JSON.stringify({ success: true, message: "No pending jobs", workerId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      
      // Mark as running
      await supabaseClient
        .from("ticket_generation_jobs")
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq("id", fallbackJobs[0].id);
      
      jobs = fallbackJobs as typeof jobs;
    } else {
      jobs = (claimedJobs || []) as typeof jobs;
    }

    if (jobs.length === 0) {
      logStep("No jobs claimed (all busy)", { workerId });
      return new Response(
        JSON.stringify({ success: true, message: "No jobs available", workerId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Claimed job", { count: jobs.length, jobId: jobs[0]?.id, workerId });

    const results = [];
    const workerStartTime = Date.now();

    for (const job of jobs) {
      // Use dynamic batch size based on raffle size to prevent timeouts
      const batchSize = job.batch_size || getDynamicBatchSize(job.total_tickets);
      const jobStartTime = Date.now();
      
      // ✅ VALIDACIÓN EN TIEMPO REAL - Detectar y corregir current_batch corrupto
      const maxValidBatch = Math.ceil(job.total_tickets / batchSize);
      const storedBatch = job.current_batch || 0;
      
      if (storedBatch > maxValidBatch || (storedBatch * batchSize) > job.total_tickets) {
        const correctedBatch = Math.floor((job.generated_count || 0) / batchSize);
        
        logStep("⚠️ CORRUPTION DETECTED - Auto-fixing", {
          job_id: job.id,
          total_tickets: job.total_tickets,
          batch_size: batchSize,
          corrupted_batch: storedBatch,
          max_valid_batch: maxValidBatch,
          corrected_batch: correctedBatch,
          generated_count: job.generated_count
        });
        
        // Corregir en DB inmediatamente
        await supabaseClient
          .from('ticket_generation_jobs')
          .update({ current_batch: correctedBatch })
          .eq('id', job.id);
        
        logStep("✅ Job corruption fixed in DB", { job_id: job.id, new_batch: correctedBatch });
      }
      
      logStep(`Processing job ${job.id}`, { 
        raffle_id: job.raffle_id, 
        progress: `${job.generated_count}/${job.total_tickets}`,
        batch_size: batchSize,
        dynamic_batch: !job.batch_size,
        current_batch: job.current_batch,
        max_batches_this_run: MAX_BATCHES_PER_RUN
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

      // Use job.generated_count as source of truth (skip expensive count=exact)
      let generatedCount = job.generated_count || 0;
      
      // Calculate current batch based on generated count (always recalculate for safety)
      let currentBatch = Math.floor(generatedCount / batchSize);
      
      let batchesProcessed = 0;
      let jobFailed = false;
      let lastError = '';

      // Process batches for this job
      while (batchesProcessed < MAX_BATCHES_PER_RUN && generatedCount < job.total_tickets) {
        // Calculate range for this batch (1-indexed for tickets)
        const startIndex = currentBatch * batchSize + 1;
        const endIndex = Math.min((currentBatch + 1) * batchSize, job.total_tickets);
        const expectedCount = endIndex - startIndex + 1;

        logStep(`Job ${job.id}: Processing batch ${currentBatch + 1}/${job.total_batches}`, { 
          startIndex, 
          endIndex,
          expectedCount,
          currentGeneratedCount: generatedCount
        });

        let batchSuccess = false;
        let retryAttempt = 0;
        let insertedCount = 0;

        // Retry loop with exponential backoff
        while (retryAttempt < MAX_RETRIES && !batchSuccess) {
          try {
            // Try v3 function first (bulk INSERT - 20x faster)
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_ticket_batch_v3`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                p_raffle_id: job.raffle_id,
                p_start_index: startIndex,
                p_end_index: endIndex,
                p_numbering_config: null // Will use raffle's stored config
              })
            });

            if (!response.ok) {
              const errorText = await response.text();
              logStep(`V3 RPC failed, trying v2`, { error: errorText });
              
              // Fallback to v2 function
              const v2Response = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_ticket_batch_v2`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                  p_raffle_id: job.raffle_id,
                  p_start_index: startIndex,
                  p_end_index: endIndex,
                  p_numbering_config: null
                })
              });

              if (!v2Response.ok) {
                const v2Error = await v2Response.text();
                logStep(`V2 RPC failed, trying legacy`, { error: v2Error });
                
                // Final fallback to legacy function
                const legacyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/generate_ticket_batch`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify({
                    p_raffle_id: job.raffle_id,
                    p_start_number: startIndex,
                    p_end_number: endIndex,
                    p_format: job.ticket_format || 'sequential',
                    p_prefix: job.ticket_prefix
                  })
                });

                if (!legacyResponse.ok) {
                  throw new Error(await legacyResponse.text());
                }
                
                const legacyCount = await legacyResponse.json();
                insertedCount = legacyCount ?? 0;
              } else {
                const v2Count = await v2Response.json();
                insertedCount = v2Count ?? 0;
              }
            } else {
              const count = await response.json();
              insertedCount = count ?? 0;
            }

            batchSuccess = true;

            logStep(`Job ${job.id}: Batch ${currentBatch + 1} complete`, { 
              insertedCount,
              expectedCount,
              attempt: retryAttempt + 1,
              function: 'v3'
            });

          } catch (batchError) {
            const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
            lastError = errorMsg;
            retryAttempt++;

            if (retryAttempt < MAX_RETRIES) {
              const delay = getRetryDelay(retryAttempt);
              logStep(`Job ${job.id}: Batch ${currentBatch + 1} failed, retrying in ${delay}ms`, { 
                error: errorMsg, 
                attempt: retryAttempt,
                maxRetries: MAX_RETRIES
              });
              await sleep(delay);
            } else {
              logStep(`Job ${job.id}: Batch ${currentBatch + 1} failed after ${MAX_RETRIES} attempts`, { 
                error: errorMsg 
              });
            }
          }
        }

        if (!batchSuccess) {
          // Mark job as failed after all retries exhausted
          await supabaseClient
            .from("ticket_generation_jobs")
            .update({
              status: 'failed',
              error_message: `Batch ${currentBatch + 1} failed after ${MAX_RETRIES} retries: ${lastError}`,
              completed_at: new Date().toISOString()
            })
            .eq("id", job.id);

          // Send failure notification
          await createCompletionNotification(
            supabaseUrl,
            supabaseKey,
            job.raffle_id,
            job.total_tickets,
            false,
            lastError
          );

          jobFailed = true;
          break;
        }

        // Update counts - use actual inserted count
        generatedCount += insertedCount;
        currentBatch++;
        batchesProcessed++;

        // Update job progress every 10 batches to reduce DB overhead
        if (batchesProcessed % 10 === 0 || generatedCount >= job.total_tickets) {
          await supabaseClient
            .from("ticket_generation_jobs")
            .update({
              generated_count: generatedCount,
              current_batch: currentBatch
            })
            .eq("id", job.id);
        }
      }

      // Check if job is complete
      if (!jobFailed) {
        if (generatedCount >= job.total_tickets) {
          await supabaseClient
            .from("ticket_generation_jobs")
            .update({
              status: 'completed',
              generated_count: generatedCount,
              completed_at: new Date().toISOString()
            })
            .eq("id", job.id);

          logStep(`Job ${job.id} completed`, { 
            generatedCount,
            total: job.total_tickets 
          });

          // Send success notification
          await createCompletionNotification(
            supabaseUrl,
            supabaseKey,
            job.raffle_id,
            generatedCount,
            true
          );
        } else {
          logStep(`Job ${job.id} progress saved, will continue next run`, { 
            generatedCount,
            total: job.total_tickets,
            remaining: job.total_tickets - generatedCount
          });
        }
      }

      const jobElapsed = ((Date.now() - jobStartTime) / 1000).toFixed(1);
      const percentage = ((generatedCount / job.total_tickets) * 100).toFixed(2);
      
      results.push({
        job_id: job.id,
        batches_processed: batchesProcessed,
        generated_count: generatedCount,
        total_tickets: job.total_tickets,
        percentage: `${percentage}%`,
        elapsed: `${jobElapsed}s`,
        completed: generatedCount >= job.total_tickets,
        failed: jobFailed
      });
    }

    const totalElapsed = ((Date.now() - workerStartTime) / 1000).toFixed(1);
    logStep("Worker completed", { 
      jobs_processed: results.length,
      total_elapsed: `${totalElapsed}s`,
      max_batches_per_run: MAX_BATCHES_PER_RUN
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        total_elapsed: `${totalElapsed}s`,
        max_batches_per_run: MAX_BATCHES_PER_RUN
      }),
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
