-- Drop and recreate the materialized view with correct revenue calculation
DROP MATERIALIZED VIEW IF EXISTS raffle_stats_mv;

CREATE MATERIALIZED VIEW raffle_stats_mv AS
WITH order_revenue AS (
  -- Calculate revenue per order (grouped by payment_reference)
  SELECT 
    raffle_id,
    payment_reference,
    COUNT(*) as ticket_count,
    -- Use order_total if available, otherwise calculate from ticket count
    COALESCE(
      MAX(order_total),
      COUNT(*) * (SELECT ticket_price FROM raffles WHERE id = st.raffle_id)
    ) as order_revenue_value
  FROM sold_tickets st
  WHERE status = 'sold'
    AND payment_reference IS NOT NULL
  GROUP BY raffle_id, payment_reference
),
individual_ticket_revenue AS (
  -- Calculate revenue for tickets without payment_reference
  SELECT 
    raffle_id,
    COUNT(*) as ticket_count,
    SUM(COALESCE(order_total, (SELECT ticket_price FROM raffles WHERE id = st.raffle_id))) as revenue_value
  FROM sold_tickets st
  WHERE status = 'sold'
    AND payment_reference IS NULL
  GROUP BY raffle_id
)
SELECT 
  r.id as raffle_id,
  r.organization_id,
  r.status,
  r.total_tickets,
  r.ticket_price,
  COALESCE(
    (SELECT COUNT(*) FROM sold_tickets WHERE raffle_id = r.id AND status = 'sold'),
    0
  )::integer as sold_count,
  COALESCE(
    (SELECT COUNT(*) FROM sold_tickets WHERE raffle_id = r.id AND status = 'reserved'),
    0
  )::integer as reserved_count,
  -- Revenue: sum of order revenues + individual ticket revenues
  COALESCE(
    (SELECT SUM(order_revenue_value) FROM order_revenue WHERE raffle_id = r.id),
    0
  ) + COALESCE(
    (SELECT SUM(revenue_value) FROM individual_ticket_revenue WHERE raffle_id = r.id),
    0
  ) as revenue
FROM raffles r
WHERE r.archived_at IS NULL;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS raffle_stats_mv_raffle_id_idx ON raffle_stats_mv(raffle_id);

-- Refresh the view
REFRESH MATERIALIZED VIEW raffle_stats_mv;

-- Create RPC for dashboard charts (aggregated data, no 1000-row limit)
CREATE OR REPLACE FUNCTION get_dashboard_charts(
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
  daily_revenue jsonb;
  raffle_sales jsonb;
  period_totals jsonb;
  previous_start timestamptz;
  previous_end timestamptz;
  previous_totals jsonb;
BEGIN
  -- Calculate previous period dates (same duration before start_date)
  previous_end := p_start_date;
  previous_start := p_start_date - (p_end_date - p_start_date);

  -- Daily revenue for the period
  WITH daily_data AS (
    SELECT 
      DATE(st.sold_at) as sale_date,
      COUNT(*) as tickets_sold,
      SUM(
        CASE 
          WHEN st.payment_reference IS NOT NULL THEN
            -- For orders, use order_total divided by tickets in order, or ticket_price
            COALESCE(st.order_total / NULLIF(
              (SELECT COUNT(*) FROM sold_tickets st2 
               WHERE st2.payment_reference = st.payment_reference 
               AND st2.raffle_id = st.raffle_id), 0
            ), r.ticket_price)
          ELSE
            COALESCE(st.order_total, r.ticket_price)
        END
      ) as revenue
    FROM sold_tickets st
    JOIN raffles r ON r.id = st.raffle_id
    WHERE r.organization_id = p_organization_id
      AND st.status = 'sold'
      AND st.sold_at >= p_start_date
      AND st.sold_at < p_end_date
    GROUP BY DATE(st.sold_at)
    ORDER BY sale_date
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', sale_date,
      'tickets', tickets_sold,
      'revenue', COALESCE(revenue, 0)
    )
  ), '[]'::jsonb)
  INTO daily_revenue
  FROM daily_data;

  -- Raffle sales (all active raffles with their stats)
  WITH raffle_data AS (
    SELECT 
      r.id,
      r.title as name,
      r.total_tickets,
      r.ticket_price,
      COALESCE(mv.sold_count, 0) as sold,
      r.total_tickets - COALESCE(mv.sold_count, 0) - COALESCE(mv.reserved_count, 0) as available,
      COALESCE(mv.revenue, 0) as revenue
    FROM raffles r
    LEFT JOIN raffle_stats_mv mv ON mv.raffle_id = r.id
    WHERE r.organization_id = p_organization_id
      AND r.archived_at IS NULL
      AND r.status IN ('active', 'paused')
    ORDER BY sold DESC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'sold', sold,
      'available', available,
      'total', total_tickets,
      'revenue', revenue,
      'ticket_price', ticket_price
    )
  ), '[]'::jsonb)
  INTO raffle_sales
  FROM raffle_data;

  -- Period totals
  WITH period_data AS (
    SELECT 
      COUNT(*) as tickets_sold,
      SUM(
        CASE 
          WHEN st.payment_reference IS NOT NULL THEN
            COALESCE(st.order_total / NULLIF(
              (SELECT COUNT(*) FROM sold_tickets st2 
               WHERE st2.payment_reference = st.payment_reference 
               AND st2.raffle_id = st.raffle_id), 0
            ), r.ticket_price)
          ELSE
            COALESCE(st.order_total, r.ticket_price)
        END
      ) as revenue
    FROM sold_tickets st
    JOIN raffles r ON r.id = st.raffle_id
    WHERE r.organization_id = p_organization_id
      AND st.status = 'sold'
      AND st.sold_at >= p_start_date
      AND st.sold_at < p_end_date
  )
  SELECT jsonb_build_object(
    'tickets_sold', COALESCE(tickets_sold, 0),
    'revenue', COALESCE(revenue, 0)
  )
  INTO period_totals
  FROM period_data;

  -- Previous period totals (for % change calculation)
  WITH prev_data AS (
    SELECT 
      COUNT(*) as tickets_sold,
      SUM(
        CASE 
          WHEN st.payment_reference IS NOT NULL THEN
            COALESCE(st.order_total / NULLIF(
              (SELECT COUNT(*) FROM sold_tickets st2 
               WHERE st2.payment_reference = st.payment_reference 
               AND st2.raffle_id = st.raffle_id), 0
            ), r.ticket_price)
          ELSE
            COALESCE(st.order_total, r.ticket_price)
        END
      ) as revenue
    FROM sold_tickets st
    JOIN raffles r ON r.id = st.raffle_id
    WHERE r.organization_id = p_organization_id
      AND st.status = 'sold'
      AND st.sold_at >= previous_start
      AND st.sold_at < previous_end
  )
  SELECT jsonb_build_object(
    'tickets_sold', COALESCE(tickets_sold, 0),
    'revenue', COALESCE(revenue, 0)
  )
  INTO previous_totals
  FROM prev_data;

  -- Build final result
  result := jsonb_build_object(
    'daily_revenue', daily_revenue,
    'raffle_sales', raffle_sales,
    'period_totals', period_totals,
    'previous_totals', previous_totals
  );

  RETURN result;
END;
$$;