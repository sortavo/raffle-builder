-- PHASE 1: Fix format_virtual_ticket formula
-- Current formula uses (p_ticket_index - 1) which is incorrect
-- Correct formula: v_start_number + p_ticket_index * v_step

CREATE OR REPLACE FUNCTION public.format_virtual_ticket(
  p_ticket_index integer,
  p_numbering_config jsonb,
  p_total_tickets integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_format text;
  v_padding integer;
  v_prefix text;
  v_suffix text;
  v_start_number integer;
  v_step integer;
  v_display_number integer;
  v_number_str text;
BEGIN
  -- Extract config with defaults
  v_format := COALESCE(p_numbering_config->>'format', 'zeros_auto');
  v_padding := COALESCE((p_numbering_config->>'padding')::integer, 0);
  v_prefix := COALESCE(p_numbering_config->>'prefix', '');
  v_suffix := COALESCE(p_numbering_config->>'suffix', '');
  v_start_number := COALESCE((p_numbering_config->>'start_number')::integer, 1);
  v_step := COALESCE((p_numbering_config->>'step')::integer, 1);
  
  -- PHASE 1 FIX: Calculate display number correctly
  -- index=0 should produce start_number (e.g., 1)
  -- index=1 should produce start_number + step (e.g., 2)
  v_display_number := v_start_number + p_ticket_index * v_step;
  
  -- Apply format
  IF v_format = 'zeros_auto' THEN
    -- Auto-calculate padding based on total tickets
    v_padding := GREATEST(v_padding, LENGTH(p_total_tickets::text));
    v_number_str := LPAD(v_display_number::text, v_padding, '0');
  ELSIF v_format = 'zeros' THEN
    -- Use specified padding
    v_number_str := LPAD(v_display_number::text, GREATEST(v_padding, 1), '0');
  ELSE
    -- No padding
    v_number_str := v_display_number::text;
  END IF;
  
  -- Apply prefix and suffix
  RETURN v_prefix || v_number_str || v_suffix;
END;
$$;

-- Drop the existing function first (required to change return type)
DROP FUNCTION IF EXISTS public.reserve_virtual_tickets_resilient(uuid, integer[], text, text, text, text, integer, numeric);

-- PHASE 4: Recreate reserve_virtual_tickets_resilient with optimizations
CREATE OR REPLACE FUNCTION public.reserve_virtual_tickets_resilient(
  p_raffle_id uuid,
  p_ticket_indices integer[],
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text DEFAULT NULL,
  p_buyer_city text DEFAULT NULL,
  p_reservation_minutes integer DEFAULT 15,
  p_order_total numeric DEFAULT NULL
)
RETURNS TABLE(
  ticket_index integer,
  ticket_number text,
  reserved_until timestamptz,
  reference_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_count integer;
  v_numbering_config jsonb;
  v_total_tickets integer;
  v_reserved_until timestamptz;
  v_reference_code text;
  v_inserted_count integer;
  v_final_ticket_indices integer[];
  v_available_count integer;
  v_max_attempts integer := 3;
  v_attempt integer := 0;
BEGIN
  v_requested_count := array_length(p_ticket_indices, 1);
  
  IF v_requested_count IS NULL OR v_requested_count = 0 THEN
    RAISE EXCEPTION 'No se proporcionaron índices de boletos';
  END IF;

  -- Get raffle config
  SELECT r.numbering_config, r.total_tickets
  INTO v_numbering_config, v_total_tickets
  FROM raffles r
  WHERE r.id = p_raffle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rifa no encontrada';
  END IF;

  -- PHASE 4: Early availability validation
  -- Check how many tickets are actually available before attempting reservations
  SELECT v_total_tickets - COUNT(*)
  INTO v_available_count
  FROM sold_tickets st
  WHERE st.raffle_id = p_raffle_id
    AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()));

  IF v_available_count < v_requested_count THEN
    RAISE EXCEPTION 'Solo hay % boletos disponibles, pero solicitaste %. Por favor reduce tu selección.', 
      v_available_count, v_requested_count;
  END IF;

  v_reserved_until := now() + (p_reservation_minutes || ' minutes')::interval;
  v_reference_code := 'REF-' || UPPER(SUBSTRING(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));

  -- Start with requested indices
  v_final_ticket_indices := p_ticket_indices;

  -- First attempt: cleanup expired and insert requested
  DELETE FROM sold_tickets st
  WHERE st.raffle_id = p_raffle_id
    AND st.ticket_index = ANY(p_ticket_indices)
    AND st.status = 'reserved'
    AND st.reserved_until < now();

  INSERT INTO sold_tickets (
    raffle_id, ticket_index, ticket_number,
    buyer_name, buyer_email, buyer_phone, buyer_city,
    status, reserved_at, reserved_until, payment_reference, order_total
  )
  SELECT
    p_raffle_id,
    idx,
    format_virtual_ticket(idx, v_numbering_config, v_total_tickets),
    p_buyer_name,
    p_buyer_email,
    p_buyer_phone,
    p_buyer_city,
    'reserved',
    now(),
    v_reserved_until,
    v_reference_code,
    p_order_total
  FROM unnest(p_ticket_indices) AS idx
  ON CONFLICT (raffle_id, ticket_index) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  -- If we got all we needed, return immediately
  IF v_inserted_count = v_requested_count THEN
    RETURN QUERY
    SELECT st.ticket_index, st.ticket_number, st.reserved_until, st.payment_reference
    FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id
      AND st.payment_reference = v_reference_code;
    RETURN;
  END IF;

  -- Get what was actually inserted
  SELECT array_agg(st.ticket_index)
  INTO v_final_ticket_indices
  FROM sold_tickets st
  WHERE st.raffle_id = p_raffle_id
    AND st.payment_reference = v_reference_code;

  IF v_final_ticket_indices IS NULL THEN
    v_final_ticket_indices := ARRAY[]::integer[];
  END IF;

  -- Try to fill the gap with random available tickets
  WHILE array_length(v_final_ticket_indices, 1) < v_requested_count AND v_attempt < v_max_attempts LOOP
    v_attempt := v_attempt + 1;
    
    DECLARE
      v_needed integer;
      v_candidate_indices integer[];
    BEGIN
      v_needed := v_requested_count - COALESCE(array_length(v_final_ticket_indices, 1), 0);
      
      -- PHASE 4: Optimized candidate selection using sampling
      WITH random_candidates AS (
        SELECT gs.idx
        FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
        WHERE NOT EXISTS (
            SELECT 1 FROM sold_tickets st 
            WHERE st.raffle_id = p_raffle_id 
              AND st.ticket_index = gs.idx
              AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()))
        )
          AND gs.idx != ALL(v_final_ticket_indices)
        ORDER BY random()
        LIMIT v_needed * 3
      )
      SELECT array_agg(idx ORDER BY random())
      INTO v_candidate_indices
      FROM random_candidates;

      IF v_candidate_indices IS NULL OR array_length(v_candidate_indices, 1) = 0 THEN
        EXIT;
      END IF;

      -- Trim to exactly what we need
      v_candidate_indices := v_candidate_indices[1:v_needed];

      -- Insert candidates
      INSERT INTO sold_tickets (
        raffle_id, ticket_index, ticket_number,
        buyer_name, buyer_email, buyer_phone, buyer_city,
        status, reserved_at, reserved_until, payment_reference, order_total
      )
      SELECT
        p_raffle_id,
        idx,
        format_virtual_ticket(idx, v_numbering_config, v_total_tickets),
        p_buyer_name,
        p_buyer_email,
        p_buyer_phone,
        p_buyer_city,
        'reserved',
        now(),
        v_reserved_until,
        v_reference_code,
        p_order_total
      FROM unnest(v_candidate_indices) AS idx
      ON CONFLICT (raffle_id, ticket_index) DO NOTHING;

      -- Refresh the list
      SELECT array_agg(st.ticket_index)
      INTO v_final_ticket_indices
      FROM sold_tickets st
      WHERE st.raffle_id = p_raffle_id
        AND st.payment_reference = v_reference_code;
    END;
  END LOOP;

  v_inserted_count := COALESCE(array_length(v_final_ticket_indices, 1), 0);

  IF v_inserted_count = 0 THEN
    RAISE EXCEPTION 'No se pudo reservar ningún boleto. Por favor intenta de nuevo.';
  END IF;

  IF v_inserted_count < v_requested_count THEN
    -- PHASE 1: Dynamic error message with actual counts
    RAISE EXCEPTION 'No se pudieron reservar % boletos. Solo pudimos encontrar % disponibles. Intenta de nuevo.', 
      v_requested_count, v_inserted_count;
  END IF;

  RETURN QUERY
  SELECT st.ticket_index, st.ticket_number, st.reserved_until, st.payment_reference
  FROM sold_tickets st
  WHERE st.raffle_id = p_raffle_id
    AND st.payment_reference = v_reference_code;
END;
$$;

-- Add partial index for faster availability queries (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_sold_tickets_unavailable 
ON sold_tickets (raffle_id, ticket_index) 
WHERE status IN ('sold', 'reserved');