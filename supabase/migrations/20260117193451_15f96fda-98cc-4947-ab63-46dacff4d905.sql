-- =====================================================
-- PHASE 1: Transaction Helpers - Fix existing function
-- =====================================================

-- Drop existing function with old parameter name
DROP FUNCTION IF EXISTS compress_ticket_indices(integer[]);

-- Recreate with correct parameter name
CREATE OR REPLACE FUNCTION compress_ticket_indices(p_indices INTEGER[])
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  sorted_indices INTEGER[];
  ranges JSONB := '[]'::JSONB;
  range_start INTEGER;
  range_end INTEGER;
  current_idx INTEGER;
  i INTEGER;
BEGIN
  IF p_indices IS NULL OR array_length(p_indices, 1) IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Sort indices
  SELECT ARRAY_AGG(idx ORDER BY idx) INTO sorted_indices
  FROM unnest(p_indices) AS idx;

  range_start := sorted_indices[1];
  range_end := sorted_indices[1];

  FOR i IN 2..array_length(sorted_indices, 1) LOOP
    current_idx := sorted_indices[i];
    IF current_idx = range_end + 1 THEN
      -- Extend current range
      range_end := current_idx;
    ELSE
      -- Save current range and start new one
      ranges := ranges || jsonb_build_object('s', range_start, 'e', range_end);
      range_start := current_idx;
      range_end := current_idx;
    END IF;
  END LOOP;

  -- Add final range
  ranges := ranges || jsonb_build_object('s', range_start, 'e', range_end);

  RETURN ranges;
END;
$$;