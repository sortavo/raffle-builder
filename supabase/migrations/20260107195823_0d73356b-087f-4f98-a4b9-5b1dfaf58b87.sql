-- Fix parameter order in format_virtual_ticket call
-- Correct order: (p_ticket_index integer, p_numbering_config jsonb, p_total_tickets integer)

CREATE OR REPLACE FUNCTION public.reserve_virtual_tickets(
  p_raffle_id uuid,
  p_ticket_indices integer[],
  p_buyer_name text,
  p_buyer_email text,
  p_buyer_phone text,
  p_buyer_city text DEFAULT NULL,
  p_reservation_minutes integer DEFAULT 15,
  p_order_total numeric DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  reference_code text,
  reserved_until timestamp with time zone,
  reserved_count integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference_code text;
  v_reserved_until timestamptz;
  v_inserted_count integer;
  v_numbering_config jsonb;
  v_total_tickets integer;
BEGIN
  -- Generate unique reference code
  v_reference_code := generate_reference_code();
  v_reserved_until := NOW() + (p_reservation_minutes || ' minutes')::interval;
  
  -- Get numbering config and total tickets for ticket number formatting
  SELECT r.numbering_config, r.total_tickets 
  INTO v_numbering_config, v_total_tickets
  FROM raffles r
  WHERE r.id = p_raffle_id;
  
  -- First, clean up any expired reservations for the requested tickets
  DELETE FROM sold_tickets st
  WHERE st.raffle_id = p_raffle_id
    AND st.ticket_index = ANY(p_ticket_indices)
    AND st.status = 'reserved'
    AND st.reserved_until < NOW();
  
  -- Attempt atomic insert with ON CONFLICT DO NOTHING
  WITH inserted AS (
    INSERT INTO sold_tickets (
      raffle_id,
      ticket_index,
      ticket_number,
      status,
      buyer_name,
      buyer_email,
      buyer_phone,
      buyer_city,
      reserved_at,
      reserved_until,
      payment_reference,
      order_total
    )
    SELECT 
      p_raffle_id,
      idx,
      format_virtual_ticket(idx, v_numbering_config, v_total_tickets),
      'reserved'::ticket_status,
      p_buyer_name,
      p_buyer_email,
      p_buyer_phone,
      p_buyer_city,
      NOW(),
      v_reserved_until,
      v_reference_code,
      p_order_total
    FROM unnest(p_ticket_indices) AS idx
    ON CONFLICT (raffle_id, ticket_index) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;
  
  -- Check if all tickets were reserved
  IF v_inserted_count = array_length(p_ticket_indices, 1) THEN
    RETURN QUERY SELECT 
      true,
      v_reference_code,
      v_reserved_until,
      v_inserted_count,
      NULL::text;
  ELSE
    -- Rollback partial reservations
    DELETE FROM sold_tickets st
    WHERE st.payment_reference = v_reference_code;
    
    RETURN QUERY SELECT 
      false,
      NULL::text,
      NULL::timestamptz,
      0,
      'Algunos boletos ya no están disponibles'::text;
  END IF;
END;
$$;