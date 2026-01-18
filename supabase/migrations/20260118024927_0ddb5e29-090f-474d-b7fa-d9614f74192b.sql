-- =====================================================
-- PHASE 5 CORRECTIVE: Migrate existing data
-- =====================================================

-- 1. Drop the old O(n) trigger on orders table
DROP TRIGGER IF EXISTS trigger_sync_blocks_on_order ON public.orders;

-- 2. Populate ticket_reservation_status from existing orders
DO $$
DECLARE
  v_count INTEGER := 0;
  v_total INTEGER := 0;
  v_order RECORD;
  v_indices INTEGER[];
BEGIN
  RAISE NOTICE 'Starting migration of existing orders to ticket_reservation_status...';

  -- Count orders to process
  SELECT COUNT(*) INTO v_total
  FROM orders
  WHERE status IN ('reserved', 'pending', 'sold');

  RAISE NOTICE 'Total orders to process: %', v_total;

  FOR v_order IN
    SELECT id, raffle_id, ticket_ranges, lucky_indices, status, reserved_until
    FROM orders
    WHERE status IN ('reserved', 'pending', 'sold')
  LOOP
    -- Expand ticket_ranges to individual indices
    SELECT ARRAY(
      SELECT generate_series((r.value->>'s')::INT, (r.value->>'e')::INT)
      FROM jsonb_array_elements(COALESCE(v_order.ticket_ranges, '[]'::JSONB)) r
    ) || COALESCE(v_order.lucky_indices, ARRAY[]::INTEGER[])
    INTO v_indices;

    -- Insert into ticket_reservation_status (ignore duplicates)
    IF v_indices IS NOT NULL AND array_length(v_indices, 1) > 0 THEN
      INSERT INTO ticket_reservation_status (raffle_id, ticket_index, status, order_id, reserved_until)
      SELECT
        v_order.raffle_id,
        idx,
        v_order.status,
        v_order.id,
        CASE WHEN v_order.status = 'reserved' THEN v_order.reserved_until ELSE NULL END
      FROM unnest(v_indices) AS idx
      ON CONFLICT (raffle_id, ticket_index) DO NOTHING;
    END IF;

    v_count := v_count + 1;

    -- Log progress every 1000 orders
    IF v_count % 1000 = 0 THEN
      RAISE NOTICE 'Processed %/% orders...', v_count, v_total;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration completed. Total orders processed: %', v_count;
END;
$$;

-- 3. Resync block counters for data integrity
DO $$
DECLARE
  v_raffle RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Resyncing block counters...';

  FOR v_raffle IN
    SELECT DISTINCT raffle_id
    FROM ticket_reservation_status
  LOOP
    -- Recalculate counters for each block of this raffle
    UPDATE ticket_block_status tbs
    SET
      sold_count = (
        SELECT COUNT(*)
        FROM ticket_reservation_status trs
        WHERE trs.raffle_id = tbs.raffle_id
          AND trs.status = 'sold'
          AND trs.ticket_index >= tbs.block_start
          AND trs.ticket_index < tbs.block_start + 1000
      ),
      reserved_count = (
        SELECT COUNT(*)
        FROM ticket_reservation_status trs
        WHERE trs.raffle_id = tbs.raffle_id
          AND trs.status IN ('reserved', 'pending')
          AND trs.ticket_index >= tbs.block_start
          AND trs.ticket_index < tbs.block_start + 1000
      ),
      updated_at = NOW()
    WHERE tbs.raffle_id = v_raffle.raffle_id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Resync completed. Raffles processed: %', v_count;
END;
$$;

-- 4. Update table comment to document migration
COMMENT ON TABLE public.ticket_reservation_status IS
  'Sparse storage for unavailable tickets. Migrated from orders on 2025-01-18. Composite PK enables O(1) lookups.';