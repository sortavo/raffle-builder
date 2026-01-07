
-- ============================================
-- PHASE 1: VIRTUAL TICKETS + LIFECYCLE (90 days)
-- ============================================

-- 1. Create sold_tickets table (ONLY stores sold/reserved tickets)
CREATE TABLE public.sold_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  ticket_index INTEGER NOT NULL,
  ticket_number TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'reserved',
  
  -- Buyer info
  buyer_id UUID REFERENCES buyers(id),
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  
  -- Payment info
  payment_reference TEXT,
  payment_proof_url TEXT,
  payment_method TEXT,
  order_total NUMERIC,
  notes TEXT,
  
  -- Timestamps
  reserved_at TIMESTAMPTZ,
  reserved_until TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent race conditions
  CONSTRAINT unique_sold_ticket UNIQUE (raffle_id, ticket_index)
);

-- Optimized indices for sold_tickets
CREATE INDEX idx_sold_tickets_raffle_status ON sold_tickets(raffle_id, status);
CREATE INDEX idx_sold_tickets_reference ON sold_tickets(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX idx_sold_tickets_email ON sold_tickets(buyer_email) WHERE buyer_email IS NOT NULL;
CREATE INDEX idx_sold_tickets_buyer_id ON sold_tickets(buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX idx_sold_tickets_reserved_until ON sold_tickets(reserved_until) WHERE status = 'reserved';

-- RLS for sold_tickets
ALTER TABLE sold_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view sold tickets for active raffles"
  ON sold_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM raffles r
      WHERE r.id = sold_tickets.raffle_id 
      AND r.status IN ('active', 'completed')
    )
  );

CREATE POLICY "Org members can manage sold tickets"
  ON sold_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM raffles r
      WHERE r.id = sold_tickets.raffle_id 
      AND has_org_access(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Anyone can insert sold tickets for active raffles"
  ON sold_tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raffles r
      WHERE r.id = sold_tickets.raffle_id 
      AND r.status = 'active'
    )
  );

-- 2. Create archived_raffle_summary table
CREATE TABLE public.archived_raffle_summary (
  raffle_id UUID PRIMARY KEY REFERENCES raffles(id) ON DELETE CASCADE,
  
  -- Final statistics
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  tickets_reserved INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  unique_buyers INTEGER NOT NULL DEFAULT 0,
  
  -- Aggregated data in JSONB
  winners JSONB DEFAULT '[]'::jsonb,
  top_buyers JSONB DEFAULT '[]'::jsonb,
  sales_by_day JSONB DEFAULT '{}'::jsonb,
  sales_by_hour JSONB DEFAULT '{}'::jsonb,
  buyer_cities JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  draw_executed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for archived_raffle_summary
CREATE INDEX idx_archived_summary_archived_at ON archived_raffle_summary(archived_at DESC);

-- RLS for archived_raffle_summary
ALTER TABLE archived_raffle_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view archived summaries"
  ON archived_raffle_summary FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM raffles r
      WHERE r.id = archived_raffle_summary.raffle_id 
      AND has_org_access(auth.uid(), r.organization_id)
    )
  );

-- 3. Create format_virtual_ticket function (IMMUTABLE for performance)
CREATE OR REPLACE FUNCTION format_virtual_ticket(
  p_ticket_index INTEGER,
  p_numbering_config JSONB,
  p_total_tickets INTEGER
) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_start_number INTEGER;
  v_step INTEGER;
  v_pad_enabled BOOLEAN;
  v_pad_width INTEGER;
  v_pad_char TEXT;
  v_prefix TEXT;
  v_suffix TEXT;
  v_separator TEXT;
  v_display_number INTEGER;
  v_result TEXT;
BEGIN
  -- Parse config with defaults
  v_start_number := COALESCE((p_numbering_config->>'start_number')::INTEGER, 1);
  v_step := COALESCE((p_numbering_config->>'step')::INTEGER, 1);
  v_pad_enabled := COALESCE((p_numbering_config->>'pad_enabled')::BOOLEAN, true);
  v_pad_width := COALESCE((p_numbering_config->>'pad_width')::INTEGER, LENGTH(p_total_tickets::TEXT));
  v_pad_char := COALESCE(p_numbering_config->>'pad_char', '0');
  v_prefix := p_numbering_config->>'prefix';
  v_suffix := p_numbering_config->>'suffix';
  v_separator := COALESCE(p_numbering_config->>'separator', '');

  -- Calculate display number
  v_display_number := v_start_number + (p_ticket_index - 1) * v_step;

  -- Format with padding
  IF v_pad_enabled THEN
    v_result := LPAD(v_display_number::TEXT, v_pad_width, v_pad_char);
  ELSE
    v_result := v_display_number::TEXT;
  END IF;

  -- Add prefix/suffix
  IF v_prefix IS NOT NULL AND v_prefix != '' THEN
    v_result := v_prefix || v_separator || v_result;
  END IF;
  IF v_suffix IS NOT NULL AND v_suffix != '' THEN
    v_result := v_result || v_separator || v_suffix;
  END IF;

  RETURN v_result;
END;
$$;

-- 4. Create get_virtual_tickets RPC (replaces physical ticket queries)
CREATE OR REPLACE FUNCTION get_virtual_tickets(
  p_raffle_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 100
) RETURNS TABLE(
  id UUID,
  ticket_number TEXT,
  ticket_index INTEGER,
  status TEXT,
  buyer_name TEXT,
  buyer_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_numbering_config JSONB;
  v_start_index INTEGER;
  v_end_index INTEGER;
BEGIN
  -- Get raffle config
  SELECT r.total_tickets, COALESCE(r.numbering_config, '{}'::jsonb)
  INTO v_total_tickets, v_numbering_config
  FROM raffles r
  WHERE r.id = p_raffle_id AND r.status IN ('active', 'draft', 'upcoming');

  IF v_total_tickets IS NULL THEN
    RETURN;
  END IF;

  -- Calculate range (1-indexed)
  v_start_index := ((p_page - 1) * p_page_size) + 1;
  v_end_index := LEAST(v_start_index + p_page_size - 1, v_total_tickets);

  -- Return virtual tickets merged with sold tickets
  RETURN QUERY
  WITH virtual_range AS (
    SELECT generate_series(v_start_index, v_end_index) AS idx
  ),
  sold AS (
    SELECT 
      st.id,
      st.ticket_index,
      st.status::TEXT AS status,
      st.buyer_name,
      st.buyer_city
    FROM sold_tickets st
    WHERE st.raffle_id = p_raffle_id
      AND st.ticket_index BETWEEN v_start_index AND v_end_index
  )
  SELECT 
    COALESCE(s.id, gen_random_uuid()) AS id,
    format_virtual_ticket(vr.idx, v_numbering_config, v_total_tickets) AS ticket_number,
    vr.idx AS ticket_index,
    COALESCE(s.status, 'available') AS status,
    s.buyer_name,
    s.buyer_city
  FROM virtual_range vr
  LEFT JOIN sold s ON s.ticket_index = vr.idx
  ORDER BY vr.idx;
END;
$$;

GRANT EXECUTE ON FUNCTION get_virtual_tickets TO anon, authenticated;

-- 5. Create get_virtual_ticket_counts RPC (fast counts without COUNT(*))
CREATE OR REPLACE FUNCTION get_virtual_ticket_counts(
  p_raffle_id UUID
) RETURNS TABLE(
  total_count BIGINT,
  sold_count BIGINT,
  reserved_count BIGINT,
  available_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_sold BIGINT;
  v_reserved BIGINT;
BEGIN
  -- Get total from raffle config (instant)
  SELECT r.total_tickets INTO v_total_tickets
  FROM raffles r
  WHERE r.id = p_raffle_id;

  IF v_total_tickets IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;

  -- Count actual sold/reserved (fast - only counts actual rows)
  SELECT 
    COUNT(*) FILTER (WHERE status = 'sold'),
    COUNT(*) FILTER (WHERE status = 'reserved')
  INTO v_sold, v_reserved
  FROM sold_tickets
  WHERE raffle_id = p_raffle_id;

  RETURN QUERY SELECT 
    v_total_tickets::BIGINT,
    COALESCE(v_sold, 0),
    COALESCE(v_reserved, 0),
    (v_total_tickets - COALESCE(v_sold, 0) - COALESCE(v_reserved, 0))::BIGINT;
END;
$$;

GRANT EXECUTE ON FUNCTION get_virtual_ticket_counts TO anon, authenticated;

-- 6. Create reserve_virtual_tickets RPC (atomic with ON CONFLICT)
CREATE OR REPLACE FUNCTION reserve_virtual_tickets(
  p_raffle_id UUID,
  p_ticket_indices INTEGER[],
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT,
  p_buyer_city TEXT DEFAULT NULL,
  p_reservation_minutes INTEGER DEFAULT 15,
  p_order_total NUMERIC DEFAULT NULL
) RETURNS TABLE(
  success BOOLEAN,
  reference_code TEXT,
  reserved_until TIMESTAMPTZ,
  reserved_count INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_tickets INTEGER;
  v_numbering_config JSONB;
  v_reference TEXT;
  v_reserved_until TIMESTAMPTZ;
  v_inserted INTEGER := 0;
BEGIN
  -- Validate raffle exists and is active
  SELECT r.total_tickets, COALESCE(r.numbering_config, '{}'::jsonb)
  INTO v_total_tickets, v_numbering_config
  FROM raffles r
  WHERE r.id = p_raffle_id AND r.status = 'active';

  IF v_total_tickets IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, 0, 'Rifa no encontrada o inactiva';
    RETURN;
  END IF;

  -- Validate all indices are within range
  IF EXISTS (
    SELECT 1 FROM unnest(p_ticket_indices) AS idx 
    WHERE idx < 1 OR idx > v_total_tickets
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, 0, 'Índice de boleto fuera de rango';
    RETURN;
  END IF;

  -- Generate reference and expiry
  v_reference := upper(substr(md5(random()::text), 1, 8));
  v_reserved_until := NOW() + (p_reservation_minutes || ' minutes')::INTERVAL;

  -- ATOMIC INSERT with ON CONFLICT to prevent race conditions
  BEGIN
    INSERT INTO sold_tickets (
      raffle_id, ticket_index, ticket_number, status,
      buyer_name, buyer_email, buyer_phone, buyer_city,
      payment_reference, order_total, reserved_at, reserved_until
    )
    SELECT 
      p_raffle_id,
      idx,
      format_virtual_ticket(idx, v_numbering_config, v_total_tickets),
      'reserved',
      p_buyer_name,
      lower(p_buyer_email),
      p_buyer_phone,
      p_buyer_city,
      v_reference,
      p_order_total,
      NOW(),
      v_reserved_until
    FROM unnest(p_ticket_indices) AS idx
    ON CONFLICT (raffle_id, ticket_index) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    -- Validate all tickets were reserved (rollback if partial)
    IF v_inserted != array_length(p_ticket_indices, 1) THEN
      DELETE FROM sold_tickets WHERE payment_reference = v_reference;
      RETURN QUERY SELECT 
        FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, 0, 
        format('%s boleto(s) ya no estaban disponibles', 
               array_length(p_ticket_indices, 1) - v_inserted);
      RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_reference, v_reserved_until, v_inserted, NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    DELETE FROM sold_tickets WHERE payment_reference = v_reference;
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, 0, SQLERRM;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION reserve_virtual_tickets TO anon, authenticated;

-- 7. Create archive_raffle function (lifecycle - 90 days)
CREATE OR REPLACE FUNCTION archive_raffle(p_raffle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Create aggregated summary
  INSERT INTO archived_raffle_summary (
    raffle_id,
    tickets_sold,
    tickets_reserved,
    total_revenue,
    unique_buyers,
    winners,
    top_buyers,
    sales_by_day,
    buyer_cities,
    draw_executed_at
  )
  SELECT 
    p_raffle_id,
    COUNT(*) FILTER (WHERE status = 'sold'),
    COUNT(*) FILTER (WHERE status = 'reserved'),
    COALESCE(SUM(order_total) FILTER (WHERE status = 'sold'), 0),
    COUNT(DISTINCT buyer_email),
    
    -- Winners from raffle_draws
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'ticket_number', rd.ticket_number,
      'buyer_name', rd.winner_name,
      'buyer_email', rd.winner_email,
      'prize', rd.prize_name,
      'draw_type', rd.draw_type
    ) ORDER BY rd.drawn_at), '[]'::jsonb)
    FROM raffle_draws rd WHERE rd.raffle_id = p_raffle_id),
    
    -- Top 10 buyers
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'email', t.buyer_email,
      'name', t.buyer_name,
      'tickets', t.ticket_count,
      'spent', t.total_spent
    ) ORDER BY t.total_spent DESC), '[]'::jsonb)
    FROM (
      SELECT buyer_email, buyer_name, COUNT(*) as ticket_count, SUM(order_total) as total_spent
      FROM sold_tickets WHERE raffle_id = p_raffle_id AND status = 'sold'
      GROUP BY buyer_email, buyer_name
      ORDER BY total_spent DESC NULLS LAST
      LIMIT 10
    ) t),
    
    -- Sales by day
    (SELECT COALESCE(jsonb_object_agg(day::text, cnt), '{}'::jsonb)
    FROM (
      SELECT DATE(sold_at) as day, COUNT(*) as cnt
      FROM sold_tickets WHERE raffle_id = p_raffle_id AND sold_at IS NOT NULL
      GROUP BY DATE(sold_at)
    ) d),
    
    -- Cities
    (SELECT COALESCE(jsonb_object_agg(COALESCE(city, 'No especificada'), cnt), '{}'::jsonb)
    FROM (
      SELECT buyer_city as city, COUNT(*) as cnt
      FROM sold_tickets WHERE raffle_id = p_raffle_id
      GROUP BY buyer_city
    ) c),
    
    v_raffle.draw_date
    
  FROM sold_tickets
  WHERE raffle_id = p_raffle_id
  ON CONFLICT (raffle_id) DO UPDATE SET
    archived_at = NOW();

  -- Delete all tickets for this raffle
  DELETE FROM sold_tickets WHERE raffle_id = p_raffle_id;
  GET DIAGNOSTICS v_tickets_deleted = ROW_COUNT;

  -- Update raffle status
  UPDATE raffles SET archived_at = NOW() WHERE id = p_raffle_id;

  RETURN jsonb_build_object(
    'success', true,
    'raffle_id', p_raffle_id,
    'tickets_deleted', v_tickets_deleted,
    'archived_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION archive_raffle TO authenticated;
