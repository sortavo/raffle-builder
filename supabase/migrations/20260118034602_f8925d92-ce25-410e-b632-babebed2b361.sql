-- =====================================================
-- PHASE 6: Performance Indices & Paginated Search RPC
-- =====================================================

-- ================== PART 1: PERFORMANCE INDICES ==================
-- Using standard CREATE INDEX (not CONCURRENTLY) for migration compatibility

-- Index for reference_code lookups (payment verification, support)
CREATE INDEX IF NOT EXISTS idx_orders_reference_code
  ON public.orders(reference_code);

-- Combined raffle + reference (common lookup pattern)
CREATE INDEX IF NOT EXISTS idx_orders_raffle_reference
  ON public.orders(raffle_id, reference_code);

-- Buyer email lookups (My Tickets, buyer history)
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email
  ON public.orders(buyer_email);

-- Email + status for filtered queries
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email_status
  ON public.orders(buyer_email, status);

-- Phone lookups (partial - only non-null)
CREATE INDEX IF NOT EXISTS idx_orders_buyer_phone
  ON public.orders(buyer_phone)
  WHERE buyer_phone IS NOT NULL;

-- Reporting queries by date
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc
  ON public.orders(created_at DESC);

-- Dashboard/reports: org + date
CREATE INDEX IF NOT EXISTS idx_orders_org_created
  ON public.orders(organization_id, created_at DESC);

-- Document the indices
COMMENT ON INDEX idx_orders_reference_code IS 'Phase 6: O(1) lookup by reference code for payment verification';
COMMENT ON INDEX idx_orders_buyer_email IS 'Phase 6: O(1) lookup by buyer email for My Tickets feature';

-- ================== PART 2: PAGINATED SEARCH RPC ==================

-- Create efficient paginated search function (O(n) instead of O(n²))
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
  v_total_tickets INTEGER;
  v_number_start INTEGER;
  v_step INTEGER;
  v_min_digits INTEGER;
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

  -- Try to parse as exact number
  BEGIN
    v_search_num := p_search::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_search_num := NULL;
  END;

  -- If valid number in range, return that specific ticket (O(1) lookup)
  IF v_search_num IS NOT NULL THEN
    DECLARE
      v_ticket_idx INTEGER;
    BEGIN
      v_ticket_idx := (v_search_num - v_number_start) / v_step;
      
      IF v_ticket_idx >= 0 AND v_ticket_idx < v_total_tickets THEN
        RETURN QUERY
        SELECT
          v_ticket_idx AS ticket_index,
          LPAD(v_search_num::TEXT, GREATEST(v_min_digits, LENGTH(v_total_tickets::TEXT)), '0') AS ticket_number,
          COALESCE(trs.status, 'available') AS status,
          CASE WHEN trs.order_id IS NOT NULL THEN
            (SELECT o.buyer_name FROM orders o WHERE o.id = trs.order_id)
          ELSE NULL END AS buyer_name
        FROM (SELECT 1) dummy
        LEFT JOIN ticket_reservation_status trs
          ON trs.raffle_id = p_raffle_id AND trs.ticket_index = v_ticket_idx;
        RETURN;
      END IF;
    END;
  END IF;

  -- Pattern search with proper OFFSET/LIMIT (O(n) not O(n²))
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
    WHERE (v_number_start + gs.idx * v_step)::TEXT LIKE '%' || p_search || '%'
    ORDER BY gs.idx
    OFFSET p_offset
    LIMIT p_limit
  ) sub
  LEFT JOIN ticket_reservation_status trs
    ON trs.raffle_id = p_raffle_id AND trs.ticket_index = sub.ticket_index;
END;
$$;

COMMENT ON FUNCTION public.search_public_tickets_paginated IS 'Phase 6: Efficient paginated ticket search with O(n) complexity using OFFSET/LIMIT';