-- ===========================================
-- ENTERPRISE TICKET GENERATION INFRASTRUCTURE
-- ===========================================

-- Table to track ticket generation jobs
CREATE TABLE public.ticket_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_tickets INTEGER NOT NULL,
  generated_count INTEGER NOT NULL DEFAULT 0,
  current_batch INTEGER NOT NULL DEFAULT 0,
  total_batches INTEGER NOT NULL,
  batch_size INTEGER NOT NULL DEFAULT 50000,
  ticket_format TEXT NOT NULL DEFAULT 'sequential',
  ticket_prefix TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ticket_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view their job status"
ON public.ticket_generation_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.raffles r
    WHERE r.id = ticket_generation_jobs.raffle_id
    AND has_org_access(auth.uid(), r.organization_id)
  )
);

CREATE POLICY "Org members can create jobs"
ON public.ticket_generation_jobs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.raffles r
    WHERE r.id = raffle_id
    AND has_org_access(auth.uid(), r.organization_id)
  )
);

CREATE POLICY "Org members can update their jobs"
ON public.ticket_generation_jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.raffles r
    WHERE r.id = ticket_generation_jobs.raffle_id
    AND has_org_access(auth.uid(), r.organization_id)
  )
);

-- Index for efficient job queries
CREATE INDEX idx_ticket_jobs_raffle_status ON public.ticket_generation_jobs(raffle_id, status);
CREATE INDEX idx_ticket_jobs_pending ON public.ticket_generation_jobs(status) WHERE status IN ('pending', 'running');

-- ===========================================
-- SQL FUNCTION FOR MASSIVE BATCH INSERTION
-- ===========================================

CREATE OR REPLACE FUNCTION public.generate_ticket_batch(
  p_raffle_id UUID,
  p_start_number INTEGER,
  p_end_number INTEGER,
  p_format TEXT DEFAULT 'sequential',
  p_prefix TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_total_tickets INTEGER;
  v_digits INTEGER;
BEGIN
  -- Get total tickets for padding calculation
  SELECT total_tickets INTO v_total_tickets
  FROM public.raffles
  WHERE id = p_raffle_id;
  
  -- Calculate number of digits needed
  v_digits := GREATEST(3, LENGTH(v_total_tickets::TEXT));
  
  -- Insert batch of tickets
  INSERT INTO public.tickets (raffle_id, ticket_number, status)
  SELECT 
    p_raffle_id,
    CASE p_format
      WHEN 'prefixed' THEN COALESCE(p_prefix, 'TKT') || '-' || LPAD(n::TEXT, v_digits, '0')
      ELSE LPAD(n::TEXT, v_digits, '0')
    END,
    'available'
  FROM generate_series(p_start_number, p_end_number) AS n
  ON CONFLICT (raffle_id, ticket_number) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Optimized indexes (non-concurrent)
CREATE INDEX IF NOT EXISTS idx_tickets_available_partial
ON public.tickets(raffle_id, ticket_number)
WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_tickets_raffle_status_count
ON public.tickets(raffle_id, status);

-- Enable realtime for job progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_generation_jobs;