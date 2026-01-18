-- =====================================================
-- PHASE 5: Enterprise Scalability
-- Use ticket_reservation_status to avoid type conflict
-- =====================================================

-- Table stores ONLY unavailable tickets (reserved/pending/sold)
CREATE TABLE IF NOT EXISTS public.ticket_reservation_status (
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  ticket_index INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'pending', 'sold')),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reserved_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (raffle_id, ticket_index)
);

-- Index for order-based lookups (confirm/cancel operations)
CREATE INDEX IF NOT EXISTS idx_ticket_res_status_order 
  ON public.ticket_reservation_status(order_id);

-- Index for expired reservation cleanup
CREATE INDEX IF NOT EXISTS idx_ticket_res_status_expires 
  ON public.ticket_reservation_status(raffle_id, reserved_until)
  WHERE status = 'reserved' AND reserved_until IS NOT NULL;

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_ticket_res_status_raffle 
  ON public.ticket_reservation_status(raffle_id, status);

-- Enable RLS
ALTER TABLE public.ticket_reservation_status ENABLE ROW LEVEL SECURITY;

-- Public read access (needed for raffle pages to check availability)
CREATE POLICY "Public can read ticket reservation status" 
  ON public.ticket_reservation_status
  FOR SELECT 
  USING (true);

-- Only service role can modify (all writes through RPC functions)
CREATE POLICY "Service role manages ticket reservation status" 
  ON public.ticket_reservation_status
  FOR ALL 
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.ticket_reservation_status IS 
  'Sparse storage for unavailable tickets. Composite PK enables O(1) lookups and atomic INSERT ON CONFLICT.';

-- =====================================================
-- Incremental O(1) trigger for ticket_block_status
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_blocks_incremental()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_block_start INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_block_start := (NEW.ticket_index / 1000) * 1000;
    
    INSERT INTO ticket_block_status (raffle_id, block_start, block_size, sold_count, reserved_count)
    VALUES (NEW.raffle_id, v_block_start, 1000, 0, 0)
    ON CONFLICT (raffle_id, block_start) DO NOTHING;
    
    UPDATE ticket_block_status
    SET
      sold_count = sold_count + CASE WHEN NEW.status = 'sold' THEN 1 ELSE 0 END,
      reserved_count = reserved_count + CASE WHEN NEW.status IN ('reserved', 'pending') THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE raffle_id = NEW.raffle_id AND block_start = v_block_start;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_block_start := (OLD.ticket_index / 1000) * 1000;
    
    UPDATE ticket_block_status
    SET
      sold_count = GREATEST(0, sold_count - CASE WHEN OLD.status = 'sold' THEN 1 ELSE 0 END),
      reserved_count = GREATEST(0, reserved_count - CASE WHEN OLD.status IN ('reserved', 'pending') THEN 1 ELSE 0 END),
      updated_at = NOW()
    WHERE raffle_id = OLD.raffle_id AND block_start = v_block_start;
    
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_block_start := (NEW.ticket_index / 1000) * 1000;
    
    UPDATE ticket_block_status
    SET
      sold_count = sold_count
        + CASE WHEN NEW.status = 'sold' THEN 1 ELSE 0 END
        - CASE WHEN OLD.status = 'sold' THEN 1 ELSE 0 END,
      reserved_count = reserved_count
        + CASE WHEN NEW.status IN ('reserved', 'pending') THEN 1 ELSE 0 END
        - CASE WHEN OLD.status IN ('reserved', 'pending') THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE raffle_id = NEW.raffle_id AND block_start = v_block_start;
    
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_blocks_incremental ON public.ticket_reservation_status;
CREATE TRIGGER trigger_sync_blocks_incremental
AFTER INSERT OR UPDATE OF status OR DELETE ON public.ticket_reservation_status
FOR EACH ROW
EXECUTE FUNCTION sync_blocks_incremental();

-- =====================================================
-- atomic_reserve_tickets_v2 - No global lock, O(k) complexity
-- =====================================================

CREATE OR REPLACE FUNCTION public.atomic_reserve_tickets_v2(
  p_raffle_id UUID,
  p_ticket_indices INTEGER[],
  p_buyer_name TEXT,
  p_buyer_email TEXT,
  p_buyer_phone TEXT DEFAULT NULL,
  p_buyer_city TEXT DEFAULT NULL,
  p_reservation_minutes INTEGER DEFAULT 15,
  p_order_total NUMERIC DEFAULT NULL,
  p_is_lucky_numbers BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  order_id UUID,
  reference_code TEXT,
  reserved_until TIMESTAMPTZ,
  ticket_count INTEGER,
  reserved_indices INTEGER[],
  conflict_indices INTEGER[],
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_order_id UUID := gen_random_uuid();
  v_reference TEXT;
  v_reserved_until TIMESTAMPTZ;
  v_reserved INTEGER[];
  v_conflicts INTEGER[];
  v_org_id UUID;
  v_total_tickets INTEGER;
  v_ranges JSONB;
BEGIN
  SELECT r.organization_id, r.total_tickets
  INTO v_org_id, v_total_tickets
  FROM raffles r
  WHERE r.id = p_raffle_id AND r.status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0,
      NULL::INTEGER[], NULL::INTEGER[],
      'Rifa no encontrada o no activa'::TEXT;
    RETURN;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM unnest(p_ticket_indices) AS idx
    WHERE idx < 0 OR idx >= v_total_tickets
  ) THEN
    RETURN QUERY SELECT
      FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0,
      NULL::INTEGER[], NULL::INTEGER[],
      'Índices de boletos fuera de rango'::TEXT;
    RETURN;
  END IF;
  
  v_reference := 'ORD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
  v_reserved_until := NOW() + (p_reservation_minutes || ' minutes')::INTERVAL;
  
  DELETE FROM ticket_reservation_status
  WHERE raffle_id = p_raffle_id
    AND ticket_index = ANY(p_ticket_indices)
    AND status = 'reserved'
    AND reserved_until < NOW();
  
  WITH inserted AS (
    INSERT INTO ticket_reservation_status (raffle_id, ticket_index, status, order_id, reserved_until)
    SELECT p_raffle_id, idx, 'reserved', v_order_id, v_reserved_until
    FROM unnest(p_ticket_indices) AS idx
    ON CONFLICT (raffle_id, ticket_index) DO NOTHING
    RETURNING ticket_index
  )
  SELECT ARRAY_AGG(ticket_index ORDER BY ticket_index) INTO v_reserved FROM inserted;
  
  SELECT ARRAY_AGG(idx ORDER BY idx) INTO v_conflicts
  FROM unnest(p_ticket_indices) AS idx
  WHERE NOT (idx = ANY(COALESCE(v_reserved, ARRAY[]::INTEGER[])));
  
  IF v_conflicts IS NOT NULL AND array_length(v_conflicts, 1) > 0 THEN
    DELETE FROM ticket_reservation_status WHERE order_id = v_order_id;
    
    RETURN QUERY SELECT
      FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 0,
      NULL::INTEGER[], v_conflicts,
      'Algunos boletos ya no están disponibles'::TEXT;
    RETURN;
  END IF;
  
  IF p_is_lucky_numbers THEN
    v_ranges := '[]'::JSONB;
  ELSE
    v_ranges := compress_ticket_indices(p_ticket_indices);
  END IF;
  
  INSERT INTO orders (
    id, raffle_id, organization_id,
    buyer_name, buyer_email, buyer_phone, buyer_city,
    ticket_ranges, lucky_indices, ticket_count,
    reference_code, order_total,
    status, reserved_at, reserved_until
  ) VALUES (
    v_order_id, p_raffle_id, v_org_id,
    p_buyer_name, p_buyer_email, p_buyer_phone, p_buyer_city,
    v_ranges,
    CASE WHEN p_is_lucky_numbers THEN p_ticket_indices ELSE '{}'::INTEGER[] END,
    array_length(p_ticket_indices, 1),
    v_reference, p_order_total,
    'reserved', NOW(), v_reserved_until
  );
  
  RETURN QUERY SELECT
    TRUE,
    v_order_id,
    v_reference,
    v_reserved_until,
    array_length(p_ticket_indices, 1),
    v_reserved,
    NULL::INTEGER[],
    NULL::TEXT;
END;
$$;

-- =====================================================
-- Helper functions for order lifecycle
-- =====================================================

CREATE OR REPLACE FUNCTION public.confirm_order_sale_v2(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE ticket_reservation_status
  SET status = 'sold', reserved_until = NULL
  WHERE order_id = p_order_id;
  
  UPDATE orders
  SET status = 'sold', sold_at = NOW(), updated_at = NOW()
  WHERE id = p_order_id AND status IN ('reserved', 'pending');
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_and_release_v2(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_released INTEGER;
BEGIN
  DELETE FROM ticket_reservation_status
  WHERE order_id = p_order_id;
  
  GET DIAGNOSTICS v_released = ROW_COUNT;
  
  UPDATE orders
  SET status = 'cancelled', canceled_at = NOW(), updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN v_released;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_tickets_batch(
  p_batch_size INTEGER DEFAULT 1000,
  p_max_batches INTEGER DEFAULT 10
)
RETURNS TABLE (
  total_released INTEGER,
  batches_processed INTEGER,
  affected_raffles UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_released INTEGER := 0;
  v_batch INTEGER := 0;
  v_batch_count INTEGER;
  v_raffle_ids UUID[];
  v_all_raffle_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  LOOP
    v_batch := v_batch + 1;
    EXIT WHEN v_batch > p_max_batches;
    
    WITH expired AS (
      SELECT ts.raffle_id, ts.ticket_index
      FROM ticket_reservation_status ts
      WHERE ts.status = 'reserved'
        AND ts.reserved_until < NOW()
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    ),
    deleted AS (
      DELETE FROM ticket_reservation_status ts
      USING expired e
      WHERE ts.raffle_id = e.raffle_id AND ts.ticket_index = e.ticket_index
      RETURNING ts.raffle_id
    )
    SELECT COUNT(*)::INTEGER, ARRAY_AGG(DISTINCT raffle_id)
    INTO v_batch_count, v_raffle_ids
    FROM deleted;
    
    v_released := v_released + COALESCE(v_batch_count, 0);
    
    IF v_raffle_ids IS NOT NULL THEN
      v_all_raffle_ids := v_all_raffle_ids || v_raffle_ids;
    END IF;
    
    EXIT WHEN COALESCE(v_batch_count, 0) = 0;
    
    PERFORM pg_sleep(0.01);
  END LOOP;
  
  UPDATE orders o
  SET status = 'cancelled', canceled_at = NOW()
  WHERE o.status = 'reserved'
    AND o.reserved_until < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM ticket_reservation_status ts WHERE ts.order_id = o.id
    );
  
  RETURN QUERY SELECT
    v_released,
    v_batch,
    (SELECT ARRAY_AGG(DISTINCT x) FROM unnest(v_all_raffle_ids) x);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_tickets_available_v2(
  p_raffle_id UUID,
  p_ticket_indices INTEGER[]
)
RETURNS TABLE (
  available BOOLEAN,
  unavailable_indices INTEGER[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_unavailable INTEGER[];
BEGIN
  SELECT ARRAY_AGG(ticket_index ORDER BY ticket_index)
  INTO v_unavailable
  FROM ticket_reservation_status
  WHERE raffle_id = p_raffle_id
    AND ticket_index = ANY(p_ticket_indices)
    AND (status != 'reserved' OR reserved_until > NOW());
  
  RETURN QUERY SELECT
    v_unavailable IS NULL OR array_length(v_unavailable, 1) IS NULL,
    v_unavailable;
END;
$$;