-- Fix get_virtual_tickets_by_range to read from customization JSONB instead of non-existent columns
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
  -- FIXED: Read from customization JSONB, not non-existent columns
  SELECT 
    r.total_tickets,
    COALESCE(r.customization->>'number_format', 'numeric'),
    COALESCE((r.customization->>'number_start')::INTEGER, 1)
  INTO v_total_tickets, v_number_format, v_number_start
  FROM raffles r
  WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Clamp range to valid bounds
  p_start_index := GREATEST(0, p_start_index);
  p_end_index := LEAST(v_total_tickets - 1, p_end_index);

  -- Generate tickets with status from orders
  RETURN QUERY
  WITH ticket_range AS (
    SELECT generate_series(p_start_index, p_end_index) AS idx
  ),
  order_tickets AS (
    SELECT 
      o.id AS oid,
      o.status AS ostatus,
      o.buyer_name AS obuyer,
      o.ticket_ranges,
      o.lucky_indices
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('reserved', 'pending', 'sold')
      AND (o.status != 'reserved' OR o.reserved_until > NOW())
  ),
  expanded_tickets AS (
    SELECT 
      ot.oid, ot.ostatus, ot.obuyer,
      (r->>'s')::INT AS range_start,
      (r->>'e')::INT AS range_end
    FROM order_tickets ot
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ot.ticket_ranges, '[]'::jsonb)) AS r
    WHERE (r->>'s')::INT <= p_end_index AND (r->>'e')::INT >= p_start_index
    
    UNION ALL
    
    SELECT 
      ot.oid, ot.ostatus, ot.obuyer,
      li AS range_start, li AS range_end
    FROM order_tickets ot
    CROSS JOIN LATERAL unnest(COALESCE(ot.lucky_indices, ARRAY[]::INT[])) AS li
    WHERE li BETWEEN p_start_index AND p_end_index
  )
  SELECT 
    CASE 
      WHEN v_number_format = 'padded' THEN 
        lpad((v_number_start + tr.idx)::TEXT, length((v_total_tickets + v_number_start - 1)::TEXT), '0')
      ELSE
        (v_number_start + tr.idx)::TEXT
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