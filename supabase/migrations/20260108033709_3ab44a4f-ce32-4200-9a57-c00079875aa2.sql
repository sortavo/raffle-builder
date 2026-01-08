-- Optimized get_virtual_tickets: Use direct range generation instead of OFFSET
-- This reduces complexity from O(total_tickets) to O(page_size)
-- Expected improvement: 46s -> ~10ms for any page on 10M ticket raffles

CREATE OR REPLACE FUNCTION public.get_virtual_tickets(
  p_raffle_id uuid, 
  p_page integer DEFAULT 1, 
  p_page_size integer DEFAULT 100
)
RETURNS TABLE(
  ticket_number text, 
  ticket_index integer, 
  status text, 
  buyer_name text, 
  reserved_until timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_tickets INTEGER;
  v_numbering_config JSONB;
  v_start_idx INTEGER;
  v_end_idx INTEGER;
BEGIN
  -- Get raffle info
  SELECT r.total_tickets, r.numbering_config
  INTO v_total_tickets, v_numbering_config
  FROM raffles r
  WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Calculate exact range for this page (0-based index)
  v_start_idx := (p_page - 1) * p_page_size;
  v_end_idx := LEAST(v_start_idx + p_page_size - 1, v_total_tickets - 1);

  -- Don't query if start is beyond total
  IF v_start_idx >= v_total_tickets THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH virtual_tickets AS (
    -- Generate ONLY the indices for this page (no OFFSET needed)
    SELECT 
      gs.idx AS v_ticket_index,
      format_virtual_ticket(gs.idx, v_numbering_config, v_total_tickets) AS v_ticket_number
    FROM generate_series(v_start_idx, v_end_idx) AS gs(idx)
  )
  SELECT
    vt.v_ticket_number AS ticket_number,
    vt.v_ticket_index AS ticket_index,
    CASE
      WHEN st.id IS NULL THEN 'available'::TEXT
      WHEN st.status = 'reserved' AND st.reserved_until < NOW() THEN 'available'::TEXT
      ELSE st.status::TEXT
    END AS status,
    CASE
      WHEN st.status = 'sold' THEN st.buyer_name
      ELSE NULL
    END AS buyer_name,
    CASE
      WHEN st.status = 'reserved' AND st.reserved_until >= NOW() THEN st.reserved_until
      ELSE NULL
    END AS reserved_until
  FROM virtual_tickets vt
  LEFT JOIN sold_tickets st ON st.raffle_id = p_raffle_id AND st.ticket_index = vt.v_ticket_index
  ORDER BY vt.v_ticket_index;
END;
$function$;