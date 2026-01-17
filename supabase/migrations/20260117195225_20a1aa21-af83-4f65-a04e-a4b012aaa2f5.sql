-- Optimized ticket counts with separate pending count
CREATE OR REPLACE FUNCTION get_virtual_ticket_counts_v2(p_raffle_id UUID)
RETURNS TABLE (
  total_count INTEGER,
  sold_count BIGINT,
  reserved_count BIGINT,
  pending_count BIGINT,
  available_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
DECLARE
  v_total INTEGER;
  v_sold BIGINT := 0;
  v_reserved BIGINT := 0;
  v_pending BIGINT := 0;
BEGIN
  -- Get total tickets from raffle (uses PK index)
  SELECT total_tickets INTO v_total
  FROM raffles WHERE id = p_raffle_id;

  IF v_total IS NULL THEN
    RETURN QUERY SELECT 0, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  -- Single aggregation query using the composite index
  SELECT
    COALESCE(SUM(CASE WHEN status = 'sold' THEN ticket_count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'reserved' AND reserved_until > NOW() THEN ticket_count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN ticket_count ELSE 0 END), 0)
  INTO v_sold, v_reserved, v_pending
  FROM orders
  WHERE raffle_id = p_raffle_id
    AND status IN ('sold', 'reserved', 'pending');

  RETURN QUERY SELECT
    v_total,
    v_sold,
    v_reserved,
    v_pending,
    GREATEST(0, v_total - v_sold - v_reserved - v_pending)::BIGINT;
END;
$$;