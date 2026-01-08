-- Fix RPCs: remove invalid 'archived' enum value, calculate available_count instead of using non-existent column

-- 1) Fix get_dashboard_stats - use archived_at IS NULL instead of status != 'archived'
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_raffles', COUNT(*),
    'active_raffles', SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END),
    'total_tickets_sold', COALESCE(SUM(rs.sold_count), 0),
    'total_revenue', COALESCE(SUM(rs.revenue), 0)
  )
  INTO result
  FROM raffles r
  LEFT JOIN raffle_stats_mv rs ON rs.raffle_id = r.id
  WHERE r.organization_id = p_organization_id
    AND r.archived_at IS NULL;

  RETURN COALESCE(result, jsonb_build_object(
    'total_raffles', 0,
    'active_raffles', 0,
    'total_tickets_sold', 0,
    'total_revenue', 0
  ));
END;
$$;

-- 2) Fix get_raffle_stats_list - calculate available_count, use archived_at IS NULL
CREATE OR REPLACE FUNCTION public.get_raffle_stats_list(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'raffle_id', r.id,
      'sold_count', COALESCE(rs.sold_count, 0),
      'reserved_count', COALESCE(rs.reserved_count, 0),
      'available_count', GREATEST(r.total_tickets - COALESCE(rs.sold_count, 0) - COALESCE(rs.reserved_count, 0), 0),
      'revenue', COALESCE(rs.revenue, 0)
    )
  )
  INTO result
  FROM raffles r
  LEFT JOIN raffle_stats_mv rs ON rs.raffle_id = r.id
  WHERE r.organization_id = p_organization_id
    AND r.archived_at IS NULL;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 3) Fix get_dashboard_charts - calculate available instead of using rs.available_count
CREATE OR REPLACE FUNCTION public.get_dashboard_charts(
  p_organization_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  period_days integer;
BEGIN
  -- Calculate period length
  period_days := GREATEST(EXTRACT(DAY FROM (p_end_date - p_start_date))::integer, 1);

  WITH order_counts AS (
    SELECT 
      st.payment_reference,
      st.raffle_id,
      COUNT(*) as ticket_count
    FROM sold_tickets st
    JOIN raffles r ON r.id = st.raffle_id
    WHERE r.organization_id = p_organization_id
      AND st.payment_reference IS NOT NULL
      AND st.status = 'sold'
    GROUP BY st.payment_reference, st.raffle_id
  ),
  ticket_revenue AS (
    SELECT 
      st.id as ticket_id,
      st.raffle_id,
      st.sold_at,
      CASE 
        WHEN st.order_total IS NOT NULL AND oc.ticket_count > 0 
        THEN st.order_total / oc.ticket_count
        ELSE r.ticket_price
      END as per_ticket_revenue
    FROM sold_tickets st
    JOIN raffles r ON r.id = st.raffle_id
    LEFT JOIN order_counts oc ON oc.payment_reference = st.payment_reference 
      AND oc.raffle_id = st.raffle_id
    WHERE r.organization_id = p_organization_id
      AND st.status = 'sold'
      AND st.sold_at IS NOT NULL
  ),
  daily_revenue AS (
    SELECT 
      DATE(tr.sold_at AT TIME ZONE 'America/Mexico_City') as sale_date,
      SUM(tr.per_ticket_revenue) as revenue,
      COUNT(*) as tickets
    FROM ticket_revenue tr
    WHERE tr.sold_at >= p_start_date AND tr.sold_at <= p_end_date
    GROUP BY DATE(tr.sold_at AT TIME ZONE 'America/Mexico_City')
  ),
  raffle_sales AS (
    SELECT 
      r.id,
      r.title as name,
      COALESCE(rs.sold_count, 0) as sold,
      GREATEST(r.total_tickets - COALESCE(rs.sold_count, 0) - COALESCE(rs.reserved_count, 0), 0) as available,
      r.total_tickets as total,
      COALESCE(rs.revenue, 0) as revenue,
      r.ticket_price
    FROM raffles r
    LEFT JOIN raffle_stats_mv rs ON rs.raffle_id = r.id
    WHERE r.organization_id = p_organization_id
      AND r.status IN ('active', 'paused', 'completed')
      AND r.archived_at IS NULL
  ),
  period_totals AS (
    SELECT 
      COUNT(*) as tickets_sold,
      COALESCE(SUM(tr.per_ticket_revenue), 0) as revenue
    FROM ticket_revenue tr
    WHERE tr.sold_at >= p_start_date AND tr.sold_at <= p_end_date
  ),
  previous_totals AS (
    SELECT 
      COUNT(*) as tickets_sold,
      COALESCE(SUM(tr.per_ticket_revenue), 0) as revenue
    FROM ticket_revenue tr
    WHERE tr.sold_at >= (p_start_date - (period_days || ' days')::interval)
      AND tr.sold_at < p_start_date
  )
  SELECT jsonb_build_object(
    'daily_revenue', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', sale_date, 'revenue', revenue, 'tickets', tickets)) FROM daily_revenue), '[]'::jsonb),
    'raffle_sales', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'sold', sold, 'available', available, 'total', total, 'revenue', revenue, 'ticket_price', ticket_price)) FROM raffle_sales), '[]'::jsonb),
    'period_totals', (SELECT jsonb_build_object('tickets_sold', tickets_sold, 'revenue', revenue) FROM period_totals),
    'previous_totals', (SELECT jsonb_build_object('tickets_sold', tickets_sold, 'revenue', revenue) FROM previous_totals)
  ) INTO result;

  RETURN result;
END;
$$;

-- Refresh the materialized view to ensure fresh data
REFRESH MATERIALIZED VIEW raffle_stats_mv;