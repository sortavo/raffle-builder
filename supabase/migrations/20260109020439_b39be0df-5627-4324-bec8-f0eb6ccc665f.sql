
-- Fix search_virtual_tickets: add search_path and update to use orders table
CREATE OR REPLACE FUNCTION public.search_virtual_tickets(
  p_raffle_id uuid, 
  p_search text, 
  p_limit integer DEFAULT 50
)
RETURNS TABLE(ticket_index integer, ticket_number text, status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
    RETURN;
  END IF;

  -- Search virtual tickets using orders architecture
  RETURN QUERY
  WITH virtual_tickets AS (
    SELECT 
      gs.idx AS v_ticket_index,
      format_virtual_ticket(gs.idx, v_numbering_config, v_total_tickets) AS v_ticket_number
    FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
  ),
  occupied_indices AS (
    SELECT DISTINCT idx.ticket_index as o_index, o.status as o_status
    FROM orders o
    CROSS JOIN LATERAL expand_order_to_indices(o.ticket_ranges, o.lucky_indices) AS idx(ticket_index)
    WHERE o.raffle_id = p_raffle_id
      AND (o.status = 'sold' OR (o.status = 'reserved' AND o.reserved_until > NOW()))
  )
  SELECT 
    vt.v_ticket_index,
    vt.v_ticket_number,
    COALESCE(oi.o_status, 'available')::text
  FROM virtual_tickets vt
  LEFT JOIN occupied_indices oi ON vt.v_ticket_index = oi.o_index
  WHERE vt.v_ticket_number ILIKE '%' || p_search || '%'
  ORDER BY vt.v_ticket_index
  LIMIT p_limit;
END;
$$;
