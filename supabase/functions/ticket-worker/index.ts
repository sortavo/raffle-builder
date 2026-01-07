import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts'

const MAX_BATCHES_PER_RUN = 200
const MAX_RETRIES = 3
const PROGRESS_UPDATE_INTERVAL = 10

function getBatchSize(totalTickets: number, activeWorkers: number): number {
  const base = totalTickets >= 10000000 ? 2500 : 
               totalTickets >= 5000000 ? 3000 : 
               totalTickets >= 1000000 ? 4000 : 5000
  
  // Reduce under high load
  if (activeWorkers >= 4) return Math.floor(base * 0.7)
  if (activeWorkers >= 3) return Math.floor(base * 0.85)
  
  return base
}

function getRetryDelay(attempt: number): number {
  return Math.min(2000 * Math.pow(2, attempt), 30000)
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req)
  }

  const startTime = Date.now()
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { jobId, workerId = 0 } = await req.json()
    
    if (!jobId) {
      return corsJsonResponse(req, { error: 'jobId required' }, 400)
    }

    console.log(`[Worker ${workerId}] Starting job ${jobId.substring(0,8)}`)

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('ticket_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    // Check if already completed
    if (job.status === 'completed') {
      console.log(`[Worker ${workerId}] Job already completed`)
      return corsJsonResponse(req, { 
        success: true, 
        status: 'already_completed',
        generated: job.generated_count 
      })
    }

    // Count active workers for dynamic batch sizing
    const { count: activeWorkers } = await supabase
      .from('ticket_generation_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running')

    const batchSize = getBatchSize(job.total_tickets, activeWorkers ?? 1)
    const totalBatches = Math.ceil(job.total_tickets / batchSize)

    let currentBatch = job.current_batch || 0
    let generatedCount = job.generated_count || 0
    let processedBatches = 0
    let totalInserted = 0

    console.log(`[Worker ${workerId}] Processing: ${job.total_tickets.toLocaleString()} tickets, batch size: ${batchSize}, starting at batch ${currentBatch}`)

    // Process batches
    while (currentBatch < totalBatches && processedBatches < MAX_BATCHES_PER_RUN) {
      const startIndex = (currentBatch * batchSize) + 1
      const endIndex = Math.min(startIndex + batchSize - 1, job.total_tickets)

      let success = false
      let inserted = 0

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Try v3 first (fastest), fallback to v2, then legacy
          const { data, error } = await supabase.rpc('generate_ticket_batch_v3', {
            p_raffle_id: job.raffle_id,
            p_start_index: startIndex,
            p_end_index: endIndex,
            p_numbering_config: job.numbering_config || null
          })

          if (error) {
            // Try v2 as fallback
            const { data: dataV2, error: errorV2 } = await supabase.rpc('generate_ticket_batch_v2', {
              p_raffle_id: job.raffle_id,
              p_start_index: startIndex,
              p_end_index: endIndex,
              p_numbering_config: job.numbering_config || null
            })
            
            if (errorV2) throw errorV2
            inserted = dataV2 || 0
          } else {
            inserted = data || 0
          }

          success = true
          break

        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error(`[Worker ${workerId}] Batch ${currentBatch} attempt ${attempt + 1} failed:`, errMsg)
          
          if (attempt === MAX_RETRIES - 1) {
            throw new Error(`Failed after ${MAX_RETRIES} attempts: ${errMsg}`)
          }
          
          await sleep(getRetryDelay(attempt))
        }
      }

      if (!success) {
        throw new Error('Max retries exceeded')
      }

      generatedCount += inserted
      totalInserted += inserted
      currentBatch++
      processedBatches++

      // Update progress periodically
      if (processedBatches % PROGRESS_UPDATE_INTERVAL === 0) {
        const elapsed = (Date.now() - startTime) / 1000
        const tps = Math.round(totalInserted / elapsed)
        
        console.log(`[Worker ${workerId}] Progress: ${generatedCount.toLocaleString()}/${job.total_tickets.toLocaleString()} (${((generatedCount/job.total_tickets)*100).toFixed(1)}%) @ ${tps} TPS`)

        await supabase
          .from('ticket_generation_jobs')
          .update({
            current_batch: currentBatch,
            generated_count: generatedCount,
            batch_size: batchSize
          })
          .eq('id', jobId)
      }
    }

    // Final update
    const isCompleted = generatedCount >= job.total_tickets
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const avgTps = Math.round(totalInserted / (parseFloat(elapsed) || 1))

    await supabase
      .from('ticket_generation_jobs')
      .update({
        current_batch: currentBatch,
        generated_count: generatedCount,
        batch_size: batchSize,
        status: isCompleted ? 'completed' : 'pending',
        completed_at: isCompleted ? new Date().toISOString() : null,
        worker_id: isCompleted ? null : workerId
      })
      .eq('id', jobId)

    console.log(`[Worker ${workerId}] Job ${jobId.substring(0,8)} ${isCompleted ? 'COMPLETED ✅' : 'PAUSED ⏸️'} - ${generatedCount.toLocaleString()}/${job.total_tickets.toLocaleString()} in ${elapsed}s @ ${avgTps} TPS`)

    // Create notification if completed
    if (isCompleted) {
      try {
        const { data: raffle } = await supabase
          .from('raffles')
          .select('organization_id, title')
          .eq('id', job.raffle_id)
          .single()

        if (raffle) {
          await supabase.from('notifications').insert({
            organization_id: raffle.organization_id,
            type: 'ticket_generation_complete',
            title: 'Generación de boletos completada',
            message: `Se han generado ${job.total_tickets.toLocaleString()} boletos para "${raffle.title}"`,
            metadata: { 
              raffle_id: job.raffle_id, 
              job_id: jobId,
              total_tickets: job.total_tickets,
              elapsed_seconds: parseFloat(elapsed)
            }
          })
        }
      } catch (notifError) {
        const errMsg = notifError instanceof Error ? notifError.message : String(notifError)
        console.warn('Failed to create notification:', errMsg)
      }
    }

    return corsJsonResponse(req, {
      success: true,
      workerId,
      jobId,
      processed: processedBatches,
      generated: generatedCount,
      total: job.total_tickets,
      status: isCompleted ? 'completed' : 'in_progress',
      elapsed: `${elapsed}s`,
      avgTps
    })

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Worker] Fatal error:`, errMsg)
    return corsJsonResponse(req, { error: errMsg }, 500)
  }
})
