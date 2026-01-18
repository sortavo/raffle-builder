-- =====================================================
-- STRIPE ENTERPRISE OVERHAUL - Phase 2-6 Database Schema
-- =====================================================

-- =====================================================
-- PHASE 2: Billing Audit Log
-- Comprehensive logging of all billing events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.billing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'system', 'stripe_webhook')),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  stripe_event_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for billing audit log
CREATE INDEX IF NOT EXISTS idx_billing_audit_org ON billing_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_audit_date ON billing_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_audit_action ON billing_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_billing_audit_stripe ON billing_audit_log(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- RLS for billing audit log
ALTER TABLE billing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view own billing audit" ON billing_audit_log
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Platform admins view all billing audit" ON billing_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
  );

-- =====================================================
-- PHASE 3: Refund Management System
-- =====================================================
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_charge_id TEXT NOT NULL,
  stripe_refund_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT DEFAULT 'usd',
  reason TEXT NOT NULL CHECK (reason IN (
    'requested_by_customer', 'duplicate', 'fraudulent',
    'product_not_received', 'subscription_canceled', 'other'
  )),
  reason_details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'processing', 'completed', 'failed'
  )),
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refund audit log for detailed tracking
CREATE TABLE IF NOT EXISTS public.refund_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id UUID REFERENCES refund_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refund tables
CREATE INDEX IF NOT EXISTS idx_refund_requests_org ON refund_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_stripe ON refund_requests(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_refund_audit_request ON refund_audit_log(refund_request_id);

-- RLS for refund tables
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view own refunds" ON refund_requests
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Platform admins manage all refunds" ON refund_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members view own refund audit" ON refund_audit_log
  FOR SELECT USING (
    refund_request_id IN (
      SELECT id FROM refund_requests 
      WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =====================================================
-- PHASE 4: Dunning and Payment Recovery System
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  failure_code TEXT,
  failure_message TEXT,
  attempt_count INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution TEXT CHECK (resolution IN ('paid', 'forgiven', 'canceled', 'manual', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dunning emails tracking
CREATE TABLE IF NOT EXISTS public.dunning_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_failure_id UUID REFERENCES payment_failures(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'first_notice', 'second_notice', 'final_notice',
    'suspension_warning', 'account_suspended'
  )),
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Dunning configuration per tier
CREATE TABLE IF NOT EXISTS public.dunning_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_tier TEXT NOT NULL UNIQUE,
  retry_schedule JSONB DEFAULT '[1, 3, 5, 7]'::JSONB,
  grace_period_days INTEGER DEFAULT 7,
  suspension_after_days INTEGER DEFAULT 14,
  cancellation_after_days INTEGER DEFAULT 30,
  email_schedule JSONB DEFAULT '{"first_notice": 0, "second_notice": 3, "final_notice": 7, "suspension_warning": 10}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default dunning configurations
INSERT INTO dunning_config (subscription_tier, grace_period_days, suspension_after_days, cancellation_after_days) VALUES
  ('basic', 7, 14, 30),
  ('pro', 10, 21, 45),
  ('premium', 14, 28, 60),
  ('enterprise', 21, 45, 90)
ON CONFLICT (subscription_tier) DO NOTHING;

-- Indexes for dunning tables
CREATE INDEX IF NOT EXISTS idx_payment_failures_org ON payment_failures(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_unresolved ON payment_failures(organization_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_failures_invoice ON payment_failures(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_emails_failure ON dunning_emails(payment_failure_id);
CREATE INDEX IF NOT EXISTS idx_dunning_emails_org ON dunning_emails(organization_id);

-- RLS for dunning tables
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view own payment failures" ON payment_failures
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Platform admins manage payment failures" ON payment_failures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members view own dunning emails" ON dunning_emails
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Anyone can read dunning config" ON dunning_config
  FOR SELECT USING (true);

-- =====================================================
-- PHASE 5: Subscription Analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trial_started', 'trial_converted', 'trial_expired',
    'subscription_started', 'subscription_upgraded', 'subscription_downgraded',
    'subscription_canceled', 'subscription_reactivated', 'subscription_expired',
    'payment_succeeded', 'payment_failed', 'refund_processed'
  )),
  from_tier TEXT,
  to_tier TEXT,
  mrr_change_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::JSONB,
  stripe_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscription events
CREATE INDEX IF NOT EXISTS idx_sub_events_org ON subscription_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sub_events_date ON subscription_events(created_at);

-- RLS for subscription events
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view own sub events" ON subscription_events
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Platform admins view all sub events" ON subscription_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
  );

-- =====================================================
-- PHASE 6: Enhanced Coupon Support (Stripe Sync)
-- =====================================================
-- Add Stripe sync columns to existing coupons table
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS stripe_promotion_code_id TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT 'once';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS duration_in_months INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS valid_tiers TEXT[] DEFAULT ARRAY['basic', 'pro', 'premium', 'enterprise'];
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS first_time_only BOOLEAN DEFAULT false;

-- Add unique index for stripe_coupon_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_stripe_id ON coupons(stripe_coupon_id) WHERE stripe_coupon_id IS NOT NULL;

-- =====================================================
-- Tax Settings for Organizations
-- =====================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id_type TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_currency TEXT DEFAULT 'usd';

-- =====================================================
-- MRR Calculation Function
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_mrr()
RETURNS TABLE (
  tier TEXT,
  mrr_cents BIGINT,
  subscriber_count INTEGER
) AS $$
  SELECT
    subscription_tier::TEXT as tier,
    SUM(CASE subscription_period 
      WHEN 'monthly' THEN 
        CASE subscription_tier 
          WHEN 'basic' THEN 4900
          WHEN 'pro' THEN 14900
          WHEN 'premium' THEN 29900
          WHEN 'enterprise' THEN 49900
          ELSE 0
        END
      WHEN 'annual' THEN
        CASE subscription_tier
          WHEN 'basic' THEN 4083
          WHEN 'pro' THEN 12417
          WHEN 'premium' THEN 24917
          WHEN 'enterprise' THEN 41583
          ELSE 0
        END
      ELSE 0
    END)::BIGINT as mrr_cents,
    COUNT(*)::INTEGER as subscriber_count
  FROM organizations
  WHERE subscription_status = 'active'
    AND subscription_tier IS NOT NULL
  GROUP BY subscription_tier;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Grant execute on MRR function
GRANT EXECUTE ON FUNCTION calculate_mrr() TO authenticated;

-- =====================================================
-- Churn Rate Calculation Function
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_churn_rate(p_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  month DATE,
  starting_subscribers INTEGER,
  churned_subscribers INTEGER,
  churn_rate NUMERIC
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_starting INTEGER;
  v_churned INTEGER;
BEGIN
  v_start_date := date_trunc('month', p_month)::DATE;
  v_end_date := (v_start_date + INTERVAL '1 month')::DATE;

  -- Count subscribers at start of month
  SELECT COUNT(*)::INTEGER INTO v_starting
  FROM organizations
  WHERE subscription_status = 'active'
    AND created_at < v_start_date;

  -- Count churned during month
  SELECT COUNT(*)::INTEGER INTO v_churned
  FROM subscription_events
  WHERE event_type = 'subscription_canceled'
    AND created_at >= v_start_date
    AND created_at < v_end_date;

  RETURN QUERY SELECT
    v_start_date as month,
    v_starting as starting_subscribers,
    v_churned as churned_subscribers,
    CASE
      WHEN v_starting > 0 THEN ROUND((v_churned::NUMERIC / v_starting::NUMERIC) * 100, 2)
      ELSE 0::NUMERIC
    END as churn_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute on churn function
GRANT EXECUTE ON FUNCTION calculate_churn_rate(DATE) TO authenticated;

-- =====================================================
-- Triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_refund_requests_updated_at ON refund_requests;
CREATE TRIGGER update_refund_requests_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_failures_updated_at ON payment_failures;
CREATE TRIGGER update_payment_failures_updated_at
  BEFORE UPDATE ON payment_failures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE billing_audit_log IS 'Comprehensive audit log for all billing-related events';
COMMENT ON TABLE refund_requests IS 'Tracks refund requests and their approval workflow';
COMMENT ON TABLE payment_failures IS 'Tracks failed payments for dunning recovery';
COMMENT ON TABLE dunning_emails IS 'Records dunning emails sent for payment recovery';
COMMENT ON TABLE dunning_config IS 'Configuration for dunning sequences per subscription tier';
COMMENT ON TABLE subscription_events IS 'Lifecycle events for subscription analytics';
COMMENT ON FUNCTION calculate_mrr() IS 'Calculates Monthly Recurring Revenue by tier';
COMMENT ON FUNCTION calculate_churn_rate(DATE) IS 'Calculates churn rate for a given month';