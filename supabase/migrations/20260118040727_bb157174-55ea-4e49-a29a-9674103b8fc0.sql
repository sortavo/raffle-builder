-- =====================================================
-- PHASE 7: Ultra Enterprise - Admin Stats RPC & Indices
-- =====================================================

-- Consolidated admin dashboard stats (replaces 10+ queries)
CREATE OR REPLACE FUNCTION public.get_admin_overview_stats(
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_result JSONB;
  v_from_ts TIMESTAMPTZ;
  v_to_ts TIMESTAMPTZ;
BEGIN
  -- Convert dates to timestamps for comparison
  v_from_ts := COALESCE(p_from_date::TIMESTAMPTZ, '-infinity'::TIMESTAMPTZ);
  v_to_ts := COALESCE((p_to_date + INTERVAL '1 day')::TIMESTAMPTZ, 'infinity'::TIMESTAMPTZ);

  SELECT jsonb_build_object(
    'total_organizations', (SELECT COUNT(*) FROM organizations),
    'active_organizations', (
      SELECT COUNT(DISTINCT o.organization_id)
      FROM orders o
      WHERE o.status = 'sold'
        AND (p_from_date IS NULL OR o.sold_at >= v_from_ts)
    ),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_raffles', (SELECT COUNT(*) FROM raffles WHERE archived_at IS NULL),
    'active_raffles', (SELECT COUNT(*) FROM raffles WHERE status = 'active'),
    'completed_raffles', (SELECT COUNT(*) FROM raffles WHERE status = 'completed'),
    'new_orgs_in_period', (
      SELECT COUNT(*) FROM organizations
      WHERE created_at >= v_from_ts AND created_at < v_to_ts
    ),
    'new_users_in_period', (
      SELECT COUNT(*) FROM profiles
      WHERE created_at >= v_from_ts AND created_at < v_to_ts
    ),
    'new_raffles_in_period', (
      SELECT COUNT(*) FROM raffles
      WHERE created_at >= v_from_ts AND created_at < v_to_ts
    ),
    'total_tickets_sold', (
      SELECT COALESCE(SUM(ticket_count), 0)
      FROM orders
      WHERE status = 'sold'
    ),
    'tickets_sold_in_period', (
      SELECT COALESCE(SUM(ticket_count), 0)
      FROM orders
      WHERE status = 'sold'
        AND sold_at >= v_from_ts AND sold_at < v_to_ts
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(order_total), 0)
      FROM orders
      WHERE status = 'sold'
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'basic', COUNT(*) FILTER (WHERE subscription_tier = 'basic'),
        'pro', COUNT(*) FILTER (WHERE subscription_tier = 'pro'),
        'premium', COUNT(*) FILTER (WHERE subscription_tier = 'premium'),
        'enterprise', COUNT(*) FILTER (WHERE subscription_tier = 'enterprise'),
        'free', COUNT(*) FILTER (WHERE subscription_tier IS NULL OR subscription_tier = 'free'),
        'trial', COUNT(*) FILTER (WHERE subscription_status = 'trial'),
        'active', COUNT(*) FILTER (WHERE subscription_status = 'active')
      )
      FROM organizations
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Index for sold orders with date filtering (covering index)
CREATE INDEX IF NOT EXISTS idx_orders_status_sold_at
  ON orders(status, sold_at DESC)
  WHERE status = 'sold';

-- Index for org + status + date (dashboard/reports)
CREATE INDEX IF NOT EXISTS idx_orders_org_status_sold
  ON orders(organization_id, status, sold_at DESC)
  WHERE status = 'sold';

-- Index for active raffles filtering
CREATE INDEX IF NOT EXISTS idx_raffles_status_archived
  ON raffles(status, archived_at)
  WHERE archived_at IS NULL;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_admin_overview_stats(DATE, DATE) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_admin_overview_stats IS 'Phase 7: Consolidated admin dashboard stats - replaces 10+ queries with single call';