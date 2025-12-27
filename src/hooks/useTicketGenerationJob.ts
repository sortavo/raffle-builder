import { useState, useEffect, useCallback } from 'react';
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
}

interface UseTicketGenerationJobOptions {
  onComplete?: (job: TicketGenerationJob) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

export function useTicketGenerationJob(options: UseTicketGenerationJobOptions = {}) {
  const { onComplete, onError, pollInterval = 2000 } = options;
  
  const [job, setJob] = useState<TicketGenerationJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start a new ticket generation job
  const startJob = useCallback(async (raffleId: string, forceRebuild = false) => {
    setError(null);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-tickets', {
        body: { raffle_id: raffleId, force_rebuild: forceRebuild }
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
          raffle_id: raffleId,
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
      const { data, error: invokeError } = await supabase.functions.invoke('generate-tickets', {
        body: {},
        method: 'GET'
      });

      // Since we can't pass query params easily, we'll use the direct query approach
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

      setJob(jobData);

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
  }, [onComplete, onError]);

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
          
          setJob(updatedJob);

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
  }, [job?.id, onComplete, onError]);

  return {
    job,
    isPolling,
    error,
    startJob,
    fetchJobStatus,
    cancelJob,
    reset,
    progress: job?.progress ?? 0,
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    isRunning: job?.status === 'running' || job?.status === 'pending'
  };
}
