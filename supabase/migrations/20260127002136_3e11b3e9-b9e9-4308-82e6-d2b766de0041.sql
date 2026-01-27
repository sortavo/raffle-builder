-- Fix search_public_tickets to include available tickets
-- This function now generates all possible ticket indices and LEFT JOINs with status

CREATE OR REPLACE FUNCTION search_public_tickets(
  p_raffle_id UUID,
  p_search TEXT,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  ticket_index INTEGER,
  ticket_number TEXT,
  status TEXT,
  buyer_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_number_start INTEGER;
  v_step INTEGER;
  v_min_digits INTEGER;
  v_prefix TEXT;
  v_suffix TEXT;
  v_search_clean TEXT;
  v_search_num INTEGER;
  v_target_idx INTEGER;
BEGIN
  -- Get raffle config
  SELECT
    r.total_tickets,
    COALESCE((r.numbering_config->>'numberStart')::INTEGER, 
             (r.numbering_config->>'start_number')::INTEGER, 1),
    COALESCE((r.numbering_config->>'step')::INTEGER, 1),
    COALESCE((r.numbering_config->>'minDigits')::INTEGER, 
             (r.numbering_config->>'padding')::INTEGER, 0),
    COALESCE(r.numbering_config->>'prefix', ''),
    COALESCE(r.numbering_config->>'suffix', '')
  INTO v_total_tickets, v_number_start, v_step, v_min_digits, v_prefix, v_suffix
  FROM raffles r WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Auto-calculate min_digits if not set
  IF v_min_digits = 0 THEN
    v_min_digits := LENGTH((v_number_start + (v_total_tickets - 1) * v_step)::TEXT);
  END IF;

  -- Clean search input
  v_search_clean := LTRIM(p_search, '0');
  IF v_search_clean = '' THEN
    v_search_clean := '0';
  END IF;
  
  BEGIN
    v_search_num := v_search_clean::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_search_num := NULL;
  END;

  -- Calculate target index for exact match
  IF v_search_num IS NOT NULL THEN
    v_target_idx := (v_search_num - v_number_start) / v_step;
  ELSE
    v_target_idx := -1;
  END IF;

  -- Generate all matching tickets and LEFT JOIN with status
  RETURN QUERY
  SELECT
    sub.idx::INTEGER AS ticket_index,
    (v_prefix || LPAD((v_number_start + sub.idx * v_step)::TEXT, v_min_digits, '0') || v_suffix) AS ticket_number,
    COALESCE(trs.status, 'available')::TEXT AS status,
    CASE WHEN trs.order_id IS NOT NULL THEN
      (SELECT o.buyer_name FROM orders o WHERE o.id = trs.order_id LIMIT 1)
    ELSE NULL END AS buyer_name
  FROM (
    SELECT gs.idx
    FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
    WHERE 
      -- Exact match: the target index
      gs.idx = v_target_idx
      -- OR partial match in the display number
      OR (v_number_start + gs.idx * v_step)::TEXT LIKE '%' || v_search_clean || '%'
      -- OR partial match in padded format
      OR LPAD((v_number_start + gs.idx * v_step)::TEXT, v_min_digits, '0') LIKE '%' || p_search || '%'
    ORDER BY 
      -- Prioritize exact match
      CASE WHEN gs.idx = v_target_idx THEN 0 ELSE 1 END,
      gs.idx
    LIMIT p_limit
  ) sub
  LEFT JOIN ticket_reservation_status trs
    ON trs.raffle_id = p_raffle_id AND trs.ticket_index = sub.idx;
END;
$$;