/**
 * Phase 9: Job Queue Processor
 * Processes async jobs from Redis queue with priority handling
 * Schedule: Every 1 minute via cron or external trigger
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCorsHeaders } from '../_shared/cors.ts';
import { dequeueJob, completeJob, failJob, getQueueStats, type Job, type JobPriority } from '../_shared/job-queue.ts';

const MAX_JOBS_PER_RUN = 10;
const MAX_RUNTIME_MS = 25000; // 25 seconds (leave buffer for Edge Function timeout)

// Job processor registry
type JobProcessor = (payload: Record<string, unknown>, supabase: SupabaseClient) => Promise<unknown>;

const jobProcessors: Record<string, JobProcessor> = {
  'send-email': async (payload, supabase) => {
    const { data, error } = await supabase.functions.invoke('send-email', { body: payload });
    if (error) throw new Error(error.message);
    return { sent: true, messageId: data?.id };
  },

  'export-buyers-csv': async (payload, supabase) => {
    const { data, error } = await supabase.functions.invoke('export-buyers-csv', {
      body: { raffle_id: payload.raffleId },
    });
    if (error) throw new Error(error.message);
    return { exported: true, rows: data?.count || 0 };
  },

  'export-tickets-csv': async (payload, supabase) => {
    const { data, error } = await supabase.functions.invoke('export-tickets-csv', {
      body: { raffle_id: payload.raffleId },
    });
    if (error) throw new Error(error.message);
    return { exported: true, rows: data?.count || 0 };
  },

  'generate-logo': async (payload, supabase) => {
    const { data, error } = await supabase.functions.invoke('generate-logo', { body: payload });
    if (error) throw new Error(error.message);
    return { url: data?.url };
  },

  'generate-description': async (payload, supabase) => {
    const { data, error } = await supabase.functions.invoke('generate-description', { body: payload });
    if (error) throw new Error(error.message);
    return { description: data?.description };
  },

  'telegram-notify': async (payload, supabase) => {
    const { data, error } = await supabase.functions.invoke('telegram-notify', { body: payload });
    if (error) throw new Error(error.message);
    return { sent: true, ...data };
  },

  'refresh-materialized-views': async (payload, supabase) => {
    const { data, error } = await supabase.rpc('refresh_all_materialized_views');
    if (error) throw new Error(error.message);
    return { refreshed: true, views: data };
  },
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (!redisUrl || !redisToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Redis not configured',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const results: Array<{ jobId: string; type: string; status: string; error?: string }> = [];

    // Process jobs by priority: high -> normal -> low
    const priorities: JobPriority[] = ['high', 'normal', 'low'];

    for (const priority of priorities) {
      // Check if we've hit limits
      if (processed >= MAX_JOBS_PER_RUN) break;
      if (Date.now() - startTime > MAX_RUNTIME_MS) break;

      // Process jobs at this priority level
      while (processed < MAX_JOBS_PER_RUN && Date.now() - startTime < MAX_RUNTIME_MS) {
        const job = await dequeueJob(redisUrl, redisToken, priority);
        
        if (!job) break; // No more jobs at this priority

        const processor = jobProcessors[job.type];
        
        if (!processor) {
          await failJob(redisUrl, redisToken, job.id, `Unknown job type: ${job.type}`);
          skipped++;
          results.push({
            jobId: job.id,
            type: job.type,
            status: 'skipped',
            error: 'Unknown job type',
          });
          continue;
        }

        try {
          console.log(`[process-job-queue] Processing job ${job.id} (${job.type}), attempt ${job.attempts}`);
          
          const result = await processor(job.payload, supabase);
          await completeJob(redisUrl, redisToken, job.id, result);
          
          processed++;
          results.push({
            jobId: job.id,
            type: job.type,
            status: 'completed',
          });

          console.log(`[process-job-queue] Job ${job.id} completed successfully`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const failResult = await failJob(redisUrl, redisToken, job.id, errorMessage);
          
          failed++;
          results.push({
            jobId: job.id,
            type: job.type,
            status: failResult.retrying ? 'retrying' : 'failed',
            error: errorMessage,
          });

          console.error(`[process-job-queue] Job ${job.id} failed: ${errorMessage}`);
        }
      }
    }

    // Get queue stats for monitoring
    const queueStats = await getQueueStats(redisUrl, redisToken);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        skipped,
        results,
        queueStats,
        runtimeMs: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[process-job-queue] Error:', error);

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
