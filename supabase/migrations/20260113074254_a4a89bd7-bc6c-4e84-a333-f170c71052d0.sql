-- Update get_virtual_ticket_counts to include 'pending' status in reserved count
-- This fixes the statistics showing pending tickets as available
CREATE OR REPLACE FUNCTION get_virtual_ticket_counts(p_raffle_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  sold_count BIGINT,
  reserved_count BIGINT,
  available_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_tickets INTEGER;
BEGIN
  SELECT r.total_tickets INTO v_total_tickets
  FROM raffles r WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      -- Sold: only fully paid orders
      COALESCE(SUM(CASE WHEN o.status = 'sold' THEN o.ticket_count ELSE 0 END), 0) as sold,
      -- Reserved: include 'reserved' with valid time AND 'pending' (waiting for approval)
      COALESCE(SUM(CASE 
        WHEN o.status = 'pending' THEN o.ticket_count
        WHEN o.status = 'reserved' AND o.reserved_until > NOW() THEN o.ticket_count 
        ELSE 0 
      END), 0) as reserved
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
  )
  SELECT 
    v_total_tickets::BIGINT,
    os.sold::BIGINT,
    os.reserved::BIGINT,
    GREATEST(0, v_total_tickets - os.sold - os.reserved)::BIGINT
  FROM order_stats os;
END;
$$;