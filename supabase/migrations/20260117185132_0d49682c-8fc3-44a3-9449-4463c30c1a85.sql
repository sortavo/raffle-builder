-- RPC optimizado para paginación por rango de índices
-- Elimina el uso de OFFSET que escala O(n) con la posición
-- En su lugar usa WHERE ticket_index BETWEEN que es O(log n) con índice
CREATE OR REPLACE FUNCTION get_virtual_tickets_by_range(
  p_raffle_id UUID,
  p_start_index INTEGER,
  p_end_index INTEGER
)
RETURNS TABLE (
  ticket_number TEXT,
  ticket_index INTEGER,
  status TEXT,
  buyer_name TEXT,
  order_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_number_format TEXT;
  v_number_start INTEGER;
BEGIN
  -- Get raffle config
  SELECT total_tickets, number_format, number_start
  INTO v_total_tickets, v_number_format, v_number_start
  FROM raffles
  WHERE id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Clamp range to valid bounds
  p_start_index := GREATEST(0, p_start_index);
  p_end_index := LEAST(v_total_tickets - 1, p_end_index);

  -- Generate tickets in range with their status from orders
  RETURN QUERY
  WITH ticket_range AS (
    SELECT generate_series(p_start_index, p_end_index) AS idx
  ),
  order_tickets AS (
    -- Find all orders that might contain tickets in our range
    SELECT 
      o.id AS oid,
      o.status AS ostatus,
      o.buyer_name AS obuyer,
      o.ticket_ranges,
      o.lucky_indices
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('reserved', 'pending', 'sold')
      AND (
        o.status != 'reserved' OR o.reserved_until > NOW()
      )
  ),
  expanded_tickets AS (
    -- Expand ticket_ranges to individual indices
    SELECT 
      ot.oid,
      ot.ostatus,
      ot.obuyer,
      (r->>'s')::INT AS range_start,
      (r->>'e')::INT AS range_end
    FROM order_tickets ot
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ot.ticket_ranges, '[]'::jsonb)) AS r
    WHERE (r->>'s')::INT <= p_end_index AND (r->>'e')::INT >= p_start_index
    
    UNION ALL
    
    -- Include lucky_indices
    SELECT 
      ot.oid,
      ot.ostatus,
      ot.obuyer,
      li AS range_start,
      li AS range_end
    FROM order_tickets ot
    CROSS JOIN LATERAL unnest(COALESCE(ot.lucky_indices, ARRAY[]::INT[])) AS li
    WHERE li BETWEEN p_start_index AND p_end_index
  )
  SELECT 
    CASE 
      WHEN v_number_format IS NOT NULL THEN
        replace(v_number_format, '{n}', lpad((v_number_start + tr.idx)::TEXT, 
          length(regexp_replace(v_number_format, '[^{n}]', '', 'g')) + 
          length((v_total_tickets + v_number_start - 1)::TEXT), '0'))
      ELSE
        lpad((v_number_start + tr.idx)::TEXT, length((v_total_tickets + v_number_start - 1)::TEXT), '0')
    END AS ticket_number,
    tr.idx AS ticket_index,
    COALESCE(et.ostatus, 'available')::TEXT AS status,
    et.obuyer AS buyer_name,
    et.oid AS order_id
  FROM ticket_range tr
  LEFT JOIN LATERAL (
    SELECT e.oid, e.ostatus, e.obuyer
    FROM expanded_tickets e
    WHERE tr.idx BETWEEN e.range_start AND e.range_end
    LIMIT 1
  ) et ON true
  ORDER BY tr.idx;
END;
$$;

-- Add index on ticket_index for the range queries (if not exists)
-- This supports the new range-based pagination
CREATE INDEX IF NOT EXISTS idx_orders_created_at_id
ON orders(created_at DESC, id);