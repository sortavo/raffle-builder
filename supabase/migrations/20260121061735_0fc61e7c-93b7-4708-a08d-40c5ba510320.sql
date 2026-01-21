-- Función para actualizar organización atómicamente con el evento de Stripe
-- Previene estados huérfanos cuando el insert de evento pasa pero el update falla

CREATE OR REPLACE FUNCTION update_organization_from_webhook(
  p_org_id UUID,
  p_event_id TEXT,
  p_event_type TEXT,
  p_update_payload JSONB
) RETURNS JSONB AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  -- Insert event (idempotent - will do nothing on duplicate)
  INSERT INTO stripe_events (event_id, event_type, created_at)
  VALUES (p_event_id, p_event_type, NOW())
  ON CONFLICT (event_id) DO NOTHING;

  -- Check if this was actually inserted (not a duplicate)
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    -- Already processed this event
    RETURN jsonb_build_object('duplicate', true, 'event_id', p_event_id);
  END IF;

  -- Update organization atomically within same transaction
  UPDATE organizations
  SET
    subscription_tier = COALESCE((p_update_payload->>'subscription_tier')::TEXT, subscription_tier),
    subscription_status = COALESCE((p_update_payload->>'subscription_status')::TEXT, subscription_status),
    stripe_customer_id = COALESCE((p_update_payload->>'stripe_customer_id')::TEXT, stripe_customer_id),
    stripe_subscription_id = COALESCE((p_update_payload->>'stripe_subscription_id')::TEXT, stripe_subscription_id),
    current_period_end = COALESCE((p_update_payload->>'current_period_end')::TIMESTAMPTZ, current_period_end),
    max_active_raffles = COALESCE((p_update_payload->>'max_active_raffles')::INTEGER, max_active_raffles),
    max_tickets_per_raffle = COALESCE((p_update_payload->>'max_tickets_per_raffle')::INTEGER, max_tickets_per_raffle),
    templates_available = COALESCE((p_update_payload->>'templates_available')::INTEGER, templates_available),
    updated_at = NOW()
  WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', p_org_id,
    'event_id', p_event_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Transaction automatically rolls back
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION update_organization_from_webhook IS
  'Atomically updates organization from Stripe webhook, preventing orphaned states. Returns {duplicate: true} if event was already processed.';