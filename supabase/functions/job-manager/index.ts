import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts'

const CONFIG = {
  MAX_WORKERS: 5,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_COOLDOWN_MS: 60000,
}

interface CircuitBreaker {
  failures: number
  lastFailure: number | null
  isOpen: boolean
}

const circuitBreaker: CircuitBreaker = {
  failures: 0,
  lastFailure: null,
  isOpen: false
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

    console.log('🚀 Job Manager starting...')

    // 1. CIRCUIT BREAKER CHECK
    if (circuitBreaker.isOpen) {
      const timeSinceFailure = Date.now() - (circuitBreaker.lastFailure ?? 0)
      if (timeSinceFailure < CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS) {
        console.log('⚠️ Circuit breaker OPEN - Cooldown period')
        return corsJsonResponse(req, { 
          message: 'Circuit breaker open', 
          cooldown: Math.ceil((CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS - timeSinceFailure) / 1000) 
        })
      }
      // Reset después de cooldown
      circuitBreaker.isOpen = false
      circuitBreaker.failures = 0
      console.log('✅ Circuit breaker RESET')
    }

    // 2. RESET STALE RUNNING JOBS
    const { data: staleJobs } = await supabase
      .from('ticket_generation_jobs')
      .update({ 
        status: 'pending', 
        worker_id: null,
        started_at: null 
      })
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .select('id')

    if (staleJobs && staleJobs.length > 0) {
      console.log(`♻️ Reset ${staleJobs.length} stale jobs`)
    }

    // 3. COUNT ACTIVE WORKERS
    const { count: activeWorkers } = await supabase
      .from('ticket_generation_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running')

    const availableSlots = CONFIG.MAX_WORKERS - (activeWorkers ?? 0)
    
    if (availableSlots <= 0) {
      console.log(`⏳ All ${CONFIG.MAX_WORKERS} workers busy`)
      return corsJsonResponse(req, { 
        message: 'All workers busy', 
        active: activeWorkers,
        maxWorkers: CONFIG.MAX_WORKERS
      })
    }

    // 4. GET PENDING JOBS WITH PRIORITY
    const { data: jobs, error } = await supabase
      .from('ticket_generation_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(availableSlots)

    if (error) throw error
    
    if (!jobs || jobs.length === 0) {
      console.log('📭 No pending jobs')
      return corsJsonResponse(req, { message: 'No pending jobs', active: activeWorkers })
    }

    console.log(`📦 Dispatching ${jobs.length} jobs to workers (${availableSlots} slots available)`)

    // 5. DISPATCH JOBS TO WORKERS
    const results = await Promise.allSettled(
      jobs.map(async (job, index) => {
        const workerId = index % CONFIG.MAX_WORKERS

        try {
          console.log(`🚀 Dispatching job ${job.id.substring(0,8)} to worker ${workerId}`)

          // Mark job as running
          await supabase
            .from('ticket_generation_jobs')
            .update({ 
              status: 'running', 
              worker_id: workerId,
              started_at: new Date().toISOString()
            })
            .eq('id', job.id)

          // Invoke worker
          const { data, error: workerError } = await supabase.functions.invoke(
            'ticket-worker',
            { body: { jobId: job.id, workerId } }
          )

          if (workerError) throw workerError

          console.log(`✅ Worker ${workerId} completed job ${job.id.substring(0,8)}`)
          return { success: true, workerId, jobId: job.id, data }

        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error)
          console.error(`❌ Worker ${workerId} failed job ${job.id.substring(0,8)}:`, errMsg)

          // Update circuit breaker
          circuitBreaker.failures++
          circuitBreaker.lastFailure = Date.now()

          if (circuitBreaker.failures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
            circuitBreaker.isOpen = true
            console.error(`🔴 CIRCUIT BREAKER OPENED after ${circuitBreaker.failures} failures`)
          }

          // Mark job as failed
          await supabase
            .from('ticket_generation_jobs')
            .update({
              status: 'failed',
              worker_id: null,
              error_message: errMsg
            })
            .eq('id', job.id)

          return { success: false, workerId, jobId: job.id, error: errMsg }
        }
      })
    )

    // 6. COMPILE RESULTS
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    const summary = {
      dispatched: jobs.length,
      successful,
      failed,
      activeWorkers: (activeWorkers ?? 0) + successful,
      circuitBreaker: circuitBreaker.isOpen ? 'OPEN' : 'CLOSED',
      elapsed: `${elapsed}s`
    }

    console.log('📊 Job Manager summary:', JSON.stringify(summary))

    return corsJsonResponse(req, summary)

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('💥 Job Manager Error:', errMsg)
    return corsJsonResponse(req, { error: errMsg }, 500)
  }
})
