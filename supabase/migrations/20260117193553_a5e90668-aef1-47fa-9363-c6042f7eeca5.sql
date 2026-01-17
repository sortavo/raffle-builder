-- =====================================================
-- PHASE 1: Optimistic Locking for Order Updates
-- =====================================================

-- Add version column for optimistic locking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index for version checks
CREATE INDEX IF NOT EXISTS idx_orders_version ON orders(id, version);

-- Update function that checks version
CREATE OR REPLACE FUNCTION update_order_with_version(
  p_order_id UUID,
  p_expected_version INTEGER,
  p_new_status TEXT DEFAULT NULL,
  p_payment_proof_url TEXT DEFAULT NULL,
  p_approved_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_version INTEGER,
  current_data JSONB,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated_count INTEGER;
  v_new_version INTEGER;
  v_current_order JSONB;
BEGIN
  UPDATE orders
  SET
    status = COALESCE(p_new_status, status),
    payment_proof_url = COALESCE(p_payment_proof_url, payment_proof_url),
    approved_at = COALESCE(p_approved_at, approved_at),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_order_id
    AND version = p_expected_version
  RETURNING version INTO v_new_version;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    -- Get current data for client to see what changed
    SELECT jsonb_build_object(
      'id', id,
      'status', status,
      'version', version,
      'updated_at', updated_at
    ) INTO v_current_order
    FROM orders WHERE id = p_order_id;
    
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      NULL::INTEGER,
      v_current_order,
      'Concurrent modification detected, please refresh and retry'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE::BOOLEAN, v_new_version, NULL::JSONB, NULL::TEXT;
END;
$$;