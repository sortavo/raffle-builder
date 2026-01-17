-- Batch cleanup of expired reservations with SKIP LOCKED
-- Returns number of orders released
CREATE OR REPLACE FUNCTION cleanup_expired_reservations_batch(
  p_batch_size INTEGER DEFAULT 100,
  p_max_batches INTEGER DEFAULT 10
)
RETURNS TABLE (
  total_released INTEGER,
  total_tickets_freed BIGINT,
  batches_processed INTEGER,
  unique_raffles_affected INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_released INTEGER := 0;
  v_tickets BIGINT := 0;
  v_batch INTEGER := 0;
  v_batch_released INTEGER;
  v_batch_tickets BIGINT;
  v_raffle_ids UUID[];
  v_all_raffle_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  LOOP
    v_batch := v_batch + 1;
    EXIT WHEN v_batch > p_max_batches;

    -- Process one batch with FOR UPDATE SKIP LOCKED
    WITH expired AS (
      SELECT id, ticket_count, raffle_id
      FROM orders
      WHERE status = 'reserved'
        AND reserved_until < NOW()
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED  -- Don't block on locked rows
    ),
    updated AS (
      UPDATE orders o
      SET status = 'cancelled',
          canceled_at = NOW(),
          updated_at = NOW()
      FROM expired e
      WHERE o.id = e.id
      RETURNING o.id, o.ticket_count, o.raffle_id
    )
    SELECT 
      COUNT(*)::INTEGER, 
      COALESCE(SUM(ticket_count), 0),
      ARRAY_AGG(DISTINCT raffle_id) FILTER (WHERE raffle_id IS NOT NULL)
    INTO v_batch_released, v_batch_tickets, v_raffle_ids
    FROM updated;

    v_released := v_released + v_batch_released;
    v_tickets := v_tickets + v_batch_tickets;
    
    -- Accumulate raffle IDs
    IF v_raffle_ids IS NOT NULL THEN
      v_all_raffle_ids := v_all_raffle_ids || v_raffle_ids;
    END IF;

    -- Exit if no more expired reservations
    EXIT WHEN v_batch_released = 0;

    -- Small delay between batches to reduce lock contention
    PERFORM pg_sleep(0.01);
  END LOOP;

  RETURN QUERY SELECT 
    v_released, 
    v_tickets, 
    v_batch,
    COALESCE(array_length(array_agg(DISTINCT x), 1), 0)
  FROM unnest(v_all_raffle_ids) AS x;
END;
$$;

-- Efficient check for expired count (for monitoring)
CREATE OR REPLACE FUNCTION get_expired_reservations_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM orders
  WHERE status = 'reserved'
    AND reserved_until < NOW();
$$;