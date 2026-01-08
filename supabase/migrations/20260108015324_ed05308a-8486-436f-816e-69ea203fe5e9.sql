-- Drop and recreate reserve_virtual_tickets_resilient with dynamic error message and early validation
DROP FUNCTION IF EXISTS public.reserve_virtual_tickets_resilient(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC);

CREATE OR REPLACE FUNCTION public.reserve_virtual_tickets_resilient(
    p_raffle_id UUID,
    p_requested_indices INTEGER[],
    p_buyer_name TEXT,
    p_buyer_email TEXT,
    p_buyer_phone TEXT DEFAULT NULL,
    p_buyer_city TEXT DEFAULT NULL,
    p_reservation_minutes INTEGER DEFAULT 15,
    p_order_total NUMERIC DEFAULT NULL
)
RETURNS JSON
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
    v_inserted_count INTEGER;
    v_total_tickets INTEGER;
    v_number_start INTEGER := 1;
    v_numbering_config JSONB;
    v_ticket_number TEXT;
    v_available_count INTEGER;
    v_candidate_indices INTEGER[];
    v_candidate_n INTEGER;
    v_attempt INTEGER := 0;
    v_max_attempts INTEGER := 10;
BEGIN
    v_requested_count := array_length(p_requested_indices, 1);
    IF v_requested_count IS NULL OR v_requested_count = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No se proporcionaron índices de boletos.');
    END IF;

    -- Get raffle config
    SELECT total_tickets, numbering_config INTO v_total_tickets, v_numbering_config
    FROM raffles WHERE id = p_raffle_id;

    IF v_total_tickets IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Rifa no encontrada.');
    END IF;

    -- Get number start from numbering_config
    IF v_numbering_config IS NOT NULL AND v_numbering_config->>'start_number' IS NOT NULL THEN
        v_number_start := (v_numbering_config->>'start_number')::INTEGER;
    END IF;

    -- PHASE 3: Early validation - check if there are enough available tickets
    SELECT v_total_tickets - COUNT(*)::INTEGER INTO v_available_count
    FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id 
      AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()));
    
    IF v_available_count < v_requested_count THEN
        RETURN json_build_object(
            'success', false, 
            'error', format('Solo hay %s boletos disponibles de los %s solicitados.', v_available_count, v_requested_count)
        );
    END IF;

    -- Calculate reserved_until
    v_reserved_until := now() + (p_reservation_minutes * INTERVAL '1 minute');
    
    -- Generate reference code
    v_reference_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));

    -- Clean up expired reservations for requested indices
    DELETE FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id
      AND st.ticket_index = ANY(p_requested_indices)
      AND st.status = 'reserved'
      AND st.reserved_until <= now();

    -- Try to insert requested indices
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
            'reserved',
            p_buyer_name, p_buyer_email, p_buyer_phone, p_buyer_city,
            now(), v_reserved_until, v_reference_code, p_order_total
        FROM unnest(p_requested_indices) AS idx
        ON CONFLICT (raffle_id, ticket_index) DO NOTHING
        RETURNING ticket_index, ticket_number
    )
    SELECT 
        array_agg(ticket_number ORDER BY ticket_index),
        array_agg(ticket_index ORDER BY ticket_index)
    INTO v_final_ticket_numbers, v_final_ticket_indices
    FROM inserted;

    v_inserted_count := coalesce(array_length(v_final_ticket_numbers, 1), 0);

    -- If we got all requested, return success
    IF v_inserted_count = v_requested_count THEN
        RETURN json_build_object(
            'success', true,
            'ticketNumbers', v_final_ticket_numbers,
            'ticketIndices', v_final_ticket_indices,
            'reservedUntil', v_reserved_until,
            'referenceCode', v_reference_code,
            'inserted', v_inserted_count,
            'requested', v_requested_count
        );
    END IF;

    -- Need to fill remaining slots with random available tickets
    WHILE v_inserted_count < v_requested_count AND v_attempt < v_max_attempts LOOP
        v_attempt := v_attempt + 1;
        
        -- Calculate how many candidates to fetch (increase on each attempt)
        v_candidate_n := LEAST((v_requested_count - v_inserted_count) * (v_attempt + 1) * 3, 10000);

        -- Get random available indices
        SELECT array_agg(idx ORDER BY random()) INTO v_candidate_indices
        FROM (
            SELECT gs.idx
            FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
            WHERE gs.idx != ALL(v_final_ticket_indices)
              AND NOT EXISTS (
                  SELECT 1 FROM sold_tickets st 
                  WHERE st.raffle_id = p_raffle_id 
                    AND st.ticket_index = gs.idx
                    AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()))
              )
            LIMIT v_candidate_n
        ) sub;

        IF v_candidate_indices IS NULL OR array_length(v_candidate_indices, 1) = 0 THEN
            EXIT;
        END IF;

        -- Try to insert random candidates
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
                'reserved',
                p_buyer_name, p_buyer_email, p_buyer_phone, p_buyer_city,
                now(), v_reserved_until, v_reference_code, p_order_total
            FROM unnest(v_candidate_indices) AS idx
            ON CONFLICT (raffle_id, ticket_index) DO NOTHING
            RETURNING ticket_index, ticket_number
        )
        SELECT 
            v_final_ticket_numbers || array_agg(ticket_number ORDER BY ticket_index),
            v_final_ticket_indices || array_agg(ticket_index ORDER BY ticket_index)
        INTO v_final_ticket_numbers, v_final_ticket_indices
        FROM inserted;

        v_inserted_count := array_length(v_final_ticket_numbers, 1);
    END LOOP;

    -- Final check
    IF v_inserted_count < v_requested_count THEN
        -- Rollback all reservations made in this call
        DELETE FROM sold_tickets st
        WHERE st.raffle_id = p_raffle_id
          AND st.payment_reference = v_reference_code
          AND st.status = 'reserved';
        
        RETURN json_build_object(
            'success', false, 
            'error', format('No se pudieron reservar %s boletos. Solo pudimos encontrar %s disponibles. Intenta de nuevo.', v_requested_count, v_inserted_count)
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'ticketNumbers', v_final_ticket_numbers,
        'ticketIndices', v_final_ticket_indices,
        'reservedUntil', v_reserved_until,
        'referenceCode', v_reference_code,
        'inserted', v_inserted_count,
        'requested', v_requested_count
    );
END;
$$;