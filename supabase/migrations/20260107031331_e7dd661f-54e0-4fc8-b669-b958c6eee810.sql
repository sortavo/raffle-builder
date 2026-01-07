-- =====================================================
-- POST-DIAGNOSTIC IMPROVEMENTS: Performance & Security
-- =====================================================

-- 1. Remove redundant ticket indices (saves ~200MB, faster writes)
DROP INDEX IF EXISTS idx_tickets_raffle_status_btree;
DROP INDEX IF EXISTS idx_tickets_raffle_status_count;
DROP INDEX IF EXISTS idx_tickets_number_pattern;

-- 2. Improve buyers RLS policy with email validation
DROP POLICY IF EXISTS "Anyone can create buyer records" ON buyers;

CREATE POLICY "Anyone can create buyer records" ON buyers
  FOR INSERT TO public
  WITH CHECK (
    email IS NOT NULL 
    AND email ~* '^[^@]+@[^@]+\.[^@]+$'
    AND full_name IS NOT NULL
    AND length(trim(full_name)) >= 2
  );