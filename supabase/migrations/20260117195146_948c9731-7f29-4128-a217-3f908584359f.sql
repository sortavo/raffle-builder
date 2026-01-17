-- Cursor-based pagination for buyers (O(log n) vs O(n) with OFFSET)
CREATE OR REPLACE FUNCTION get_buyers_cursor(
  p_raffle_id UUID,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_cursor_id UUID DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  status TEXT,
  ticket_count BIGINT,
  order_total NUMERIC,
  reference_code TEXT,
  created_at TIMESTAMPTZ,
  reserved_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_proof_url TEXT,
  has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  RETURN QUERY
  WITH filtered_orders AS (
    SELECT
      o.id,
      o.buyer_name,
      o.buyer_email,
      o.buyer_phone,
      o.buyer_city,
      o.status,
      o.ticket_count::BIGINT,
      o.order_total,
      o.reference_code,
      o.created_at,
      o.reserved_at,
      o.sold_at,
      o.payment_method,
      o.payment_proof_url
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND (p_status IS NULL OR o.status = p_status)
      AND (p_search IS NULL OR
           o.buyer_name ILIKE '%' || p_search || '%' OR
           o.buyer_email ILIKE '%' || p_search || '%' OR
           o.reference_code ILIKE '%' || p_search || '%')
      -- Cursor condition: skip already seen records (keyset pagination)
      AND (
        p_cursor_created_at IS NULL
        OR (o.created_at, o.id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY o.created_at DESC, o.id DESC
    LIMIT p_limit + 1  -- Fetch one extra to check if there's more
  )
  SELECT
    fo.id,
    fo.buyer_name,
    fo.buyer_email,
    fo.buyer_phone,
    fo.buyer_city,
    fo.status,
    fo.ticket_count,
    fo.order_total,
    fo.reference_code,
    fo.created_at,
    fo.reserved_at,
    fo.sold_at,
    fo.payment_method,
    fo.payment_proof_url,
    -- has_more is true if we got more than p_limit rows
    (SELECT COUNT(*) FROM filtered_orders) > p_limit
  FROM filtered_orders fo
  LIMIT p_limit;
END;
$$;

-- Create composite index for cursor pagination (keyset)
CREATE INDEX IF NOT EXISTS idx_orders_cursor_pagination
ON orders(raffle_id, created_at DESC, id DESC)
WHERE status IN ('reserved', 'pending', 'sold');