import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TicketGenerationJob {
  id: string;
  raffle_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_tickets: number;
  generated_count: number;
  current_batch: number;
  total_batches: number;
  batch_size: number;
  ticket_format: string;
  ticket_prefix: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  progress?: number;
  estimated_time_remaining?: number | null;
  tickets_per_second?: number;
}

interface UseTicketGenerationJobOptions {
  onComplete?: (job: TicketGenerationJob) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number, job: TicketGenerationJob) => void;
  pollInterval?: number;
  raffleId?: string; // Auto-fetch job for a specific raffle
}

export function useTicketGenerationJob(options: UseTicketGenerationJobOptions = {}) {
  const { onComplete, onError, onProgress, pollInterval = 2000, raffleId } = options;
  
  const [job, setJob] = useState<TicketGenerationJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track previous count for speed calculation
  const prevCountRef = useRef<{ count: number; time: number } | null>(null);
  const speedRef = useRef<number>(0);

  // Calculate tickets per second
  const calculateSpeed = useCallback((currentCount: number) => {
    const now = Date.now();
    if (prevCountRef.current) {
      const timeDiff = (now - prevCountRef.current.time) / 1000;
      const countDiff = currentCount - prevCountRef.current.count;
      if (timeDiff > 0 && countDiff > 0) {
        // Exponential moving average for smoother speed display
        const newSpeed = countDiff / timeDiff;
        speedRef.current = speedRef.current ? (speedRef.current * 0.7 + newSpeed * 0.3) : newSpeed;
      }
    }
    prevCountRef.current = { count: currentCount, time: now };
    return speedRef.current;
  }, []);

  // Fetch active job for a raffle
  const fetchActiveJob = useCallback(async (targetRaffleId: string) => {
    try {
      const { data: activeJob, error: jobError } = await supabase
        .from('ticket_generation_jobs')
        .select('*')
        .eq('raffle_id', targetRaffleId)
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (jobError) throw jobError;

      if (activeJob) {
        const progress = activeJob.total_tickets > 0
          ? Math.round((activeJob.generated_count / activeJob.total_tickets) * 100)
          : 0;
        
        const jobWithProgress: TicketGenerationJob = {
          ...activeJob,
          status: activeJob.status as TicketGenerationJob['status'],
          progress,
          tickets_per_second: calculateSpeed(activeJob.generated_count)
        };
        
        setJob(jobWithProgress);
        setIsPolling(true);
        return jobWithProgress;
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching active job:', err);
      return null;
    }
  }, [calculateSpeed]);

  // Auto-fetch job if raffleId is provided
  useEffect(() => {
    if (raffleId) {
      fetchActiveJob(raffleId);
    }
  }, [raffleId, fetchActiveJob]);

  // Start a new ticket generation job
  const startJob = useCallback(async (targetRaffleId: string, forceRebuild = false) => {
    setError(null);
    prevCountRef.current = null;
    speedRef.current = 0;
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-tickets', {
        body: { raffle_id: targetRaffleId, force_rebuild: forceRebuild }
      });

      if (invokeError) throw invokeError;

      if (data.error) {
        setError(data.error);
        onError?.(data.error);
        return null;
      }

      // Synchronous generation completed
      if (data.success && !data.async) {
        const completedJob: TicketGenerationJob = {
          id: 'sync',
          raffle_id: targetRaffleId,
          status: 'completed',
          total_tickets: data.count,
          generated_count: data.count,
          current_batch: 1,
          total_batches: 1,
          batch_size: data.count,
          ticket_format: 'sequential',
          ticket_prefix: null,
          error_message: null,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          progress: 100
        };
        setJob(completedJob);
        onComplete?.(completedJob);
        return completedJob;
      }

      // Async job started - begin polling
      if (data.job_id) {
        setIsPolling(true);
        // Fetch initial job data
        await fetchJobStatus(data.job_id);
        return { job_id: data.job_id };
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error starting job';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }
  }, [onComplete, onError]);

  // Fetch job status
  const fetchJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tickets?job_id=${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const jobData = await response.json() as TicketGenerationJob;

      // Check for error in response
      if ('error' in jobData && typeof (jobData as unknown as {error: string}).error === 'string') {
        throw new Error((jobData as unknown as {error: string}).error);
      }

      // Calculate progress and speed
      jobData.progress = jobData.total_tickets > 0
        ? Math.round((jobData.generated_count / jobData.total_tickets) * 100)
        : 0;
      jobData.tickets_per_second = calculateSpeed(jobData.generated_count);

      // Calculate estimated time remaining
      if (jobData.status === 'running' && speedRef.current > 0) {
        const remaining = jobData.total_tickets - jobData.generated_count;
        jobData.estimated_time_remaining = Math.round(remaining / speedRef.current);
      }

      setJob(jobData);
      onProgress?.(jobData.progress, jobData);

      if (jobData.status === 'completed') {
        setIsPolling(false);
        onComplete?.(jobData);
      } else if (jobData.status === 'failed') {
        setIsPolling(false);
        setError(jobData.error_message || 'Job failed');
        onError?.(jobData.error_message || 'Job failed');
      }

      return jobData;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error fetching job status';
      setError(errorMsg);
      return null;
    }
  }, [onComplete, onError, onProgress, calculateSpeed]);

  // Cancel a running job
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('ticket_generation_jobs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      setIsPolling(false);
      setJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error cancelling job';
      setError(errorMsg);
      return false;
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setJob(null);
    setIsPolling(false);
    setError(null);
    prevCountRef.current = null;
    speedRef.current = 0;
  }, []);

  // Polling effect
  useEffect(() => {
    if (!isPolling || !job?.id || job.id === 'sync') return;

    const interval = setInterval(() => {
      fetchJobStatus(job.id);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [isPolling, job?.id, pollInterval, fetchJobStatus]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!job?.id || job.id === 'sync') return;

    const channel = supabase
      .channel(`job-${job.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ticket_generation_jobs',
          filter: `id=eq.${job.id}`
        },
        (payload) => {
          const updatedJob = payload.new as TicketGenerationJob;
          updatedJob.progress = updatedJob.total_tickets > 0
            ? Math.round((updatedJob.generated_count / updatedJob.total_tickets) * 100)
            : 0;
          updatedJob.tickets_per_second = calculateSpeed(updatedJob.generated_count);
          
          // Calculate estimated time remaining
          if (updatedJob.status === 'running' && speedRef.current > 0) {
            const remaining = updatedJob.total_tickets - updatedJob.generated_count;
            updatedJob.estimated_time_remaining = Math.round(remaining / speedRef.current);
          }
          
          setJob(updatedJob);
          onProgress?.(updatedJob.progress, updatedJob);

          if (updatedJob.status === 'completed') {
            setIsPolling(false);
            onComplete?.(updatedJob);
          } else if (updatedJob.status === 'failed') {
            setIsPolling(false);
            setError(updatedJob.error_message || 'Job failed');
            onError?.(updatedJob.error_message || 'Job failed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [job?.id, onComplete, onError, onProgress, calculateSpeed]);

  // Format time remaining
  const formatTimeRemaining = useCallback((seconds: number | null | undefined): string | null => {
    if (!seconds || seconds <= 0) return null;
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }, []);

  return {
    job,
    isPolling,
    error,
    startJob,
    fetchJobStatus,
    fetchActiveJob,
    cancelJob,
    reset,
    progress: job?.progress ?? 0,
    ticketsPerSecond: job?.tickets_per_second ?? 0,
    estimatedTimeRemaining: job?.estimated_time_remaining,
    formattedTimeRemaining: formatTimeRemaining(job?.estimated_time_remaining),
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    isRunning: job?.status === 'running' || job?.status === 'pending'
  };
}
