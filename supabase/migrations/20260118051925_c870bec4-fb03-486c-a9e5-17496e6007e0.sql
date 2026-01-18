-- =====================================================
-- PHASES 8-10: Ultra Enterprise Maximum Scale
-- =====================================================

-- =====================================================
-- PHASE 8A: ticket_reservation_status HASH Partitioning
-- =====================================================

-- Step 1: Create new partitioned table structure
CREATE TABLE IF NOT EXISTS public.ticket_reservation_status_partitioned (
  raffle_id UUID NOT NULL,
  ticket_index INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'pending', 'sold')),
  order_id UUID NOT NULL,
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (raffle_id, ticket_index)
) PARTITION BY HASH (raffle_id);

-- Step 2: Create 32 hash partitions for optimal distribution
DO $$
BEGIN
  FOR i IN 0..31 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.ticket_reservation_status_p%s
       PARTITION OF public.ticket_reservation_status_partitioned
       FOR VALUES WITH (MODULUS 32, REMAINDER %s)', i, i
    );
  END LOOP;
END $$;

-- Step 3: Create performance indices on partitioned table
CREATE INDEX IF NOT EXISTS idx_trs_part_order 
  ON public.ticket_reservation_status_partitioned(order_id);

CREATE INDEX IF NOT EXISTS idx_trs_part_expires 
  ON public.ticket_reservation_status_partitioned(raffle_id, reserved_until)
  WHERE status = 'reserved' AND reserved_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trs_part_status
  ON public.ticket_reservation_status_partitioned(raffle_id, status);

-- Step 4: Migrate existing data (if any)
INSERT INTO public.ticket_reservation_status_partitioned (raffle_id, ticket_index, status, order_id, reserved_until, created_at)
SELECT raffle_id, ticket_index, status, order_id, reserved_until, created_at
FROM public.ticket_reservation_status
ON CONFLICT DO NOTHING;

-- Step 5: Atomic table swap
ALTER TABLE IF EXISTS public.ticket_reservation_status RENAME TO ticket_reservation_status_old;
ALTER TABLE public.ticket_reservation_status_partitioned RENAME TO ticket_reservation_status;

-- Step 6: Recreate foreign key constraints (CASCADE on delete)
ALTER TABLE public.ticket_reservation_status
  ADD CONSTRAINT fk_trs_raffle FOREIGN KEY (raffle_id) 
  REFERENCES raffles(id) ON DELETE CASCADE;

ALTER TABLE public.ticket_reservation_status
  ADD CONSTRAINT fk_trs_order FOREIGN KEY (order_id) 
  REFERENCES orders(id) ON DELETE CASCADE;

-- Step 7: Recreate the sync_blocks_incremental trigger on new table
DROP TRIGGER IF EXISTS trigger_sync_blocks_incremental ON public.ticket_reservation_status;
CREATE TRIGGER trigger_sync_blocks_incremental
AFTER INSERT OR UPDATE OF status OR DELETE ON public.ticket_reservation_status
FOR EACH ROW EXECUTE FUNCTION sync_blocks_incremental();

-- Step 8: Enable RLS on partitioned table
ALTER TABLE public.ticket_reservation_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ticket status" ON public.ticket_reservation_status;
CREATE POLICY "Public read ticket status" 
  ON public.ticket_reservation_status 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Service role write ticket status" ON public.ticket_reservation_status;
CREATE POLICY "Service role write ticket status" 
  ON public.ticket_reservation_status 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.ticket_reservation_status IS 'Phase 8: HASH partitioned into 32 partitions by raffle_id for 100M+ ticket scale';

-- =====================================================
-- PHASE 10: Materialized Views for Instant Analytics
-- =====================================================

-- MV 1: Admin stats (replaces expensive aggregation queries)
-- Note: subscription_tier enum values are: basic, pro, enterprise, premium (no 'free')
DROP MATERIALIZED VIEW IF EXISTS mv_admin_stats;
CREATE MATERIALIZED VIEW mv_admin_stats AS
SELECT
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active') as active_subscriptions,
  (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'trial') as trial_subscriptions,
  (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'canceled') as canceled_subscriptions,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM raffles WHERE archived_at IS NULL) as total_raffles,
  (SELECT COUNT(*) FROM raffles WHERE status = 'active') as active_raffles,
  (SELECT COUNT(*) FROM raffles WHERE status = 'completed') as completed_raffles,
  (SELECT COALESCE(SUM(ticket_count), 0) FROM orders WHERE status = 'sold') as total_tickets_sold,
  (SELECT COALESCE(SUM(order_total), 0) FROM orders WHERE status = 'sold') as total_revenue,
  (SELECT COUNT(*) FROM organizations WHERE subscription_tier = 'basic') as tier_basic,
  (SELECT COUNT(*) FROM organizations WHERE subscription_tier = 'pro') as tier_pro,
  (SELECT COUNT(*) FROM organizations WHERE subscription_tier = 'premium') as tier_premium,
  (SELECT COUNT(*) FROM organizations WHERE subscription_tier = 'enterprise') as tier_enterprise,
  (SELECT COUNT(*) FROM organizations WHERE subscription_tier IS NULL) as tier_none,
  NOW() as refreshed_at;

CREATE UNIQUE INDEX ON mv_admin_stats (refreshed_at);

-- MV 2: Daily stats for trend analysis
DROP MATERIALIZED VIEW IF EXISTS mv_daily_stats;
CREATE MATERIALIZED VIEW mv_daily_stats AS
SELECT
  date_trunc('day', sold_at)::DATE as stat_date,
  COUNT(*) as orders_count,
  COALESCE(SUM(ticket_count), 0)::BIGINT as tickets_sold,
  COALESCE(SUM(order_total), 0)::NUMERIC as revenue
FROM orders 
WHERE status = 'sold' AND sold_at IS NOT NULL
GROUP BY 1 
ORDER BY 1 DESC;

CREATE UNIQUE INDEX ON mv_daily_stats (stat_date);

-- MV 3: Top raffles leaderboard
DROP MATERIALIZED VIEW IF EXISTS mv_top_raffles;
CREATE MATERIALIZED VIEW mv_top_raffles AS
SELECT
  r.id as raffle_id,
  r.title,
  r.organization_id,
  o.name as organization_name,
  r.total_tickets,
  r.status::TEXT as status,
  COALESCE(SUM(ord.ticket_count), 0)::BIGINT as tickets_sold,
  COALESCE(SUM(ord.order_total), 0)::NUMERIC as revenue,
  r.created_at
FROM raffles r
JOIN organizations o ON o.id = r.organization_id
LEFT JOIN orders ord ON ord.raffle_id = r.id AND ord.status = 'sold'
WHERE r.archived_at IS NULL
GROUP BY r.id, r.title, r.organization_id, o.name, r.total_tickets, r.status, r.created_at
ORDER BY tickets_sold DESC
LIMIT 100;

CREATE UNIQUE INDEX ON mv_top_raffles (raffle_id);

-- Function to refresh all materialized views concurrently
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS TABLE (view_name TEXT, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE 
  v TEXT;
  views TEXT[] := ARRAY['mv_admin_stats', 'mv_daily_stats', 'mv_top_raffles'];
BEGIN
  FOREACH v IN ARRAY views
  LOOP
    BEGIN
      EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', v);
      RETURN QUERY SELECT v, TRUE, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT v, FALSE, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Grant read access to authenticated users
GRANT SELECT ON mv_admin_stats TO authenticated;
GRANT SELECT ON mv_daily_stats TO authenticated;
GRANT SELECT ON mv_top_raffles TO authenticated;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW mv_admin_stats IS 'Phase 10: Pre-computed admin dashboard stats, refresh every 5 minutes';
COMMENT ON MATERIALIZED VIEW mv_daily_stats IS 'Phase 10: Daily order/revenue aggregates for trend charts';
COMMENT ON MATERIALIZED VIEW mv_top_raffles IS 'Phase 10: Top 100 raffles by tickets sold';