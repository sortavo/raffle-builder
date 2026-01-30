
-- Create archived_raffle_summary table to store consolidated data from archived raffles
CREATE TABLE IF NOT EXISTS public.archived_raffle_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL UNIQUE REFERENCES public.raffles(id) ON DELETE CASCADE,
  
  -- Ticket stats
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  tickets_reserved INTEGER NOT NULL DEFAULT 0,
  tickets_canceled INTEGER NOT NULL DEFAULT 0,
  
  -- Financial stats
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  average_order_value NUMERIC,
  
  -- Buyer stats
  unique_buyers INTEGER NOT NULL DEFAULT 0,
  
  -- Winners (from raffle_draws)
  winners JSONB DEFAULT '[]'::jsonb,
  
  -- Top buyers summary
  top_buyers JSONB DEFAULT '[]'::jsonb,
  
  -- Sales distribution
  sales_by_day JSONB DEFAULT '{}'::jsonb,
  buyer_cities JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  draw_executed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_archived_summary_raffle ON archived_raffle_summary(raffle_id);

-- RLS policies
ALTER TABLE public.archived_raffle_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view archived summaries"
  ON public.archived_raffle_summary
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM raffles r 
      WHERE r.id = archived_raffle_summary.raffle_id 
      AND has_org_access(auth.uid(), r.organization_id)
    )
  );

-- Update archive_raffle function to work with orders table instead of sold_tickets
CREATE OR REPLACE FUNCTION archive_raffle(p_raffle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders_deleted INTEGER;
  v_tickets_deleted INTEGER;
  v_raffle RECORD;
BEGIN
  -- Validate raffle is ready to archive (90 days post-draw)
  SELECT * INTO v_raffle
  FROM raffles 
  WHERE id = p_raffle_id 
  AND status = 'completed'
  AND draw_date < NOW() - INTERVAL '90 days'
  AND archived_at IS NULL;

  IF v_raffle.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rifa no lista para archivar (debe estar completada y 90+ días post-sorteo)'
    );
  END IF;

  -- Create aggregated summary from orders table
  INSERT INTO archived_raffle_summary (
    raffle_id,
    tickets_sold,
    tickets_reserved,
    tickets_canceled,
    total_revenue,
    average_order_value,
    unique_buyers,
    winners,
    top_buyers,
    sales_by_day,
    buyer_cities,
    draw_executed_at
  )
  SELECT 
    p_raffle_id,
    COALESCE(SUM(ticket_count) FILTER (WHERE status = 'sold'), 0)::INTEGER,
    COALESCE(SUM(ticket_count) FILTER (WHERE status = 'reserved'), 0)::INTEGER,
    COALESCE(SUM(ticket_count) FILTER (WHERE status = 'canceled'), 0)::INTEGER,
    COALESCE(SUM(order_total) FILTER (WHERE status = 'sold'), 0),
    COALESCE(AVG(order_total) FILTER (WHERE status = 'sold'), 0),
    COUNT(DISTINCT buyer_email)::INTEGER,
    
    -- Winners from raffle_draws
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'ticket_number', rd.ticket_number,
      'buyer_name', rd.winner_name,
      'buyer_email', rd.winner_email,
      'prize', rd.prize_name,
      'draw_type', rd.draw_type
    ) ORDER BY rd.drawn_at), '[]'::jsonb)
    FROM raffle_draws rd WHERE rd.raffle_id = p_raffle_id),
    
    -- Top 10 buyers by spend
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'email', t.buyer_email,
      'name', t.buyer_name,
      'tickets', t.ticket_count,
      'spent', t.total_spent
    ) ORDER BY t.total_spent DESC), '[]'::jsonb)
    FROM (
      SELECT buyer_email, MAX(buyer_name) as buyer_name, 
             SUM(ticket_count) as ticket_count, 
             SUM(order_total) as total_spent
      FROM orders WHERE raffle_id = p_raffle_id AND status = 'sold'
      GROUP BY buyer_email
      ORDER BY total_spent DESC NULLS LAST
      LIMIT 10
    ) t),
    
    -- Sales by day
    (SELECT COALESCE(jsonb_object_agg(day::text, cnt), '{}'::jsonb)
    FROM (
      SELECT DATE(sold_at) as day, SUM(ticket_count)::INTEGER as cnt
      FROM orders WHERE raffle_id = p_raffle_id AND sold_at IS NOT NULL
      GROUP BY DATE(sold_at)
    ) d),
    
    -- Cities distribution
    (SELECT COALESCE(jsonb_object_agg(COALESCE(city, 'No especificada'), cnt), '{}'::jsonb)
    FROM (
      SELECT buyer_city as city, SUM(ticket_count)::INTEGER as cnt
      FROM orders WHERE raffle_id = p_raffle_id AND status = 'sold'
      GROUP BY buyer_city
    ) c),
    
    v_raffle.draw_date
    
  FROM orders
  WHERE raffle_id = p_raffle_id
  ON CONFLICT (raffle_id) DO UPDATE SET
    archived_at = NOW();

  -- Delete ticket_reservation_status entries
  DELETE FROM ticket_reservation_status WHERE raffle_id = p_raffle_id;
  GET DIAGNOSTICS v_tickets_deleted = ROW_COUNT;

  -- Delete all orders for this raffle
  DELETE FROM orders WHERE raffle_id = p_raffle_id;
  GET DIAGNOSTICS v_orders_deleted = ROW_COUNT;

  -- Update raffle status
  UPDATE raffles SET archived_at = NOW() WHERE id = p_raffle_id;

  -- Log the archival
  INSERT INTO analytics_events (organization_id, raffle_id, event_type, metadata)
  SELECT organization_id, id, 'raffle_archived', 
    jsonb_build_object(
      'orders_deleted', v_orders_deleted,
      'tickets_deleted', v_tickets_deleted,
      'archived_at', NOW()
    )
  FROM raffles WHERE id = p_raffle_id;

  RETURN jsonb_build_object(
    'success', true,
    'orders_deleted', v_orders_deleted,
    'tickets_deleted', v_tickets_deleted,
    'raffle_id', p_raffle_id
  );
END;
$$;
