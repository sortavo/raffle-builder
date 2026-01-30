-- Create dashboard ticket search function with flexible matching
-- Supports: exact match, partial match, and matches across all tickets

CREATE OR REPLACE FUNCTION public.search_dashboard_tickets(
  p_raffle_id UUID,
  p_search TEXT,
  p_status_filter TEXT DEFAULT NULL,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  ticket_index INTEGER,
  ticket_number TEXT,
  status TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  order_id UUID,
  reference_code TEXT,
  reserved_until TIMESTAMPTZ,
  payment_proof_url TEXT
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
  v_search_clean TEXT;
  v_search_num INTEGER;
  v_padded_search TEXT;
BEGIN
  -- Get raffle config
  SELECT
    r.total_tickets,
    COALESCE((r.numbering_config->>'start')::INTEGER, COALESCE((r.numbering_config->>'numberStart')::INTEGER, 1)),
    COALESCE((r.numbering_config->>'step')::INTEGER, 1),
    COALESCE((r.numbering_config->>'minDigits')::INTEGER, 0)
  INTO v_total_tickets, v_number_start, v_step, v_min_digits
  FROM raffles r WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Clean search: remove leading zeros for flexible matching
  v_search_clean := LTRIM(p_search, '0');
  IF v_search_clean = '' THEN
    v_search_clean := '0';
  END IF;

  -- Calculate minimum padding
  v_min_digits := GREATEST(v_min_digits, LENGTH((v_number_start + (v_total_tickets - 1) * v_step)::TEXT));
  
  -- Padded search for exact padded match
  v_padded_search := LPAD(v_search_clean, v_min_digits, '0');

  -- Try to parse as number for exact index lookup
  BEGIN
    v_search_num := v_search_clean::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_search_num := NULL;
  END;

  -- Return matching tickets using generate_series for full flexibility
  RETURN QUERY
  SELECT
    gs.idx AS ticket_index,
    LPAD((v_number_start + gs.idx * v_step)::TEXT, v_min_digits, '0') AS ticket_number,
    COALESCE(trs.status, 'available') AS status,
    o.buyer_name,
    o.buyer_email,
    o.buyer_phone,
    o.buyer_city,
    trs.order_id,
    o.reference_code,
    trs.reserved_until,
    o.payment_proof_url
  FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
  LEFT JOIN ticket_reservation_status trs 
    ON trs.raffle_id = p_raffle_id AND trs.ticket_index = gs.idx
  LEFT JOIN orders o ON o.id = trs.order_id
  WHERE (
    -- Match: ticket number contains search string
    LPAD((v_number_start + gs.idx * v_step)::TEXT, v_min_digits, '0') LIKE '%' || p_search || '%'
    -- OR match: unpadded number contains search
    OR (v_number_start + gs.idx * v_step)::TEXT LIKE '%' || v_search_clean || '%'
    -- OR exact index match (for direct ticket lookup)
    OR (v_search_num IS NOT NULL AND gs.idx = v_search_num - v_number_start)
  )
  AND (
    p_status_filter IS NULL 
    OR p_status_filter = 'all'
    OR (p_status_filter = 'available' AND trs.status IS NULL)
    OR (p_status_filter = trs.status)
  )
  ORDER BY gs.idx
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

-- Create count function for search results pagination
CREATE OR REPLACE FUNCTION public.count_dashboard_tickets_search(
  p_raffle_id UUID,
  p_search TEXT,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS INTEGER
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
  v_search_clean TEXT;
  v_search_num INTEGER;
  v_count INTEGER;
BEGIN
  -- Get raffle config
  SELECT
    r.total_tickets,
    COALESCE((r.numbering_config->>'start')::INTEGER, COALESCE((r.numbering_config->>'numberStart')::INTEGER, 1)),
    COALESCE((r.numbering_config->>'step')::INTEGER, 1),
    COALESCE((r.numbering_config->>'minDigits')::INTEGER, 0)
  INTO v_total_tickets, v_number_start, v_step, v_min_digits
  FROM raffles r WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN 0;
  END IF;

  -- Clean search
  v_search_clean := LTRIM(p_search, '0');
  IF v_search_clean = '' THEN
    v_search_clean := '0';
  END IF;

  v_min_digits := GREATEST(v_min_digits, LENGTH((v_number_start + (v_total_tickets - 1) * v_step)::TEXT));

  BEGIN
    v_search_num := v_search_clean::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_search_num := NULL;
  END;

  -- Count matching tickets
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
  LEFT JOIN ticket_reservation_status trs 
    ON trs.raffle_id = p_raffle_id AND trs.ticket_index = gs.idx
  WHERE (
    LPAD((v_number_start + gs.idx * v_step)::TEXT, v_min_digits, '0') LIKE '%' || p_search || '%'
    OR (v_number_start + gs.idx * v_step)::TEXT LIKE '%' || v_search_clean || '%'
    OR (v_search_num IS NOT NULL AND gs.idx = v_search_num - v_number_start)
  )
  AND (
    p_status_filter IS NULL 
    OR p_status_filter = 'all'
    OR (p_status_filter = 'available' AND trs.status IS NULL)
    OR (p_status_filter = trs.status)
  );

  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_dashboard_tickets TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_dashboard_tickets TO anon;
GRANT EXECUTE ON FUNCTION public.count_dashboard_tickets_search TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_dashboard_tickets_search TO anon;