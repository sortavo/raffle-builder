-- Corregir función get_virtual_tickets - reemplazar 'upcoming' (no existe) con 'paused'
CREATE OR REPLACE FUNCTION get_virtual_tickets(
  p_raffle_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  ticket_index INTEGER,
  status TEXT,
  buyer_name TEXT,
  buyer_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_numbering_config JSONB;
  v_start_index INTEGER;
  v_end_index INTEGER;
BEGIN
  -- Get raffle config (CORREGIDO: sin 'upcoming', usando valores válidos del enum)
  SELECT r.total_tickets, COALESCE(r.numbering_config, '{}'::jsonb)
  INTO v_total_tickets, v_numbering_config
  FROM raffles r
  WHERE r.id = p_raffle_id 
    AND r.status IN ('active', 'draft', 'paused');

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Calculate range (1-indexed)
  v_start_index := ((p_page - 1) * p_page_size) + 1;
  v_end_index := LEAST(v_start_index + p_page_size - 1, v_total_tickets);

  -- Return virtual tickets merged with sold tickets
  RETURN QUERY
  WITH virtual_range AS (
    SELECT generate_series(v_start_index, v_end_index) AS idx
  ),
  sold AS (
    SELECT 
      st.id,
      st.ticket_index,
      st.status::TEXT AS st_status,
      st.buyer_name AS st_buyer_name,
      st.buyer_city AS st_buyer_city
    FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id
      AND st.ticket_index BETWEEN v_start_index AND v_end_index
  )
  SELECT 
    COALESCE(s.id, gen_random_uuid()) AS id,
    format_virtual_ticket(v_numbering_config, vr.idx, v_total_tickets) AS ticket_number,
    vr.idx AS ticket_index,
    COALESCE(s.st_status, 'available') AS status,
    s.st_buyer_name AS buyer_name,
    s.st_buyer_city AS buyer_city
  FROM virtual_range vr
  LEFT JOIN sold s ON s.ticket_index = vr.idx
  ORDER BY vr.idx;
END;
$$;