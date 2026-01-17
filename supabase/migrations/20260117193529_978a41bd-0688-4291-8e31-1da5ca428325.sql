-- =====================================================
-- PHASE 1: Atomic Reserve Tickets with Advisory Locking
-- =====================================================

-- Atomic ticket reservation with collision detection
CREATE OR REPLACE FUNCTION atomic_reserve_tickets(
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
  -- 1. Acquire advisory lock for this raffle to serialize reservations
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

  -- 2. Get raffle info
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

  -- 3. Validate indices are within bounds
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

  -- 4. Check for conflicts atomically using GIN indices
  SELECT ARRAY_AGG(DISTINCT idx ORDER BY idx)
  INTO v_conflicts
  FROM unnest(p_ticket_indices) AS idx
  WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('reserved', 'pending', 'sold')
      AND (o.status != 'reserved' OR o.reserved_until > NOW())
      AND (
        -- Check ticket_ranges using GIN index
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(o.ticket_ranges) AS r
          WHERE (r->>'s')::INT <= idx AND (r->>'e')::INT >= idx
        )
        OR
        -- Check lucky_indices using GIN index
        idx = ANY(o.lucky_indices)
      )
  );

  IF v_conflicts IS NOT NULL AND array_length(v_conflicts, 1) > 0 THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0::INTEGER,
      NULL::JSONB, NULL::INTEGER[], v_conflicts,
      'Some tickets are no longer available'::TEXT;
    RETURN;
  END IF;

  -- 5. Generate reference code and calculate expiration
  v_reference := 'ORD-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_reserved_until := NOW() + (p_reservation_minutes || ' minutes')::INTERVAL;
  v_order_id := gen_random_uuid();

  -- 6. Compress ranges if not lucky numbers
  IF p_is_lucky_numbers THEN
    v_ranges := '[]'::JSONB;
  ELSE
    v_ranges := compress_ticket_indices(p_ticket_indices);
  END IF;

  -- 7. Insert order atomically (within same transaction as lock)
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