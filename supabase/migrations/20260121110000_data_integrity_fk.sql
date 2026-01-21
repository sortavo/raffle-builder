-- D3: Data Integrity - Add FK constraint for subscription_events.stripe_event_id
-- This ensures referential integrity between subscription analytics and event tracking

-- =====================================================
-- Step 1: Clean up orphaned references (if any)
-- Set stripe_event_id to NULL where the referenced event doesn't exist
-- =====================================================
UPDATE subscription_events se
SET stripe_event_id = NULL
WHERE se.stripe_event_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM stripe_events e WHERE e.event_id = se.stripe_event_id
  );

-- =====================================================
-- Step 2: Add index for the FK lookup performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id
ON subscription_events(stripe_event_id)
WHERE stripe_event_id IS NOT NULL;

-- =====================================================
-- Step 3: Add FK constraint (optional - stripe_event_id can be NULL)
-- ON DELETE SET NULL ensures we don't break subscription_events if
-- stripe_events are purged/archived
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_subscription_events_stripe_event'
  ) THEN
    ALTER TABLE subscription_events
    ADD CONSTRAINT fk_subscription_events_stripe_event
    FOREIGN KEY (stripe_event_id)
    REFERENCES stripe_events(event_id)
    ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add FK constraint: %', SQLERRM;
END $$;

-- =====================================================
-- Documentation
-- =====================================================
COMMENT ON CONSTRAINT fk_subscription_events_stripe_event ON subscription_events IS
  'D3: Ensures stripe_event_id references a valid stripe_events record. SET NULL on delete to preserve analytics when events are archived.';
