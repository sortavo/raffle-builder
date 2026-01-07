-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS claim_next_job(TEXT, INTEGER);

-- Recreate claim_next_job WITHOUT numbering_config (column doesn't exist)
CREATE OR REPLACE FUNCTION claim_next_job(p_worker_id TEXT, p_limit INTEGER DEFAULT 1)
RETURNS TABLE(
  id UUID,
  raffle_id UUID,
  total_tickets INTEGER,
  generated_count INTEGER,
  current_batch INTEGER,
  batch_size INTEGER,
  ticket_format TEXT,
  ticket_prefix TEXT,
  total_batches INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE ticket_generation_jobs
  SET 
    status = 'running',
    started_at = COALESCE(started_at, NOW())
  WHERE ticket_generation_jobs.id IN (
    SELECT tj.id
    FROM ticket_generation_jobs tj
    WHERE tj.status = 'pending'
    ORDER BY tj.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    ticket_generation_jobs.id,
    ticket_generation_jobs.raffle_id,
    ticket_generation_jobs.total_tickets,
    ticket_generation_jobs.generated_count,
    ticket_generation_jobs.current_batch,
    ticket_generation_jobs.batch_size,
    ticket_generation_jobs.ticket_format,
    ticket_generation_jobs.ticket_prefix,
    ticket_generation_jobs.total_batches;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_next_job TO authenticated, service_role;

-- Drop problematic check constraint (it's blocking valid updates)
ALTER TABLE public.ticket_generation_jobs DROP CONSTRAINT IF EXISTS check_current_batch_valid;

-- Reset failed jobs to pending so they can be retried
UPDATE public.ticket_generation_jobs
SET status = 'pending', started_at = NULL, error_message = NULL
WHERE status = 'failed';