-- =====================================================
-- MIGRATION: ticket_block_status for mega-raffle support
-- Supports up to 30 active raffles with 10M tickets each
-- =====================================================

-- Table: ticket_block_status (stores ticket status in blocks of 1000)
CREATE TABLE IF NOT EXISTS public.ticket_block_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  block_start INT NOT NULL,           -- Starting index (0, 1000, 2000...)
  block_size INT NOT NULL DEFAULT 1000,
  sold_count INT DEFAULT 0,           -- Count of sold tickets in this block
  reserved_count INT DEFAULT 0,       -- Count of reserved tickets in this block
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(raffle_id, block_start)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_block_status_raffle ON public.ticket_block_status(raffle_id);
CREATE INDEX IF NOT EXISTS idx_block_status_lookup ON public.ticket_block_status(raffle_id, block_start);
CREATE INDEX IF NOT EXISTS idx_block_status_updated ON public.ticket_block_status(updated_at DESC);

-- Enable RLS
ALTER TABLE public.ticket_block_status ENABLE ROW LEVEL SECURITY;

-- Public can read block status (needed for public raffle pages)
CREATE POLICY "Public read for ticket blocks" ON public.ticket_block_status
  FOR SELECT USING (true);

-- Only service role can manage blocks
CREATE POLICY "Service role manages blocks" ON public.ticket_block_status
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- FUNCTION: Initialize blocks for a raffle
-- =====================================================
CREATE OR REPLACE FUNCTION public.initialize_ticket_blocks(p_raffle_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total INT;
  v_block_start INT := 0;
  v_count INT := 0;
BEGIN
  -- Get total tickets for raffle
  SELECT total_tickets INTO v_total FROM raffles WHERE id = p_raffle_id;
  
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Raffle not found: %', p_raffle_id;
  END IF;
  
  -- Create blocks in batches of 1000 tickets each
  WHILE v_block_start < v_total LOOP
    INSERT INTO ticket_block_status (raffle_id, block_start, block_size)
    VALUES (p_raffle_id, v_block_start, 1000)
    ON CONFLICT (raffle_id, block_start) DO NOTHING;
    
    v_block_start := v_block_start + 1000;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- FUNCTION: Get counts from blocks (much faster than scanning orders)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_ticket_counts_from_blocks(p_raffle_id UUID)
RETURNS TABLE(total_count BIGINT, sold_count BIGINT, reserved_count BIGINT, available_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total INT;
BEGIN
  -- Get total tickets
  SELECT total_tickets INTO v_total FROM raffles WHERE id = p_raffle_id;
  
  IF v_total IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT;
    RETURN;
  END IF;
  
  -- Sum counts from all blocks
  RETURN QUERY
  SELECT 
    v_total::BIGINT,
    COALESCE(SUM(bs.sold_count), 0)::BIGINT,
    COALESCE(SUM(bs.reserved_count), 0)::BIGINT,
    GREATEST(0, v_total - COALESCE(SUM(bs.sold_count), 0) - COALESCE(SUM(bs.reserved_count), 0))::BIGINT
  FROM ticket_block_status bs
  WHERE bs.raffle_id = p_raffle_id;
END;
$$;

-- =====================================================
-- FUNCTION: Sync block counts for a specific raffle
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_raffle_blocks(p_raffle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_block RECORD;
BEGIN
  -- Ensure blocks exist
  PERFORM initialize_ticket_blocks(p_raffle_id);
  
  -- Update each block's counts based on actual orders
  FOR v_block IN SELECT block_start FROM ticket_block_status WHERE raffle_id = p_raffle_id LOOP
    UPDATE ticket_block_status SET
      sold_count = (
        SELECT COALESCE(SUM(
          CASE WHEN o.status = 'sold' THEN
            -- Count indices from ranges that fall within this block
            (SELECT COUNT(*) FROM (
              SELECT generate_series((r.value->>'s')::INT, (r.value->>'e')::INT) AS idx
              FROM jsonb_array_elements(o.ticket_ranges) r
              UNION ALL
              SELECT unnest(o.lucky_indices)
            ) sub WHERE sub.idx >= v_block.block_start AND sub.idx < v_block.block_start + 1000)
          ELSE 0 END
        ), 0)
        FROM orders o
        WHERE o.raffle_id = p_raffle_id
          AND o.status = 'sold'
      ),
      reserved_count = (
        SELECT COALESCE(SUM(
          CASE WHEN o.status IN ('reserved', 'pending') AND (o.reserved_until IS NULL OR o.reserved_until > NOW()) THEN
            (SELECT COUNT(*) FROM (
              SELECT generate_series((r.value->>'s')::INT, (r.value->>'e')::INT) AS idx
              FROM jsonb_array_elements(o.ticket_ranges) r
              UNION ALL
              SELECT unnest(o.lucky_indices)
            ) sub WHERE sub.idx >= v_block.block_start AND sub.idx < v_block.block_start + 1000)
          ELSE 0 END
        ), 0)
        FROM orders o
        WHERE o.raffle_id = p_raffle_id
          AND o.status IN ('reserved', 'pending')
      ),
      updated_at = now()
    WHERE raffle_id = p_raffle_id AND block_start = v_block.block_start;
  END LOOP;
END;
$$;

-- =====================================================
-- FUNCTION: Update affected blocks when order changes
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_ticket_blocks_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_raffle_id UUID;
  v_affected_blocks INT[];
  v_indices INT[];
  v_block_start INT;
BEGIN
  -- Determine which raffle to update
  v_raffle_id := COALESCE(NEW.raffle_id, OLD.raffle_id);
  
  -- Get all affected indices from the order
  IF TG_OP = 'DELETE' THEN
    SELECT ARRAY(
      SELECT generate_series((r.value->>'s')::INT, (r.value->>'e')::INT)
      FROM jsonb_array_elements(COALESCE(OLD.ticket_ranges, '[]'::jsonb)) r
    ) || COALESCE(OLD.lucky_indices, '{}'::INT[]) INTO v_indices;
  ELSE
    SELECT ARRAY(
      SELECT generate_series((r.value->>'s')::INT, (r.value->>'e')::INT)
      FROM jsonb_array_elements(COALESCE(NEW.ticket_ranges, '[]'::jsonb)) r
    ) || COALESCE(NEW.lucky_indices, '{}'::INT[]) INTO v_indices;
  END IF;
  
  -- Get unique blocks affected
  SELECT array_agg(DISTINCT (idx / 1000) * 1000) INTO v_affected_blocks
  FROM unnest(v_indices) AS idx;
  
  -- Update counts for each affected block
  IF v_affected_blocks IS NOT NULL THEN
    FOR v_block_start IN SELECT unnest(v_affected_blocks) LOOP
      -- First ensure block exists
      INSERT INTO ticket_block_status (raffle_id, block_start, block_size)
      VALUES (v_raffle_id, v_block_start, 1000)
      ON CONFLICT (raffle_id, block_start) DO NOTHING;
      
      -- Recalculate counts for this block
      UPDATE ticket_block_status SET
        sold_count = (
          SELECT COALESCE(COUNT(*), 0)
          FROM orders o,
               LATERAL (
                 SELECT generate_series((r.value->>'s')::INT, (r.value->>'e')::INT) AS idx
                 FROM jsonb_array_elements(o.ticket_ranges) r
                 UNION ALL
                 SELECT unnest(o.lucky_indices)
               ) sub
          WHERE o.raffle_id = v_raffle_id
            AND o.status = 'sold'
            AND sub.idx >= v_block_start AND sub.idx < v_block_start + 1000
        ),
        reserved_count = (
          SELECT COALESCE(COUNT(*), 0)
          FROM orders o,
               LATERAL (
                 SELECT generate_series((r.value->>'s')::INT, (r.value->>'e')::INT) AS idx
                 FROM jsonb_array_elements(o.ticket_ranges) r
                 UNION ALL
                 SELECT unnest(o.lucky_indices)
               ) sub
          WHERE o.raffle_id = v_raffle_id
            AND o.status IN ('reserved', 'pending')
            AND (o.reserved_until IS NULL OR o.reserved_until > NOW())
            AND sub.idx >= v_block_start AND sub.idx < v_block_start + 1000
        ),
        updated_at = now()
      WHERE raffle_id = v_raffle_id AND block_start = v_block_start;
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for order changes
DROP TRIGGER IF EXISTS trigger_sync_blocks_on_order ON public.orders;
CREATE TRIGGER trigger_sync_blocks_on_order
AFTER INSERT OR UPDATE OF status, ticket_ranges, lucky_indices OR DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION sync_ticket_blocks_on_order();

-- =====================================================
-- FUNCTION: Auto-initialize blocks when raffle is created
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_initialize_blocks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.total_tickets IS NOT NULL AND NEW.total_tickets > 0 THEN
    PERFORM initialize_ticket_blocks(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new raffles
DROP TRIGGER IF EXISTS trigger_auto_init_blocks ON public.raffles;
CREATE TRIGGER trigger_auto_init_blocks
AFTER INSERT ON public.raffles
FOR EACH ROW
EXECUTE FUNCTION auto_initialize_blocks();

-- =====================================================
-- FUNCTION: Get blocks with availability info for random selection
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_available_blocks(p_raffle_id UUID)
RETURNS TABLE(block_start INT, available_count INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    bs.block_start,
    GREATEST(0, bs.block_size - bs.sold_count - bs.reserved_count)::INT AS available_count
  FROM ticket_block_status bs
  WHERE bs.raffle_id = p_raffle_id
    AND (bs.block_size - bs.sold_count - bs.reserved_count) > 0
  ORDER BY bs.block_start;
$$;