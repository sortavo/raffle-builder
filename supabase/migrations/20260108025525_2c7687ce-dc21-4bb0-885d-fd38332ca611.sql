-- Drop the existing function with incorrect return format
DROP FUNCTION IF EXISTS public.reserve_virtual_tickets_resilient(uuid, integer[], text, text, text, text, integer, numeric);

-- Recreate with proper aggregated return format matching frontend expectations
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
  success boolean,
  reference_code text,
  reserved_until timestamptz,
  reserved_count integer,
  ticket_indices integer[],
  ticket_numbers text[],
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserved_until TIMESTAMPTZ;
  v_reference_code TEXT;
  v_requested_count INTEGER;
  v_final_ticket_numbers TEXT[] := '{}';
  v_final_ticket_indices INTEGER[] := '{}';
  v_inserted_count INTEGER := 0;
  v_total_tickets INTEGER;
  v_numbering_config JSONB;
  v_available_count INTEGER;
  v_candidate_indices INTEGER[];
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 10;
  v_new_indices INTEGER[];
  v_new_numbers TEXT[];
BEGIN
  -- Validate input
  v_requested_count := array_length(p_ticket_indices, 1);
  IF v_requested_count IS NULL OR v_requested_count = 0 THEN
    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::timestamptz, 
      0, 
      NULL::integer[], 
      NULL::text[],
      'No se proporcionaron índices de boletos.'::text;
    RETURN;
  END IF;

  IF v_requested_count > 10000 THEN
    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::timestamptz, 
      0, 
      NULL::integer[], 
      NULL::text[],
      'No se pueden reservar más de 10,000 boletos a la vez.'::text;
    RETURN;
  END IF;

  -- Get raffle config
  SELECT r.total_tickets, r.numbering_config 
  INTO v_total_tickets, v_numbering_config
  FROM raffles r WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::timestamptz, 
      0, 
      NULL::integer[], 
      NULL::text[],
      'Rifa no encontrada.'::text;
    RETURN;
  END IF;

  -- Early validation: check available tickets count
  SELECT v_total_tickets - COUNT(*)::INTEGER INTO v_available_count
  FROM sold_tickets st
  WHERE st.raffle_id = p_raffle_id 
    AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()));
  
  IF v_available_count < v_requested_count THEN
    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::timestamptz, 
      0, 
      NULL::integer[], 
      NULL::text[],
      format('Solo hay %s boletos disponibles de los %s solicitados.', v_available_count, v_requested_count)::text;
    RETURN;
  END IF;

  v_reserved_until := now() + (p_reservation_minutes * INTERVAL '1 minute');
  v_reference_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

  -- Clean up expired reservations for requested indices only
  DELETE FROM sold_tickets st
  WHERE st.raffle_id = p_raffle_id
    AND st.ticket_index = ANY(p_ticket_indices)
    AND st.status = 'reserved'
    AND st.reserved_until <= now();

  -- Insert requested indices with ON CONFLICT DO NOTHING
  WITH inserted AS (
    INSERT INTO sold_tickets (
      raffle_id, ticket_index, ticket_number, status, 
      buyer_name, buyer_email, buyer_phone, buyer_city,
      reserved_at, reserved_until, payment_reference, order_total
    )
    SELECT 
      p_raffle_id,
      idx,
      format_virtual_ticket(idx, v_numbering_config, v_total_tickets),
      'reserved'::ticket_status,
      p_buyer_name, p_buyer_email, p_buyer_phone, p_buyer_city,
      now(), v_reserved_until, v_reference_code, p_order_total
    FROM unnest(p_ticket_indices) AS idx
    ON CONFLICT (raffle_id, ticket_index) DO NOTHING
    RETURNING sold_tickets.ticket_index AS r_idx, sold_tickets.ticket_number AS r_num
  )
  SELECT 
    COALESCE(array_agg(r_idx ORDER BY r_idx), ARRAY[]::integer[]),
    COALESCE(array_agg(r_num ORDER BY r_idx), ARRAY[]::text[])
  INTO v_final_ticket_indices, v_final_ticket_numbers
  FROM inserted;

  v_inserted_count := COALESCE(array_length(v_final_ticket_indices, 1), 0);

  -- If we got all requested, return success immediately
  IF v_inserted_count = v_requested_count THEN
    RETURN QUERY SELECT 
      true, 
      v_reference_code, 
      v_reserved_until, 
      v_inserted_count,
      v_final_ticket_indices, 
      v_final_ticket_numbers,
      NULL::text;
    RETURN;
  END IF;

  -- Need to fill remaining slots with random available tickets
  WHILE v_inserted_count < v_requested_count AND v_attempt < v_max_attempts LOOP
    v_attempt := v_attempt + 1;
    
    -- Get random available indices (batch size increases with attempts)
    SELECT array_agg(sub.idx ORDER BY random()) INTO v_candidate_indices
    FROM (
      SELECT gs.idx
      FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
      WHERE gs.idx != ALL(COALESCE(v_final_ticket_indices, ARRAY[]::integer[]))
        AND NOT EXISTS (
          SELECT 1 FROM sold_tickets st 
          WHERE st.raffle_id = p_raffle_id 
            AND st.ticket_index = gs.idx
            AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()))
        )
      LIMIT LEAST((v_requested_count - v_inserted_count) * (v_attempt + 1) * 3, 15000)
    ) sub;

    IF v_candidate_indices IS NULL OR array_length(v_candidate_indices, 1) = 0 THEN
      EXIT;
    END IF;

    -- Insert random candidates
    WITH inserted AS (
      INSERT INTO sold_tickets (
        raffle_id, ticket_index, ticket_number, status,
        buyer_name, buyer_email, buyer_phone, buyer_city,
        reserved_at, reserved_until, payment_reference, order_total
      )
      SELECT 
        p_raffle_id,
        idx,
        format_virtual_ticket(idx, v_numbering_config, v_total_tickets),
        'reserved'::ticket_status,
        p_buyer_name, p_buyer_email, p_buyer_phone, p_buyer_city,
        now(), v_reserved_until, v_reference_code, p_order_total
      FROM unnest(v_candidate_indices) AS idx
      LIMIT (v_requested_count - v_inserted_count)
      ON CONFLICT (raffle_id, ticket_index) DO NOTHING
      RETURNING sold_tickets.ticket_index AS r_idx, sold_tickets.ticket_number AS r_num
    )
    SELECT 
      COALESCE(array_agg(r_idx ORDER BY r_idx), ARRAY[]::integer[]),
      COALESCE(array_agg(r_num ORDER BY r_idx), ARRAY[]::text[])
    INTO v_new_indices, v_new_numbers
    FROM inserted;

    -- Append new results
    IF v_new_indices IS NOT NULL AND array_length(v_new_indices, 1) > 0 THEN
      v_final_ticket_indices := v_final_ticket_indices || v_new_indices;
      v_final_ticket_numbers := v_final_ticket_numbers || v_new_numbers;
      v_inserted_count := array_length(v_final_ticket_indices, 1);
    END IF;
  END LOOP;

  -- Final check: did we get enough?
  IF v_inserted_count < v_requested_count THEN
    -- Rollback all reservations made with this reference
    DELETE FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id
      AND st.payment_reference = v_reference_code
      AND st.status = 'reserved';
    
    RETURN QUERY SELECT 
      false, 
      NULL::text, 
      NULL::timestamptz, 
      0,
      NULL::integer[], 
      NULL::text[],
      format('No se pudieron reservar %s boletos. Solo encontramos %s disponibles.', v_requested_count, v_inserted_count)::text;
    RETURN;
  END IF;

  -- Success with all requested tickets
  RETURN QUERY SELECT 
    true, 
    v_reference_code, 
    v_reserved_until, 
    v_inserted_count,
    v_final_ticket_indices, 
    v_final_ticket_numbers,
    NULL::text;
END;
$$;