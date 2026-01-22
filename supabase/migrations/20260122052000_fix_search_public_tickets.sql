-- =====================================================
-- FIX: search_public_tickets flexible lookup
--
-- The function was adding start_num to indices, but test data
-- stores actual ticket numbers. Now tries both approaches.
-- =====================================================

CREATE OR REPLACE FUNCTION search_public_tickets(
  p_raffle_id UUID,
  p_search TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  ticket_index INTEGER,
  ticket_number TEXT,
  status TEXT,
  buyer_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numbering JSONB;
  v_start_num INT;
  v_padding INT;
  v_prefix TEXT;
  v_suffix TEXT;
  v_search_num INT;
  v_search_clean TEXT;
  v_total_tickets INT;
BEGIN
  -- Get raffle config
  SELECT r.numbering_config, r.total_tickets
  INTO v_numbering, v_total_tickets
  FROM raffles r WHERE r.id = p_raffle_id;

  v_start_num := COALESCE((v_numbering->>'start_number')::INT, (v_numbering->>'numberStart')::INT, 1);
  v_padding := COALESCE((v_numbering->>'padding')::INT, (v_numbering->>'minDigits')::INT, 0);
  v_prefix := COALESCE(v_numbering->>'prefix', '');
  v_suffix := COALESCE(v_numbering->>'suffix', '');

  -- If no explicit padding, calculate from total_tickets
  IF v_padding = 0 AND v_total_tickets IS NOT NULL THEN
    v_padding := LENGTH(v_total_tickets::TEXT);
  END IF;

  -- Clean search: remove leading zeros and non-numeric chars
  v_search_clean := LTRIM(regexp_replace(p_search, '[^0-9]', '', 'g'), '0');
  IF v_search_clean = '' THEN
    v_search_clean := '0';
  END IF;
  v_search_num := NULLIF(v_search_clean, '')::INT;

  RETURN QUERY
  WITH sold_data AS (
    -- Get lucky_indices from orders
    SELECT unnest(o.lucky_indices) AS idx, o.buyer_name AS bname, o.status AS ostatus
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('sold', 'reserved', 'pending', 'pending_approval')
      AND array_length(o.lucky_indices, 1) > 0
  ),
  -- Also get from ticket_ranges (expanded)
  range_data AS (
    SELECT
      generate_series((r.value->>'s')::INT, (r.value->>'e')::INT) AS idx,
      o.buyer_name AS bname,
      o.status AS ostatus
    FROM orders o,
    LATERAL jsonb_array_elements(o.ticket_ranges) AS r(value)
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('sold', 'reserved', 'pending', 'pending_approval')
      AND jsonb_array_length(o.ticket_ranges) > 0
  ),
  all_data AS (
    SELECT * FROM sold_data
    UNION ALL
    SELECT * FROM range_data
  )
  SELECT DISTINCT ON (ad.idx)
    ad.idx::INTEGER AS ticket_index,
    v_prefix || LPAD(ad.idx::TEXT, v_padding, '0') || v_suffix AS ticket_number,
    ad.ostatus::TEXT AS status,
    ad.bname AS buyer_name
  FROM all_data ad
  WHERE v_search_num IS NULL
     -- Match: idx directly equals search number (actual ticket number stored)
     OR ad.idx = v_search_num
     -- Match: idx + start_num equals search (0-based index stored)
     OR (ad.idx + v_start_num) = v_search_num
     -- Match: partial match in ticket number
     OR ad.idx::TEXT LIKE '%' || v_search_num::TEXT || '%'
     -- Match: buyer name search
     OR (v_search_num IS NULL AND ad.bname ILIKE '%' || p_search || '%')
  ORDER BY ad.idx
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_public_tickets IS 'Búsqueda flexible - maneja números con/sin ceros, índices directos o calculados';
