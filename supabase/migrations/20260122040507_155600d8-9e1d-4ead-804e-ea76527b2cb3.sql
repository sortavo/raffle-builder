-- =====================================================
-- Restore original reference code format (8 chars, no prefix)
-- =====================================================

-- Update atomic_reserve_tickets_v2 to use generate_reference_code()
CREATE OR REPLACE FUNCTION public.atomic_reserve_tickets_v2(
  p_raffle_id UUID,
  p_ticket_indices INT[],
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT DEFAULT NULL,
  p_buyer_city TEXT DEFAULT NULL,
  p_reservation_minutes INT DEFAULT 15,
  p_order_total NUMERIC DEFAULT NULL,
  p_is_lucky_numbers BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  order_id UUID,
  reference_code TEXT,
  reserved_until TIMESTAMPTZ,
  ticket_count INT,
  reserved_indices INT[],
  conflict_indices INT[],
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_org_id UUID;
  v_order_id UUID;
  v_reference TEXT;
  v_reserved_until TIMESTAMPTZ;
  v_inserted_count INT := 0;
  v_conflict_arr INT[] := '{}';
  v_success_arr INT[] := '{}';
  v_ticket_ranges JSONB;
  v_idx INT;
  v_total_tickets INT;
BEGIN
  -- 1. Validate raffle exists and is active
  SELECT r.organization_id, r.total_tickets
  INTO v_org_id, v_total_tickets
  FROM raffles r
  WHERE r.id = p_raffle_id AND r.status = 'active';
  
  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 
      0, '{}'::INT[], '{}'::INT[], 'Rifa no encontrada o inactiva'::TEXT;
    RETURN;
  END IF;

  -- 2. Validate ticket indices within bounds
  FOREACH v_idx IN ARRAY p_ticket_indices LOOP
    IF v_idx < 0 OR v_idx >= v_total_tickets THEN
      RETURN QUERY SELECT 
        FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 
        0, '{}'::INT[], ARRAY[v_idx], ('Boleto fuera de rango: ' || v_idx)::TEXT;
      RETURN;
    END IF;
  END LOOP;

  -- 3. Generate reference code (restored original format) and calculate expiration
  v_reference := public.generate_reference_code();
  v_reserved_until := NOW() + (p_reservation_minutes || ' minutes')::INTERVAL;
  v_order_id := gen_random_uuid();

  -- 4. Compress ranges if not lucky numbers
  IF p_is_lucky_numbers THEN
    v_ticket_ranges := jsonb_build_array(
      jsonb_build_object('indices', p_ticket_indices, 'type', 'lucky')
    );
  ELSE
    WITH sorted AS (
      SELECT unnest(p_ticket_indices) AS idx ORDER BY 1
    ),
    grouped AS (
      SELECT idx, idx - ROW_NUMBER() OVER () AS grp FROM sorted
    ),
    ranges AS (
      SELECT MIN(idx) AS range_start, MAX(idx) AS range_end 
      FROM grouped GROUP BY grp
    )
    SELECT jsonb_agg(
      jsonb_build_object('start', range_start, 'end', range_end)
    ) INTO v_ticket_ranges FROM ranges;
  END IF;

  -- 5. Create order first
  INSERT INTO orders (
    id, raffle_id, organization_id, reference_code, status,
    buyer_name, buyer_email, buyer_phone, buyer_city,
    ticket_count, ticket_ranges, order_total, reserved_at, reserved_until,
    lucky_indices
  ) VALUES (
    v_order_id, p_raffle_id, v_org_id, v_reference, 'reserved',
    p_buyer_name, p_buyer_email, p_buyer_phone, p_buyer_city,
    array_length(p_ticket_indices, 1), v_ticket_ranges, p_order_total,
    NOW(), v_reserved_until,
    CASE WHEN p_is_lucky_numbers THEN p_ticket_indices ELSE NULL END
  );

  -- 6. Atomic insert with conflict detection using INSERT ON CONFLICT
  WITH to_insert AS (
    SELECT p_raffle_id AS raffle_id, 
           unnest(p_ticket_indices) AS ticket_index,
           'reserved'::TEXT AS status,
           v_order_id AS order_id,
           v_reserved_until AS reserved_until
  ),
  inserted AS (
    INSERT INTO ticket_reservation_status (raffle_id, ticket_index, status, order_id, reserved_until)
    SELECT * FROM to_insert
    ON CONFLICT (raffle_id, ticket_index) DO NOTHING
    RETURNING ticket_index
  )
  SELECT array_agg(ticket_index), count(*) 
  INTO v_success_arr, v_inserted_count
  FROM inserted;

  -- 7. Handle empty result (all conflicts)
  IF v_success_arr IS NULL THEN
    v_success_arr := '{}';
    v_inserted_count := 0;
  END IF;

  -- 8. Detect conflicts
  SELECT array_agg(idx) INTO v_conflict_arr
  FROM unnest(p_ticket_indices) AS idx
  WHERE NOT (idx = ANY(v_success_arr));
  
  IF v_conflict_arr IS NULL THEN
    v_conflict_arr := '{}';
  END IF;

  -- 9. If no tickets reserved, rollback order and return failure
  IF v_inserted_count = 0 THEN
    DELETE FROM orders WHERE id = v_order_id;
    
    RETURN QUERY SELECT 
      FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ,
      0, '{}'::INT[], v_conflict_arr, 'Todos los boletos ya están ocupados'::TEXT;
    RETURN;
  END IF;

  -- 10. Update order with actual reserved count if partial
  IF v_inserted_count < array_length(p_ticket_indices, 1) THEN
    -- Recalculate ranges with only successful tickets
    IF p_is_lucky_numbers THEN
      v_ticket_ranges := jsonb_build_array(
        jsonb_build_object('indices', v_success_arr, 'type', 'lucky')
      );
    ELSE
      WITH sorted AS (
        SELECT unnest(v_success_arr) AS idx ORDER BY 1
      ),
      grouped AS (
        SELECT idx, idx - ROW_NUMBER() OVER () AS grp FROM sorted
      ),
      ranges AS (
        SELECT MIN(idx) AS range_start, MAX(idx) AS range_end 
        FROM grouped GROUP BY grp
      )
      SELECT jsonb_agg(
        jsonb_build_object('start', range_start, 'end', range_end)
      ) INTO v_ticket_ranges FROM ranges;
    END IF;

    UPDATE orders 
    SET ticket_count = v_inserted_count,
        ticket_ranges = v_ticket_ranges,
        lucky_indices = CASE WHEN p_is_lucky_numbers THEN v_success_arr ELSE NULL END
    WHERE id = v_order_id;
  END IF;

  -- 11. Return success
  RETURN QUERY SELECT 
    TRUE,
    v_order_id,
    v_reference,
    v_reserved_until,
    v_inserted_count,
    v_success_arr,
    v_conflict_arr,
    CASE 
      WHEN array_length(v_conflict_arr, 1) > 0 
      THEN 'Reservación parcial: algunos boletos no disponibles'
      ELSE NULL 
    END::TEXT;
END;
$$;

COMMENT ON FUNCTION public.atomic_reserve_tickets_v2 IS 
  'Atomic O(k) ticket reservation using INSERT ON CONFLICT. Uses generate_reference_code() for clean 8-char codes.';