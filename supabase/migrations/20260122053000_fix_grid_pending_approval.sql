-- =====================================================
-- FIX: Grid not showing pending_approval tickets
--
-- Bug: get_virtual_tickets_by_range only filtered by
-- ('reserved', 'pending', 'sold') but NOT 'pending_approval'
--
-- This caused tickets with pending_approval status to
-- appear as "available" in the grid while search showed
-- them correctly as reserved.
-- =====================================================

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
      -- FIX: Added 'pending_approval' to include orders awaiting approval
      AND o.status IN ('reserved', 'pending', 'sold', 'pending_approval')
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

COMMENT ON FUNCTION get_virtual_tickets_by_range IS
'Returns virtual tickets in a range with order info.
Includes all active order statuses: reserved, pending, sold, and pending_approval.';

-- =====================================================
-- FIX: get_virtual_ticket_counts_v2 to include pending_approval
-- =====================================================
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
  -- FIX: Include pending_approval in the query
  SELECT
    COALESCE(SUM(CASE WHEN status = 'sold' THEN ticket_count ELSE 0 END), 0),
    -- pending_approval counts as reserved (awaiting approval)
    COALESCE(SUM(CASE WHEN status IN ('reserved', 'pending_approval') AND reserved_until > NOW() THEN ticket_count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending' THEN ticket_count ELSE 0 END), 0)
  INTO v_sold, v_reserved, v_pending
  FROM orders
  WHERE raffle_id = p_raffle_id
    AND status IN ('sold', 'reserved', 'pending', 'pending_approval');

  RETURN QUERY SELECT
    v_total,
    v_sold,
    v_reserved,
    v_pending,
    GREATEST(0, v_total - v_sold - v_reserved - v_pending)::BIGINT;
END;
$$;

COMMENT ON FUNCTION get_virtual_ticket_counts_v2 IS
'Returns ticket counts including pending_approval as reserved.';

-- =====================================================
-- FIX: get_occupied_indices to include pending_approval
-- This affects check_indices_available which uses it
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_occupied_indices(p_raffle_id UUID)
RETURNS INTEGER[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result INTEGER[] := '{}';
BEGIN
  SELECT array_agg(DISTINCT idx) INTO result
  FROM (
    -- Índices de lucky numbers
    SELECT unnest(lucky_indices) as idx
    FROM orders
    WHERE raffle_id = p_raffle_id
      -- FIX: Added pending_approval
      AND status IN ('reserved', 'pending', 'sold', 'pending_approval')

    UNION ALL

    -- Índices expandidos de rangos
    SELECT x as idx
    FROM orders o,
         jsonb_array_elements(o.ticket_ranges) r,
         generate_series((r.value->>'s')::INT, (r.value->>'e')::INT) x
    WHERE o.raffle_id = p_raffle_id
      -- FIX: Added pending_approval
      AND o.status IN ('reserved', 'pending', 'sold', 'pending_approval')
  ) all_indices;

  RETURN COALESCE(result, '{}');
END;
$$;

COMMENT ON FUNCTION get_occupied_indices IS
'Returns all occupied ticket indices including pending_approval orders.';
