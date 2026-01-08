-- Drop existing functions first (return type changed)
DROP FUNCTION IF EXISTS public.get_dashboard_stats(uuid);
DROP FUNCTION IF EXISTS public.get_raffle_stats_list(uuid);
DROP FUNCTION IF EXISTS public.get_dashboard_charts(uuid, timestamptz, timestamptz);

-- 1. Recreate get_dashboard_stats with correct columns
CREATE FUNCTION public.get_dashboard_stats(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_raffles', COALESCE(COUNT(*), 0),
    'active_raffles', COALESCE(SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END), 0),
    'total_tickets_sold', COALESCE(SUM(rs.sold_count), 0),
    'total_revenue', COALESCE(SUM(rs.revenue), 0)
  ) INTO result
  FROM raffles r
  LEFT JOIN raffle_stats_mv rs ON rs.raffle_id = r.id
  WHERE r.organization_id = p_organization_id
    AND r.status != 'archived';
  
  RETURN result;
END;
$$;

-- 2. Recreate get_raffle_stats_list with correct columns
CREATE FUNCTION public.get_raffle_stats_list(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'title', r.title,
      'status', r.status,
      'total_tickets', r.total_tickets,
      'ticket_price', r.ticket_price,
      'draw_date', r.draw_date,
      'sold_count', COALESCE(rs.sold_count, 0),
      'reserved_count', COALESCE(rs.reserved_count, 0),
      'available_count', COALESCE(rs.available_count, r.total_tickets),
      'revenue', COALESCE(rs.revenue, 0)
    ) ORDER BY r.created_at DESC
  ), '[]'::jsonb) INTO result
  FROM raffles r
  LEFT JOIN raffle_stats_mv rs ON rs.raffle_id = r.id
  WHERE r.organization_id = p_organization_id
    AND r.status != 'archived';
  
  RETURN result;
END;
$$;

-- 3. Recreate optimized get_dashboard_charts with CTEs
CREATE FUNCTION public.get_dashboard_charts(
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
  period_days := GREATEST(EXTRACT(DAY FROM (p_end_date - p_start_date))::integer, 1);

  WITH 
  order_counts AS (
    SELECT st.payment_reference, st.raffle_id, COUNT(*) as ticket_count
    FROM sold_tickets st
    JOIN raffles r ON r.id = st.raffle_id
    WHERE r.organization_id = p_organization_id
      AND st.status = 'sold'
      AND st.payment_reference IS NOT NULL
    GROUP BY st.payment_reference, st.raffle_id
  ),
  ticket_revenue AS (
    SELECT 
      st.id, st.raffle_id, st.sold_at,
      CASE 
        WHEN st.payment_reference IS NOT NULL AND oc.ticket_count > 0 THEN
          COALESCE(st.order_total / oc.ticket_count, r.ticket_price)
        ELSE COALESCE(st.order_total, r.ticket_price)
      END as revenue
    FROM sold_tickets st
    JOIN raffles r ON r.id = st.raffle_id
    LEFT JOIN order_counts oc ON oc.payment_reference = st.payment_reference AND oc.raffle_id = st.raffle_id
    WHERE r.organization_id = p_organization_id AND st.status = 'sold'
  ),
  daily_data AS (
    SELECT DATE(tr.sold_at AT TIME ZONE 'UTC') as sale_date, COUNT(*) as tickets, SUM(tr.revenue) as revenue
    FROM ticket_revenue tr
    WHERE tr.sold_at >= p_start_date AND tr.sold_at <= p_end_date
    GROUP BY DATE(tr.sold_at AT TIME ZONE 'UTC')
  ),
  period_totals AS (
    SELECT COUNT(*) as tickets_sold, SUM(tr.revenue) as revenue
    FROM ticket_revenue tr
    WHERE tr.sold_at >= p_start_date AND tr.sold_at <= p_end_date
  ),
  previous_totals AS (
    SELECT COUNT(*) as tickets_sold, SUM(tr.revenue) as revenue
    FROM ticket_revenue tr
    WHERE tr.sold_at >= (p_start_date - (period_days || ' days')::interval) AND tr.sold_at < p_start_date
  ),
  raffle_sales AS (
    SELECT r.id, r.title as name, COALESCE(rs.sold_count, 0) as sold,
      COALESCE(rs.available_count, r.total_tickets) as available,
      r.total_tickets as total, COALESCE(rs.revenue, 0) as revenue, r.ticket_price
    FROM raffles r
    LEFT JOIN raffle_stats_mv rs ON rs.raffle_id = r.id
    WHERE r.organization_id = p_organization_id AND r.status IN ('active', 'completed')
    ORDER BY COALESCE(rs.sold_count, 0) DESC
  )
  SELECT jsonb_build_object(
    'daily_revenue', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', sale_date, 'revenue', COALESCE(revenue, 0), 'tickets', COALESCE(tickets, 0)) ORDER BY sale_date) FROM daily_data), '[]'::jsonb),
    'raffle_sales', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'sold', sold, 'available', available, 'total', total, 'revenue', revenue, 'ticket_price', ticket_price)) FROM raffle_sales), '[]'::jsonb),
    'period_totals', (SELECT jsonb_build_object('tickets_sold', COALESCE(tickets_sold, 0), 'revenue', COALESCE(revenue, 0)) FROM period_totals),
    'previous_totals', (SELECT jsonb_build_object('tickets_sold', COALESCE(tickets_sold, 0), 'revenue', COALESCE(revenue, 0)) FROM previous_totals)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 4. Refresh the materialized view
REFRESH MATERIALIZED VIEW raffle_stats_mv;