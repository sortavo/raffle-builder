-- Drop existing function with different return type
DROP FUNCTION IF EXISTS refresh_raffle_stats();

-- Function to refresh materialized view (called from edge function)
CREATE OR REPLACE FUNCTION refresh_raffle_stats()
RETURNS TABLE (
  refreshed_at TIMESTAMPTZ,
  duration_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  v_start := clock_timestamp();
  
  REFRESH MATERIALIZED VIEW CONCURRENTLY raffle_stats_mv;
  
  v_end := clock_timestamp();
  
  RETURN QUERY SELECT 
    v_end,
    (EXTRACT(EPOCH FROM (v_end - v_start)) * 1000)::INTEGER;
END;
$$;

-- Fast stats retrieval from materialized view
CREATE OR REPLACE FUNCTION get_raffle_stats_fast(p_raffle_id UUID)
RETURNS TABLE (
  total_tickets INTEGER,
  sold_count BIGINT,
  reserved_count BIGINT,
  pending_count BIGINT,
  available_count BIGINT,
  total_revenue NUMERIC,
  unique_buyers BIGINT,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.total_tickets::INTEGER,
    mv.sold_count::BIGINT,
    mv.reserved_count::BIGINT,
    0::BIGINT AS pending_count,
    (mv.total_tickets - mv.sold_count - mv.reserved_count)::BIGINT AS available_count,
    mv.revenue,
    mv.unique_buyers::BIGINT,
    NOW() AS last_updated
  FROM raffle_stats_mv mv
  WHERE mv.raffle_id = p_raffle_id;
END;
$$;