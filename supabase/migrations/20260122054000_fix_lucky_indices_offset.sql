-- =====================================================
-- FIX: Convert lucky_indices from 1-based to 0-based
--
-- The load test script incorrectly stored ticket numbers
-- (1 to totalTickets) instead of 0-based indices.
--
-- Convention:
-- - lucky_indices should contain 0-based indices
-- - Display number = numberStart + index
--
-- This migration subtracts 1 from all lucky_indices values
-- for orders with status 'pending_approval' that were
-- created during load testing.
-- =====================================================

-- First, delete the ticket_reservation_status records for pending_approval orders
-- These have wrong ticket_index values and need to be recreated
DELETE FROM ticket_reservation_status trs
USING orders o
WHERE trs.order_id = o.id
  AND o.status = 'pending_approval'
  AND o.lucky_indices IS NOT NULL
  AND array_length(o.lucky_indices, 1) > 0;

-- Update all orders where lucky_indices contains values > 0
-- Subtract 1 from each element to convert to 0-based
UPDATE orders
SET lucky_indices = (
  SELECT array_agg(elem - 1)
  FROM unnest(lucky_indices) AS elem
)
WHERE lucky_indices IS NOT NULL
  AND array_length(lucky_indices, 1) > 0
  AND status = 'pending_approval';

-- Recreate ticket_reservation_status with correct 0-based indices
INSERT INTO ticket_reservation_status (raffle_id, ticket_index, status, order_id, reserved_until)
SELECT
  o.raffle_id,
  unnest(o.lucky_indices),
  'reserved',
  o.id,
  o.reserved_until
FROM orders o
WHERE o.status = 'pending_approval'
  AND o.lucky_indices IS NOT NULL
  AND array_length(o.lucky_indices, 1) > 0
ON CONFLICT (raffle_id, ticket_index)
DO UPDATE SET
  status = 'reserved',
  order_id = EXCLUDED.order_id,
  reserved_until = EXCLUDED.reserved_until;

-- Also fix search_public_tickets to use start_number consistently
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
  v_target_idx INT;
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
    v_padding := LENGTH((v_total_tickets + v_start_num - 1)::TEXT);
  END IF;

  -- Clean search: remove leading zeros and non-numeric chars
  v_search_clean := LTRIM(regexp_replace(p_search, '[^0-9]', '', 'g'), '0');
  IF v_search_clean = '' THEN
    v_search_clean := '0';
  END IF;
  v_search_num := NULLIF(v_search_clean, '')::INT;

  -- Calculate target index from search number (0-based)
  -- User searches for ticket NUMBER, we need to find the INDEX
  v_target_idx := v_search_num - v_start_num;

  RETURN QUERY
  WITH sold_data AS (
    -- Get lucky_indices from orders (these are 0-based indices)
    SELECT unnest(o.lucky_indices) AS idx, o.buyer_name AS bname, o.status AS ostatus
    FROM orders o
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('sold', 'reserved', 'pending', 'pending_approval')
      AND array_length(o.lucky_indices, 1) > 0
  ),
  -- Also get from ticket_ranges (expanded, also 0-based)
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
    -- FIX: Add start_num to get actual ticket number
    v_prefix || LPAD((v_start_num + ad.idx)::TEXT, v_padding, '0') || v_suffix AS ticket_number,
    ad.ostatus::TEXT AS status,
    ad.bname AS buyer_name
  FROM all_data ad
  WHERE v_search_num IS NULL
     -- Match: exact index match (search number - start_num = index)
     OR ad.idx = v_target_idx
     -- Match: partial match in display ticket number
     OR (v_start_num + ad.idx)::TEXT LIKE '%' || v_search_num::TEXT || '%'
     -- Match: buyer name search
     OR (v_search_num IS NULL AND ad.bname ILIKE '%' || p_search || '%')
  ORDER BY ad.idx
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_public_tickets IS 'Search tickets by number or buyer name. Uses 0-based indices internally, displays with start_number offset.';
