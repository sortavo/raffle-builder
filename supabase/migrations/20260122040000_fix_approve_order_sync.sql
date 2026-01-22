-- =====================================================
-- FIX: approve_order must sync ticket_reservation_status
--
-- Bug: approve_order only updated the orders table but did NOT
-- update ticket_reservation_status, causing:
-- 1. Tickets remaining as "reserved" instead of "sold"
-- 2. Potential overselling risk
-- 3. Incorrect inventory counts
--
-- This migration fixes approve_order to also update
-- ticket_reservation_status when approving an order.
-- =====================================================

CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_approved_by UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  ticket_count INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_count INTEGER;
  v_raffle_id UUID;
  v_ticket_ranges JSONB;
  v_lucky_indices INTEGER[];
  v_all_indices INTEGER[];
  v_range JSONB;
  v_idx INTEGER;
BEGIN
  -- Get order details and update status
  UPDATE orders
  SET
    status = 'sold',
    sold_at = now(),
    approved_at = now(),
    approved_by = COALESCE(p_approved_by, auth.uid()),
    reserved_until = NULL
  WHERE id = p_order_id
    AND status IN ('reserved', 'pending', 'pending_approval')
  RETURNING
    orders.ticket_count,
    orders.raffle_id,
    orders.ticket_ranges,
    orders.lucky_indices
  INTO v_ticket_count, v_raffle_id, v_ticket_ranges, v_lucky_indices;

  IF v_ticket_count IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Orden no encontrada o ya procesada'::TEXT;
    RETURN;
  END IF;

  -- Expand ticket_ranges to individual indices
  v_all_indices := ARRAY[]::INTEGER[];

  IF v_ticket_ranges IS NOT NULL AND jsonb_array_length(v_ticket_ranges) > 0 THEN
    FOR v_range IN SELECT * FROM jsonb_array_elements(v_ticket_ranges)
    LOOP
      FOR v_idx IN (v_range->>'s')::INTEGER .. (v_range->>'e')::INTEGER
      LOOP
        v_all_indices := v_all_indices || v_idx;
      END LOOP;
    END LOOP;
  END IF;

  -- Add lucky_indices if any
  IF v_lucky_indices IS NOT NULL AND array_length(v_lucky_indices, 1) > 0 THEN
    v_all_indices := v_all_indices || v_lucky_indices;
  END IF;

  -- Update ticket_reservation_status to 'sold'
  -- First try to update existing records
  UPDATE ticket_reservation_status
  SET status = 'sold', reserved_until = NULL
  WHERE order_id = p_order_id;

  -- If no records were updated (order was created without reservations),
  -- insert the missing records
  IF NOT FOUND AND array_length(v_all_indices, 1) > 0 THEN
    INSERT INTO ticket_reservation_status (raffle_id, ticket_index, status, order_id, reserved_until)
    SELECT v_raffle_id, idx, 'sold', p_order_id, NULL
    FROM unnest(v_all_indices) AS idx
    ON CONFLICT (raffle_id, ticket_index)
    DO UPDATE SET status = 'sold', order_id = p_order_id, reserved_until = NULL;
  END IF;

  RETURN QUERY SELECT TRUE, v_ticket_count, NULL::TEXT;
END;
$$;

-- Also fix reject_order to clean up ticket_reservation_status
CREATE OR REPLACE FUNCTION public.reject_order(p_order_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  ticket_count INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_count INTEGER;
BEGIN
  -- Delete reservation records first (release tickets)
  DELETE FROM ticket_reservation_status
  WHERE order_id = p_order_id;

  -- Update order status
  UPDATE orders
  SET
    status = 'canceled',
    reserved_until = NULL,
    canceled_at = now()
  WHERE id = p_order_id
    AND status IN ('reserved', 'pending', 'pending_approval')
  RETURNING orders.ticket_count INTO v_ticket_count;

  IF v_ticket_count IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Orden no encontrada o ya procesada'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_ticket_count, NULL::TEXT;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.approve_order IS
'Approves an order and syncs ticket_reservation_status.
Updates order status to sold and marks all tickets as sold in ticket_reservation_status.
If the order was created without proper reservations, creates the missing records.';

COMMENT ON FUNCTION public.reject_order IS
'Rejects/cancels an order and releases tickets.
Deletes reservation records from ticket_reservation_status and updates order status to canceled.';
