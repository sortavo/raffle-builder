-- Increase timeout to 120s and optimize the conflict check for large reservations
ALTER FUNCTION atomic_reserve_tickets SET statement_timeout = '120s';

-- Create optimized version of atomic_reserve_tickets with SET-based conflict check
CREATE OR REPLACE FUNCTION public.atomic_reserve_tickets(
  p_raffle_id UUID,
  p_ticket_indices INTEGER[],
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT DEFAULT NULL,
  p_buyer_city TEXT DEFAULT NULL,
  p_reservation_minutes INTEGER DEFAULT 15,
  p_order_total NUMERIC DEFAULT NULL,
  p_is_lucky_numbers BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  order_id UUID,
  reference_code TEXT,
  reserved_until TIMESTAMPTZ,
  ticket_count INTEGER,
  ticket_ranges JSONB,
  lucky_indices INTEGER[],
  conflict_indices INTEGER[],
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout = '120s'
AS $$
DECLARE
  v_order_id UUID;
  v_reference TEXT;
  v_reserved_until TIMESTAMPTZ;
  v_conflicts INTEGER[];
  v_org_id UUID;
  v_total_tickets INTEGER;
  v_ranges JSONB;
  lock_acquired BOOLEAN;
BEGIN
  -- Use lighter lock based on raffle_id hash
  lock_acquired := pg_try_advisory_xact_lock(
    ('x' || substr(p_raffle_id::TEXT, 1, 8))::BIT(32)::BIGINT
  );

  IF NOT lock_acquired THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0::INTEGER,
      NULL::JSONB, NULL::INTEGER[], NULL::INTEGER[],
      'Raffle is busy, please retry'::TEXT;
    RETURN;
  END IF;

  -- Get raffle info
  SELECT r.organization_id, r.total_tickets
  INTO v_org_id, v_total_tickets
  FROM raffles r
  WHERE r.id = p_raffle_id AND r.status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0::INTEGER,
      NULL::JSONB, NULL::INTEGER[], NULL::INTEGER[],
      'Raffle not found or not active'::TEXT;
    RETURN;
  END IF;

  -- Validate indices in range
  IF EXISTS (
    SELECT 1 FROM unnest(p_ticket_indices) AS idx
    WHERE idx < 0 OR idx >= v_total_tickets
  ) THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0::INTEGER,
      NULL::JSONB, NULL::INTEGER[], NULL::INTEGER[],
      'Invalid ticket indices'::TEXT;
    RETURN;
  END IF;

  -- OPTIMIZED: Single-pass conflict check using set operations
  -- First, collect all taken indices from active orders in one query
  WITH requested AS (
    SELECT unnest(p_ticket_indices) AS idx
  ),
  active_orders AS (
    SELECT o.ticket_ranges, o.lucky_indices
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('reserved', 'pending', 'sold', 'pending_approval')
      AND (o.status NOT IN ('reserved', 'pending_approval') OR o.reserved_until > NOW())
  ),
  taken_from_ranges AS (
    SELECT DISTINCT generate_series((r->>'s')::INT, (r->>'e')::INT) AS idx
    FROM active_orders o, jsonb_array_elements(o.ticket_ranges) AS r
  ),
  taken_from_lucky AS (
    SELECT DISTINCT unnest(o.lucky_indices) AS idx
    FROM active_orders o
    WHERE o.lucky_indices IS NOT NULL AND array_length(o.lucky_indices, 1) > 0
  ),
  all_taken AS (
    SELECT idx FROM taken_from_ranges
    UNION
    SELECT idx FROM taken_from_lucky
  )
  SELECT ARRAY_AGG(req.idx ORDER BY req.idx)
  INTO v_conflicts
  FROM requested req
  INNER JOIN all_taken t ON req.idx = t.idx;

  IF v_conflicts IS NOT NULL AND array_length(v_conflicts, 1) > 0 THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0::INTEGER,
      NULL::JSONB, NULL::INTEGER[], v_conflicts,
      'Some tickets are no longer available'::TEXT;
    RETURN;
  END IF;

  -- Generate order reference
  v_reference := 'ORD-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_reserved_until := NOW() + (p_reservation_minutes || ' minutes')::INTERVAL;
  v_order_id := gen_random_uuid();

  -- Compress indices to ranges if not lucky numbers
  IF p_is_lucky_numbers THEN
    v_ranges := '[]'::JSONB;
  ELSE
    v_ranges := compress_ticket_indices(p_ticket_indices);
  END IF;

  -- Insert the order
  INSERT INTO orders (
    id, raffle_id, organization_id,
    buyer_name, buyer_email, buyer_phone, buyer_city,
    ticket_ranges, lucky_indices, ticket_count,
    reference_code, order_total,
    status, reserved_at, reserved_until
  ) VALUES (
    v_order_id, p_raffle_id, v_org_id,
    p_buyer_name, p_buyer_email, p_buyer_phone, p_buyer_city,
    v_ranges,
    CASE WHEN p_is_lucky_numbers THEN p_ticket_indices ELSE '{}'::INTEGER[] END,
    array_length(p_ticket_indices, 1),
    v_reference, p_order_total,
    'reserved', NOW(), v_reserved_until
  );

  RETURN QUERY SELECT
    TRUE::BOOLEAN,
    v_order_id,
    v_reference,
    v_reserved_until,
    array_length(p_ticket_indices, 1)::INTEGER,
    v_ranges,
    CASE WHEN p_is_lucky_numbers THEN p_ticket_indices ELSE '{}'::INTEGER[] END,
    NULL::INTEGER[],
    NULL::TEXT;
END;
$$;

-- Ensure compress_ticket_indices exists (was deleted in cleanup)
CREATE OR REPLACE FUNCTION public.compress_ticket_indices(p_indices INTEGER[])
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  sorted_indices INTEGER[];
  ranges JSONB := '[]'::JSONB;
  range_start INTEGER;
  range_end INTEGER;
  current_idx INTEGER;
  prev_idx INTEGER;
BEGIN
  IF p_indices IS NULL OR array_length(p_indices, 1) IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Sort and deduplicate
  SELECT ARRAY_AGG(DISTINCT x ORDER BY x) INTO sorted_indices FROM unnest(p_indices) x;
  
  IF array_length(sorted_indices, 1) = 0 THEN
    RETURN '[]'::JSONB;
  END IF;

  range_start := sorted_indices[1];
  prev_idx := sorted_indices[1];

  FOR i IN 2..array_length(sorted_indices, 1) LOOP
    current_idx := sorted_indices[i];
    IF current_idx = prev_idx + 1 THEN
      -- Continue the range
      prev_idx := current_idx;
    ELSE
      -- Close current range and start new one
      ranges := ranges || jsonb_build_object('s', range_start, 'e', prev_idx);
      range_start := current_idx;
      prev_idx := current_idx;
    END IF;
  END LOOP;

  -- Add the final range
  ranges := ranges || jsonb_build_object('s', range_start, 'e', prev_idx);

  RETURN ranges;
END;
$$;