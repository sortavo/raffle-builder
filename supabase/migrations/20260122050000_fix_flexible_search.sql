-- =====================================================
-- FIX: Make ticket search more flexible
--
-- Issues fixed:
-- 1. Search "203" should find ticket "00000203"
-- 2. Search "00000203" should find ticket 203
-- 3. Handle cases where ticket_index = actual number
-- 4. Strip leading zeros for flexible matching
-- =====================================================

CREATE OR REPLACE FUNCTION public.search_public_tickets_paginated(
  p_raffle_id UUID,
  p_search TEXT,
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 100
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
  v_search_num INTEGER;
  v_search_clean TEXT;
  v_total_tickets INTEGER;
  v_number_start INTEGER;
  v_step INTEGER;
  v_min_digits INTEGER;
  v_ticket_idx INTEGER;
  v_found BOOLEAN := FALSE;
BEGIN
  -- Get raffle config
  SELECT
    r.total_tickets,
    COALESCE((r.numbering_config->>'numberStart')::INTEGER, 1),
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

  -- Try to parse as number
  BEGIN
    v_search_num := v_search_clean::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_search_num := NULL;
  END;

  -- If valid number, try multiple lookup strategies
  IF v_search_num IS NOT NULL THEN
    -- Strategy 1: Direct lookup where ticket_index = search_num
    -- (most common case - ticket_index stores actual number)
    IF v_search_num > 0 AND v_search_num <= v_total_tickets THEN
      IF EXISTS (
        SELECT 1 FROM ticket_reservation_status trs
        WHERE trs.raffle_id = p_raffle_id AND trs.ticket_index = v_search_num
      ) THEN
        RETURN QUERY
        SELECT
          v_search_num,
          LPAD(v_search_num::TEXT, GREATEST(v_min_digits, LENGTH(v_total_tickets::TEXT)), '0'),
          trs.status,
          CASE WHEN trs.order_id IS NOT NULL THEN
            (SELECT o.buyer_name FROM orders o WHERE o.id = trs.order_id)
          ELSE NULL END
        FROM ticket_reservation_status trs
        WHERE trs.raffle_id = p_raffle_id AND trs.ticket_index = v_search_num;
        RETURN;
      END IF;
    END IF;

    -- Strategy 2: Calculate index based on numbering config
    v_ticket_idx := (v_search_num - v_number_start) / v_step;

    IF v_ticket_idx >= 0 AND v_ticket_idx < v_total_tickets THEN
      -- Check if this ticket exists in reservation status
      IF EXISTS (
        SELECT 1 FROM ticket_reservation_status trs
        WHERE trs.raffle_id = p_raffle_id AND trs.ticket_index = v_ticket_idx
      ) THEN
        RETURN QUERY
        SELECT
          v_ticket_idx,
          LPAD(v_search_num::TEXT, GREATEST(v_min_digits, LENGTH(v_total_tickets::TEXT)), '0'),
          trs.status,
          CASE WHEN trs.order_id IS NOT NULL THEN
            (SELECT o.buyer_name FROM orders o WHERE o.id = trs.order_id)
          ELSE NULL END
        FROM ticket_reservation_status trs
        WHERE trs.raffle_id = p_raffle_id AND trs.ticket_index = v_ticket_idx;
        RETURN;
      END IF;

      -- Return as available if not in any reservation table
      RETURN QUERY
      SELECT
        v_ticket_idx,
        LPAD(v_search_num::TEXT, GREATEST(v_min_digits, LENGTH(v_total_tickets::TEXT)), '0'),
        'available'::TEXT,
        NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Fallback: Pattern search with LIKE (handles partial matches)
  RETURN QUERY
  SELECT
    sub.ticket_index,
    sub.ticket_number,
    COALESCE(trs.status, 'available') AS status,
    CASE WHEN trs.order_id IS NOT NULL THEN
      (SELECT o.buyer_name FROM orders o WHERE o.id = trs.order_id)
    ELSE NULL END AS buyer_name
  FROM (
    SELECT
      gs.idx AS ticket_index,
      LPAD((v_number_start + gs.idx * v_step)::TEXT, GREATEST(v_min_digits, LENGTH(v_total_tickets::TEXT)), '0') AS ticket_number
    FROM generate_series(0, v_total_tickets - 1) AS gs(idx)
    WHERE (v_number_start + gs.idx * v_step)::TEXT LIKE '%' || v_search_clean || '%'
       OR LPAD((v_number_start + gs.idx * v_step)::TEXT, GREATEST(v_min_digits, LENGTH(v_total_tickets::TEXT)), '0') LIKE '%' || p_search || '%'
    ORDER BY gs.idx
    OFFSET p_offset
    LIMIT p_limit
  ) sub
  LEFT JOIN ticket_reservation_status trs
    ON trs.raffle_id = p_raffle_id AND trs.ticket_index = sub.ticket_index;
END;
$$;

COMMENT ON FUNCTION public.search_public_tickets_paginated IS
'Flexible ticket search that handles:
- Searches with or without leading zeros (203 or 00000203)
- Direct ticket_index lookup
- Calculated index based on numbering config
- Pattern matching for partial searches';
