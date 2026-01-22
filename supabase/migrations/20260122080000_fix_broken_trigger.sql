-- =====================================================
-- HOTFIX: Fix broken trigger after table deletion
--
-- The cleanup migration deleted ticket_block_status table
-- but left the trigger sync_blocks_incremental which
-- tries to write to that deleted table.
--
-- This causes any INSERT into ticket_reservation_status to fail.
-- =====================================================

-- Step 1: Drop the broken trigger
DROP TRIGGER IF EXISTS trigger_sync_blocks_incremental ON public.ticket_reservation_status;

-- Step 2: Replace the function with a no-op version
-- (in case any other code references it)
CREATE OR REPLACE FUNCTION public.sync_blocks_incremental()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- No-op: ticket_block_status table was removed in cleanup
  -- This function is kept for backwards compatibility
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.sync_blocks_incremental() IS
'No-op trigger function. The ticket_block_status table was removed.';
