-- Performance Audit: Critical Missing Indexes
-- P1, P2: Add indexes for Stripe ID lookups

-- =====================================================
-- P1: Index on organizations.stripe_customer_id
-- Used heavily in webhook handlers for customer lookup
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id
ON organizations(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

COMMENT ON INDEX idx_organizations_stripe_customer_id IS 'P1: Performance index for Stripe webhook customer lookups';

-- =====================================================
-- P2: Index on organizations.stripe_subscription_id
-- Used for subscription status updates and lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id
ON organizations(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON INDEX idx_organizations_stripe_subscription_id IS 'P2: Performance index for Stripe subscription lookups';

-- =====================================================
-- Additional Performance Indexes
-- =====================================================

-- Index for organization email lookup (used in webhook fallback)
CREATE INDEX IF NOT EXISTS idx_organizations_email
ON organizations(email)
WHERE email IS NOT NULL;

-- Index for profile email lookup (used in webhook fallback)
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles(email)
WHERE email IS NOT NULL;

-- Composite index for payment_failures unresolved ordered queries
CREATE INDEX IF NOT EXISTS idx_payment_failures_unresolved_ordered
ON payment_failures(organization_id, created_at DESC)
WHERE resolved_at IS NULL;

-- Index for dunning_emails batch lookup
CREATE INDEX IF NOT EXISTS idx_dunning_emails_failure_type
ON dunning_emails(payment_failure_id, email_type);

-- Index for refund_requests by charge (idempotency lookups)
CREATE INDEX IF NOT EXISTS idx_refund_requests_charge
ON refund_requests(stripe_charge_id)
WHERE stripe_charge_id IS NOT NULL;

-- Index for subscription_events analytics queries
CREATE INDEX IF NOT EXISTS idx_subscription_events_org_date
ON subscription_events(organization_id, created_at DESC);

-- =====================================================
-- Analyze tables to update statistics
-- =====================================================
ANALYZE organizations;
ANALYZE profiles;
ANALYZE payment_failures;
ANALYZE dunning_emails;
ANALYZE refund_requests;
ANALYZE subscription_events;
