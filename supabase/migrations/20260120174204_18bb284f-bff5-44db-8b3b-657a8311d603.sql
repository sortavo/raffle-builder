-- Drop existing function first, then recreate with new return type
DROP FUNCTION IF EXISTS get_virtual_tickets_by_range(UUID, INTEGER, INTEGER);

-- Recreate with additional buyer fields and numbering_config support
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
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  order_id UUID,
  reference_code TEXT,
  reserved_until TIMESTAMPTZ,
  payment_proof_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_pad_enabled BOOLEAN;
  v_pad_width INTEGER;
  v_start_number INTEGER;
BEGIN
  -- Get raffle config - read from numbering_config (preferred) or customization (fallback)
  SELECT 
    r.total_tickets,
    COALESCE(
      (r.numbering_config->>'pad_enabled')::BOOLEAN,
      (r.customization->>'number_format') = 'padded',
      false
    ),
    COALESCE(
      (r.numbering_config->>'pad_width')::INTEGER,
      CASE WHEN r.total_tickets >= 100000 THEN 6
           WHEN r.total_tickets >= 10000 THEN 5
           WHEN r.total_tickets >= 1000 THEN 4
           ELSE 3 END
    ),
    COALESCE(
      (r.numbering_config->>'start_number')::INTEGER,
      (r.customization->>'number_start')::INTEGER,
      1
    )
  INTO v_total_tickets, v_pad_enabled, v_pad_width, v_start_number
  FROM raffles r
  WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Clamp indices
  p_start_index := GREATEST(0, p_start_index);
  p_end_index := LEAST(v_total_tickets - 1, p_end_index);

  RETURN QUERY
  WITH ticket_range AS (
    SELECT generate_series(p_start_index, p_end_index) AS idx
  ),
  order_tickets AS (
    SELECT 
      o.id AS oid,
      o.status AS ostatus,
      o.buyer_name AS obuyer,
      o.buyer_email AS oemail,
      o.buyer_phone AS ophone,
      o.buyer_city AS ocity,
      o.reference_code AS oref,
      o.reserved_until AS oexpiry,
      o.payment_proof_url AS oproof,
      o.ticket_ranges,
      o.lucky_indices
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('reserved', 'pending', 'sold')
  ),
  expanded_orders AS (
    SELECT 
      ot.oid,
      ot.ostatus,
      ot.obuyer,
      ot.oemail,
      ot.ophone,
      ot.ocity,
      ot.oref,
      ot.oexpiry,
      ot.oproof,
      generate_series(
        (r->>'s')::INTEGER,
        (r->>'e')::INTEGER
      ) AS ticket_idx
    FROM order_tickets ot
    CROSS JOIN LATERAL jsonb_array_elements(ot.ticket_ranges) AS r
    
    UNION ALL
    
    SELECT 
      ot.oid,
      ot.ostatus,
      ot.obuyer,
      ot.oemail,
      ot.ophone,
      ot.ocity,
      ot.oref,
      ot.oexpiry,
      ot.oproof,
      unnest(ot.lucky_indices) AS ticket_idx
    FROM order_tickets ot
    WHERE ot.lucky_indices IS NOT NULL AND array_length(ot.lucky_indices, 1) > 0
  )
  SELECT 
    CASE 
      WHEN v_pad_enabled THEN 
        lpad((v_start_number + tr.idx)::TEXT, v_pad_width, '0')
      ELSE
        (v_start_number + tr.idx)::TEXT
    END AS ticket_number,
    tr.idx AS ticket_index,
    COALESCE(eo.ostatus, 'available') AS status,
    eo.obuyer AS buyer_name,
    eo.oemail AS buyer_email,
    eo.ophone AS buyer_phone,
    eo.ocity AS buyer_city,
    eo.oid AS order_id,
    eo.oref AS reference_code,
    eo.oexpiry AS reserved_until,
    eo.oproof AS payment_proof_url
  FROM ticket_range tr
  LEFT JOIN expanded_orders eo ON eo.ticket_idx = tr.idx
  ORDER BY tr.idx;
END;
$$;