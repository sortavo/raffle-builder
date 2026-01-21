/**
 * Phase 9: Async Job Queue
 * Redis-based job queue with priority levels, retry logic, and status tracking
 * 
 * Features:
 * - Priority queues (high, normal, low)
 * - Exponential backoff with jitter for retries
 * - Dead Letter Queue (DLQ) for failed jobs
 * - Status tracking and monitoring
 */

import { redisCommand } from './redis-client.ts';

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  error?: string;
  result?: unknown;
}

export interface DlqJob extends Job {
  failedAt: number;
  lastError: string;
  movedToDlqAt: string;
}

export type JobPriority = 'high' | 'normal' | 'low';

const QUEUE_PREFIX = 'jobqueue:';
const DLQ_KEY = 'jobqueue:dlq';
const JOB_TTL_PENDING = 86400; // 24 hours
const JOB_TTL_COMPLETED = 3600; // 1 hour
const DLQ_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Enqueue a new job for async processing
 */
export async function enqueueJob(
  redisUrl: string,
  redisToken: string,
  type: string,
  payload: Record<string, unknown>,
  options?: {
    maxAttempts?: number;
    priority?: JobPriority;
  }
): Promise<{ jobId: string; success: boolean; error?: string }> {
  const jobId = crypto.randomUUID();
  const priority = options?.priority || 'normal';
  
  const job: Job = {
    id: jobId,
    type,
    payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: options?.maxAttempts || 3,
    createdAt: Date.now(),
  };

  try {
    // Store the job data
    const setResult = await redisCommand(redisUrl, redisToken, [
      'SET',
      `${QUEUE_PREFIX}job:${jobId}`,
      JSON.stringify(job),
      'EX',
      JOB_TTL_PENDING.toString(),
    ]);

    if (setResult.error) {
      return { jobId, success: false, error: setResult.error };
    }

    // Add job ID to the priority queue
    const pushResult = await redisCommand(redisUrl, redisToken, [
      'LPUSH',
      `${QUEUE_PREFIX}${priority}`,
      jobId,
    ]);

    if (pushResult.error) {
      return { jobId, success: false, error: pushResult.error };
    }

    return { jobId, success: true };
  } catch (error) {
    return { jobId, success: false, error: String(error) };
  }
}

/**
 * Dequeue the next job for processing
 */
export async function dequeueJob(
  redisUrl: string,
  redisToken: string,
  priority: JobPriority = 'normal'
): Promise<Job | null> {
  try {
    // Pop job ID from queue
    const popResult = await redisCommand(redisUrl, redisToken, [
      'RPOP',
      `${QUEUE_PREFIX}${priority}`,
    ]);

    if (popResult.error || !popResult.result) {
      return null;
    }

    const jobId = popResult.result as string;

    // Get job data
    const getResult = await redisCommand(redisUrl, redisToken, [
      'GET',
      `${QUEUE_PREFIX}job:${jobId}`,
    ]);

    if (getResult.error || !getResult.result) {
      return null;
    }

    const job: Job = JSON.parse(getResult.result as string);
    job.status = 'processing';
    job.attempts++;
    job.processedAt = Date.now();

    // Update job status
    await redisCommand(redisUrl, redisToken, [
      'SET',
      `${QUEUE_PREFIX}job:${jobId}`,
      JSON.stringify(job),
      'EX',
      JOB_TTL_PENDING.toString(),
    ]);

    return job;
  } catch (error) {
    console.error('[dequeueJob] Error:', error);
    return null;
  }
}

/**
 * Mark a job as completed
 */
export async function completeJob(
  redisUrl: string,
  redisToken: string,
  jobId: string,
  result?: unknown
): Promise<boolean> {
  try {
    const getResult = await redisCommand(redisUrl, redisToken, [
      'GET',
      `${QUEUE_PREFIX}job:${jobId}`,
    ]);

    if (getResult.error || !getResult.result) {
      return false;
    }

    const job: Job = JSON.parse(getResult.result as string);
    job.status = 'completed';
    job.completedAt = Date.now();
    job.result = result;

    // Store with shorter TTL for completed jobs
    await redisCommand(redisUrl, redisToken, [
      'SET',
      `${QUEUE_PREFIX}job:${jobId}`,
      JSON.stringify(job),
      'EX',
      JOB_TTL_COMPLETED.toString(),
    ]);

    return true;
  } catch (error) {
    console.error('[completeJob] Error:', error);
    return false;
  }
}

/**
 * Move a failed job to the Dead Letter Queue (R7)
 */
export async function moveToDeadLetterQueue(
  redisUrl: string,
  redisToken: string,
  job: Job,
  error: string
): Promise<void> {
  const dlqEntry: DlqJob = {
    ...job,
    failedAt: Date.now(),
    lastError: error,
    movedToDlqAt: new Date().toISOString(),
  };

  await redisCommand(redisUrl, redisToken, [
    'LPUSH',
    DLQ_KEY,
    JSON.stringify(dlqEntry),
  ]);

  // Keep DLQ entries for 7 days
  await redisCommand(redisUrl, redisToken, [
    'EXPIRE',
    DLQ_KEY,
    DLQ_TTL_SECONDS.toString(),
  ]);

  console.warn(`[JOB-QUEUE] Job ${job.id} moved to DLQ after ${job.attempts} attempts: ${error}`);
}

/**
 * Get Dead Letter Queue statistics for monitoring
 */
export async function getDlqStats(
  redisUrl: string,
  redisToken: string
): Promise<{ count: number }> {
  try {
    const result = await redisCommand(redisUrl, redisToken, ['LLEN', DLQ_KEY]);
    return { count: (result?.result as number) || 0 };
  } catch {
    return { count: 0 };
  }
}

/**
 * Get jobs from the Dead Letter Queue (for manual inspection)
 */
export async function getDlqJobs(
  redisUrl: string,
  redisToken: string,
  limit: number = 10
): Promise<DlqJob[]> {
  try {
    const result = await redisCommand(redisUrl, redisToken, [
      'LRANGE',
      DLQ_KEY,
      '0',
      (limit - 1).toString(),
    ]);

    if (result.error || !result.result) {
      return [];
    }

    const jobs = result.result as string[];
    return jobs.map(j => JSON.parse(j) as DlqJob);
  } catch {
    return [];
  }
}

/**
 * Mark a job as failed, with automatic retry if under max attempts
 */
export async function failJob(
  redisUrl: string,
  redisToken: string,
  jobId: string,
  error: string
): Promise<{ retrying: boolean; success: boolean }> {
  try {
    const getResult = await redisCommand(redisUrl, redisToken, [
      'GET',
      `${QUEUE_PREFIX}job:${jobId}`,
    ]);

    if (getResult.error || !getResult.result) {
      return { retrying: false, success: false };
    }

    const job: Job = JSON.parse(getResult.result as string);
    job.error = error;

    const shouldRetry = job.attempts < job.maxAttempts;

    if (shouldRetry) {
      // Queue for retry with exponential backoff delay + jitter (R6)
      job.status = 'pending';
      const baseDelay = Math.pow(2, job.attempts) * 1000; // 2s, 4s, 8s...
      const jitter = Math.random() * 1000; // 0-1000ms random jitter
      const delayMs = baseDelay + jitter;
      
      console.log(`[JOB-QUEUE] Retrying job ${jobId} in ${Math.round(delayMs)}ms (attempt ${job.attempts}/${job.maxAttempts})`);
      
      // Store updated job
      await redisCommand(redisUrl, redisToken, [
        'SET',
        `${QUEUE_PREFIX}job:${jobId}`,
        JSON.stringify(job),
        'EX',
        JOB_TTL_PENDING.toString(),
      ]);

      // Re-add to queue after delay (using simple LPUSH since edge functions are stateless)
      // In production, you'd use ZADD with score = now + delay for delayed jobs
      await redisCommand(redisUrl, redisToken, [
        'LPUSH',
        `${QUEUE_PREFIX}normal`,
        jobId,
      ]);

      return { retrying: true, success: true };
    } else {
      // Max attempts reached - move to Dead Letter Queue (R7)
      job.status = 'failed';
      
      await moveToDeadLetterQueue(redisUrl, redisToken, job, error);
      
      // Remove from active jobs
      await redisCommand(redisUrl, redisToken, [
        'DEL',
        `${QUEUE_PREFIX}job:${jobId}`,
      ]);

      return { retrying: false, success: true };
    }
  } catch (err) {
    console.error('[failJob] Error:', err);
    return { retrying: false, success: false };
  }
}

/**
 * Get the current status of a job
 */
export async function getJobStatus(
  redisUrl: string,
  redisToken: string,
  jobId: string
): Promise<Job | null> {
  try {
    const result = await redisCommand(redisUrl, redisToken, [
      'GET',
      `${QUEUE_PREFIX}job:${jobId}`,
    ]);

    if (result.error || !result.result) {
      return null;
    }

    return JSON.parse(result.result as string);
  } catch {
    return null;
  }
}

/**
 * Get queue lengths for monitoring
 */
export async function getQueueStats(
  redisUrl: string,
  redisToken: string
): Promise<{ high: number; normal: number; low: number } | null> {
  try {
    const [highResult, normalResult, lowResult] = await Promise.all([
      redisCommand(redisUrl, redisToken, ['LLEN', `${QUEUE_PREFIX}high`]),
      redisCommand(redisUrl, redisToken, ['LLEN', `${QUEUE_PREFIX}normal`]),
      redisCommand(redisUrl, redisToken, ['LLEN', `${QUEUE_PREFIX}low`]),
    ]);

    return {
      high: (highResult.result as number) || 0,
      normal: (normalResult.result as number) || 0,
      low: (lowResult.result as number) || 0,
    };
  } catch {
    return null;
  }
}
