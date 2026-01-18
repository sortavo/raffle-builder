-- ============================================================================
-- Phase 1: Persistent Rate Limiter - Database Fallback Tables & Functions
-- ============================================================================
-- This provides a fallback when Redis is unavailable

-- Rate limit tracking table (fallback when Redis unavailable)
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast cleanup and counting
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
  ON public.rate_limit_entries(key_prefix, identifier, timestamp DESC);

-- Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_rate_limit_timestamp 
  ON public.rate_limit_entries(timestamp);

-- RPC function for atomic rate limit check with sliding window
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_key_prefix TEXT,
  p_window_ms INTEGER,
  p_max_requests INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_oldest TIMESTAMPTZ;
  v_reset_at BIGINT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_window_start := v_now - (p_window_ms || ' milliseconds')::INTERVAL;

  -- Clean old entries and insert new one in single transaction
  DELETE FROM public.rate_limit_entries
  WHERE identifier = p_identifier
    AND key_prefix = p_key_prefix
    AND timestamp < v_window_start;

  -- Insert new entry
  INSERT INTO public.rate_limit_entries (identifier, key_prefix, timestamp)
  VALUES (p_identifier, p_key_prefix, v_now);

  -- Count entries in window
  SELECT COUNT(*), MIN(timestamp) INTO v_count, v_oldest
  FROM public.rate_limit_entries
  WHERE identifier = p_identifier
    AND key_prefix = p_key_prefix
    AND timestamp >= v_window_start;

  v_reset_at := EXTRACT(EPOCH FROM (COALESCE(v_oldest, v_now) + (p_window_ms || ' milliseconds')::INTERVAL)) * 1000;

  RETURN jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count),
    'resetAt', v_reset_at,
    'retryAfter', CASE WHEN v_count > p_max_requests
      THEN CEIL((v_reset_at - EXTRACT(EPOCH FROM v_now) * 1000) / 1000)
      ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for old rate limit entries (called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
RETURNS void AS $$
  DELETE FROM public.rate_limit_entries
  WHERE timestamp < NOW() - INTERVAL '1 hour';
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- Phase 3: Stripe Events Table for Async Processing Idempotency
-- ============================================================================
-- Add processed_at column if it doesn't exist (for async processing tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_events' 
    AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.stripe_events 
    ADD COLUMN processed_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- Phase 5: Dynamic Cleanup Batching with Auto-Scale
-- ============================================================================
-- Drop existing function with old signature and create new one with auto-scale
DROP FUNCTION IF EXISTS public.cleanup_expired_tickets_batch(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.cleanup_expired_tickets_batch(
  p_batch_size INTEGER DEFAULT 500,
  p_max_batches INTEGER DEFAULT 20,
  p_auto_scale BOOLEAN DEFAULT true
)
RETURNS TABLE (
  total_released BIGINT,
  batches_processed INTEGER,
  affected_raffles TEXT[],
  execution_time_ms BIGINT
) AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_total_released BIGINT := 0;
  v_batch_count INTEGER := 0;
  v_batch_released BIGINT;
  v_pending_count BIGINT;
  v_effective_batch_size INTEGER;
  v_effective_max_batches INTEGER;
  v_affected_raffle_ids TEXT[] := ARRAY[]::TEXT[];
  v_batch_raffle_ids TEXT[];
BEGIN
  -- Count pending items for auto-scaling
  SELECT COUNT(*) INTO v_pending_count
  FROM public.orders
  WHERE status = 'reserved'
    AND reserved_until < NOW();

  -- Auto-scale batch parameters based on queue depth
  IF p_auto_scale THEN
    IF v_pending_count > 50000 THEN
      v_effective_batch_size := 2000;
      v_effective_max_batches := 50;
    ELSIF v_pending_count > 20000 THEN
      v_effective_batch_size := 1000;
      v_effective_max_batches := 40;
    ELSIF v_pending_count > 10000 THEN
      v_effective_batch_size := 750;
      v_effective_max_batches := 30;
    ELSE
      v_effective_batch_size := p_batch_size;
      v_effective_max_batches := p_max_batches;
    END IF;
    
    RAISE NOTICE 'Auto-scale: pending=%, batch_size=%, max_batches=%', 
      v_pending_count, v_effective_batch_size, v_effective_max_batches;
  ELSE
    v_effective_batch_size := p_batch_size;
    v_effective_max_batches := p_max_batches;
  END IF;

  -- Process batches
  WHILE v_batch_count < v_effective_max_batches LOOP
    -- Use FOR UPDATE SKIP LOCKED for non-blocking batch processing
    WITH expired_batch AS (
      SELECT id, raffle_id
      FROM public.orders
      WHERE status = 'reserved'
        AND reserved_until < NOW()
      LIMIT v_effective_batch_size
      FOR UPDATE SKIP LOCKED
    ),
    updated AS (
      UPDATE public.orders o
      SET status = 'cancelled',
          canceled_at = NOW()
      FROM expired_batch e
      WHERE o.id = e.id
      RETURNING o.id, o.raffle_id
    )
    SELECT COUNT(*), ARRAY_AGG(DISTINCT raffle_id)
    INTO v_batch_released, v_batch_raffle_ids
    FROM updated;

    EXIT WHEN v_batch_released IS NULL OR v_batch_released = 0;

    v_total_released := v_total_released + v_batch_released;
    v_batch_count := v_batch_count + 1;
    
    -- Accumulate affected raffle IDs
    IF v_batch_raffle_ids IS NOT NULL THEN
      v_affected_raffle_ids := v_affected_raffle_ids || v_batch_raffle_ids;
    END IF;

    -- Brief pause between batches to prevent lock contention
    PERFORM pg_sleep(0.01);
  END LOOP;

  -- De-duplicate affected raffles
  SELECT ARRAY_AGG(DISTINCT unnest) INTO v_affected_raffle_ids
  FROM unnest(v_affected_raffle_ids);

  RETURN QUERY SELECT 
    v_total_released,
    v_batch_count,
    COALESCE(v_affected_raffle_ids, ARRAY[]::TEXT[]),
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_entries TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tickets_batch(INTEGER, INTEGER, BOOLEAN) TO service_role;

-- RLS for rate_limit_entries (service role only for security)
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Service role can manage rate limit entries" ON public.rate_limit_entries;

CREATE POLICY "Service role can manage rate limit entries"
  ON public.rate_limit_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);