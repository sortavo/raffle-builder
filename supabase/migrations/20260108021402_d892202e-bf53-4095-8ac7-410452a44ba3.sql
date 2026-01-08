-- Update get_virtual_tickets to read from numbering_config instead of customization
CREATE OR REPLACE FUNCTION public.get_virtual_tickets(
  p_raffle_id uuid,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 100,
  p_filter text DEFAULT 'all'::text,
  p_search text DEFAULT ''::text
)
RETURNS TABLE(
  ticket_index integer,
  ticket_number text,
  status text,
  buyer_name text,
  buyer_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_number_start INTEGER := 1;
  v_step INTEGER := 1;
  v_numbering_config JSONB;
  v_offset INTEGER;
BEGIN
  -- Get raffle info and numbering config from the correct field
  SELECT r.total_tickets, r.numbering_config
  INTO v_total_tickets, v_numbering_config
  FROM raffles r
  WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RAISE EXCEPTION 'Raffle not found';
  END IF;

  -- Extract numbering config values (use numbering_config, not customization)
  IF v_numbering_config IS NOT NULL THEN
    v_number_start := COALESCE((v_numbering_config->>'start_number')::INTEGER, 1);
    v_step := COALESCE((v_numbering_config->>'step')::INTEGER, 1);
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  -- Return virtual tickets with sold/reserved status
  RETURN QUERY
  WITH virtual_tickets AS (
    SELECT 
      gs.idx AS v_ticket_index,
      format_virtual_ticket(gs.idx, v_numbering_config, v_total_tickets) AS v_ticket_number
    FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
  ),
  sold_data AS (
    SELECT 
      st.ticket_index AS s_ticket_index,
      st.status AS s_status,
      st.buyer_name AS s_buyer_name,
      st.buyer_email AS s_buyer_email
    FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id
      AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()))
  )
  SELECT 
    vt.v_ticket_index,
    vt.v_ticket_number,
    COALESCE(sd.s_status, 'available')::text,
    sd.s_buyer_name,
    sd.s_buyer_email
  FROM virtual_tickets vt
  LEFT JOIN sold_data sd ON vt.v_ticket_index = sd.s_ticket_index
  WHERE 
    -- Apply filter
    (p_filter = 'all' OR 
     (p_filter = 'available' AND sd.s_status IS NULL) OR
     (p_filter = 'sold' AND sd.s_status = 'sold') OR
     (p_filter = 'reserved' AND sd.s_status = 'reserved'))
    -- Apply search
    AND (p_search = '' OR vt.v_ticket_number LIKE '%' || p_search || '%')
  ORDER BY vt.v_ticket_index
  OFFSET v_offset
  LIMIT p_page_size;
END;
$$;

-- Create search_virtual_tickets function for comprehensive ticket search
CREATE OR REPLACE FUNCTION public.search_virtual_tickets(
  p_raffle_id uuid,
  p_search text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  ticket_index integer,
  ticket_number text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_numbering_config JSONB;
BEGIN
  -- Get raffle info
  SELECT r.total_tickets, r.numbering_config
  INTO v_total_tickets, v_numbering_config
  FROM raffles r
  WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RAISE EXCEPTION 'Raffle not found';
  END IF;

  -- Search all virtual tickets (available + sold/reserved)
  RETURN QUERY
  WITH virtual_tickets AS (
    SELECT 
      gs.idx AS v_ticket_index,
      format_virtual_ticket(gs.idx, v_numbering_config, v_total_tickets) AS v_ticket_number
    FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
  ),
  sold_data AS (
    SELECT 
      st.ticket_index AS s_ticket_index,
      st.status AS s_status
    FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id
      AND (st.status = 'sold' OR (st.status = 'reserved' AND st.reserved_until > now()))
  )
  SELECT 
    vt.v_ticket_index,
    vt.v_ticket_number,
    COALESCE(sd.s_status, 'available')::text
  FROM virtual_tickets vt
  LEFT JOIN sold_data sd ON vt.v_ticket_index = sd.s_ticket_index
  WHERE vt.v_ticket_number LIKE '%' || p_search || '%'
  ORDER BY vt.v_ticket_index
  LIMIT p_limit;
END;
$$;