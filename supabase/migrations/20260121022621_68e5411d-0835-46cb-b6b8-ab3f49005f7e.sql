-- =============================================================
-- Fix subscription system critical issues
-- =============================================================

-- 1. Add missing notification types (payment_failed, trial_ending)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_notification_type;
ALTER TABLE notifications ADD CONSTRAINT valid_notification_type CHECK (
  type IN (
    'ticket_sold', 'payment_pending', 'payment_approved', 'payment_rejected',
    'raffle_completed', 'raffle_ending_soon', 'winner_selected', 'system',
    'subscription', 'payment_failed', 'trial_ending'
  )
);

-- 2. Add missing index for stripe_subscription_id lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id
ON public.organizations(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- 3. Add unique constraints to prevent duplicates (with error handling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_stripe_customer_id'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add unique_stripe_customer_id constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_stripe_subscription_id'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT unique_stripe_subscription_id UNIQUE (stripe_subscription_id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add unique_stripe_subscription_id constraint: %', SQLERRM;
END $$;