-- =====================================================
-- HOTFIX: Restore compress_ticket_indices function
--
-- This function was accidentally deleted in cleanup migration
-- 20260122060000_cleanup_dead_code.sql but is still used by:
-- - atomic_reserve_tickets_v2 (line 215)
-- - reserve_tickets_v2 (line 119)
--
-- Critical for ticket reservation flow
-- =====================================================

-- Recreate compress_ticket_indices function
CREATE OR REPLACE FUNCTION public.compress_ticket_indices(p_indices INTEGER[])
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

  -- Sort indices and remove duplicates
  SELECT ARRAY_AGG(DISTINCT idx ORDER BY idx) INTO sorted_indices
  FROM unnest(p_indices) AS idx;

  IF array_length(sorted_indices, 1) IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

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

COMMENT ON FUNCTION public.compress_ticket_indices(INTEGER[]) IS
'Compresses an array of ticket indices into JSONB ranges.
Example: [1,2,3,4,5,100,101,102] → [{"s":1,"e":5},{"s":100,"e":102}]
Used by reservation functions to store tickets efficiently.';
