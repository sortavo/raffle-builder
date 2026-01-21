# STRIPE ENTERPRISE OVERHAUL - WORLD-CLASS PAYMENT SYSTEM

## CONTEXT
Sortavo is a raffle platform that needs enterprise-grade payment infrastructure. The previous Stripe account was deleted and we need to configure new keys plus implement missing enterprise features. Current implementation is at 75% - we need to reach 100% enterprise-grade.

## PHASE 1: STRIPE CONFIGURATION RESET

### 1.1 Update Stripe Configuration
Update `src/lib/stripe-config.ts` and `supabase/functions/_shared/stripe-config.ts`:

```typescript
// The user will create new products/prices in their new Stripe account
// Update the STRIPE_PRODUCT_IDS and STRIPE_PRICE_IDS with placeholder comments
// indicating the user needs to create these in Stripe Dashboard

export const STRIPE_CONFIG = {
  // IMPORTANT: User must create these products in Stripe Dashboard
  // and update these IDs accordingly
  products: {
    basic: {
      test: 'prod_REPLACE_WITH_TEST_BASIC',
      live: 'prod_REPLACE_WITH_LIVE_BASIC',
    },
    pro: {
      test: 'prod_REPLACE_WITH_TEST_PRO',
      live: 'prod_REPLACE_WITH_LIVE_PRO',
    },
    premium: {
      test: 'prod_REPLACE_WITH_TEST_PREMIUM',
      live: 'prod_REPLACE_WITH_LIVE_PREMIUM',
    },
    enterprise: {
      test: 'prod_REPLACE_WITH_TEST_ENTERPRISE',
      live: 'prod_REPLACE_WITH_LIVE_ENTERPRISE',
    },
  },
  prices: {
    basic: {
      monthly: { test: 'price_REPLACE', live: 'price_REPLACE' },
      annual: { test: 'price_REPLACE', live: 'price_REPLACE' },
    },
    pro: {
      monthly: { test: 'price_REPLACE', live: 'price_REPLACE' },
      annual: { test: 'price_REPLACE', live: 'price_REPLACE' },
    },
    premium: {
      monthly: { test: 'price_REPLACE', live: 'price_REPLACE' },
      annual: { test: 'price_REPLACE', live: 'price_REPLACE' },
    },
    enterprise: {
      monthly: { test: 'price_REPLACE', live: 'price_REPLACE' },
      annual: { test: 'price_REPLACE', live: 'price_REPLACE' },
    },
  },
};
```

### 1.2 Add Stripe Setup Guide Component
Create `src/components/admin/StripeSetupGuide.tsx`:

```tsx
/**
 * Admin component that shows when Stripe is not configured
 * Provides step-by-step instructions to set up Stripe products
 */
export function StripeSetupGuide() {
  // Show this when STRIPE_SECRET_KEY is missing or products aren't created
  // Include:
  // 1. Link to Stripe Dashboard
  // 2. Instructions to create 4 products (Basic, Pro, Premium, Enterprise)
  // 3. Instructions to create 8 prices (monthly + annual for each)
  // 4. Instructions to add keys to Edge Functions Secrets
  // 5. Button to test connection
}
```

---

## PHASE 2: REFUND MANAGEMENT SYSTEM

### 2.1 Database Migration
Create migration `20260118_refund_system.sql`:

```sql
-- Refund requests table
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_charge_id TEXT NOT NULL,
  stripe_refund_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  reason TEXT NOT NULL CHECK (reason IN ('requested_by_customer', 'duplicate', 'fraudulent', 'product_not_received', 'product_unacceptable', 'subscription_canceled', 'other')),
  reason_details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  requested_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refund audit log
CREATE TABLE IF NOT EXISTS public.refund_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id UUID REFERENCES refund_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_refund_requests_org ON refund_requests(organization_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);
CREATE INDEX idx_refund_requests_stripe ON refund_requests(stripe_charge_id);

-- RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies: Org admins can view their refunds, super admins can manage all
CREATE POLICY "Org members view own refunds" ON refund_requests
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Super admins manage refunds" ON refund_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
```

### 2.2 Edge Function: process-refund
Create `supabase/functions/process-refund/index.ts`:

```typescript
/**
 * Process refund requests
 * - Validates refund eligibility (within 30 days, valid charge)
 * - Creates Stripe refund
 * - Updates refund_requests status
 * - Creates audit log entry
 * - Sends notification emails
 *
 * Security:
 * - Only super_admin can approve refunds
 * - Validate charge belongs to the organization
 * - Check for duplicate refund attempts
 */
```

### 2.3 Webhook Handler Update
Update `stripe-webhook/index.ts` to handle:
- `charge.refunded` - Mark refund as completed
- `charge.refund.updated` - Handle refund status changes
- `charge.dispute.created` - Alert on disputes
- `charge.dispute.closed` - Update dispute status

### 2.4 Frontend Components
Create `src/components/admin/refunds/`:
- `RefundRequestsList.tsx` - List all refund requests with filters
- `RefundRequestModal.tsx` - Request new refund
- `RefundApprovalModal.tsx` - Approve/reject refund (super admin)
- `RefundDetailsDrawer.tsx` - View refund details and audit log

---

## PHASE 3: DUNNING & PAYMENT RECOVERY

### 3.1 Database Migration
Create migration `20260118_dunning_system.sql`:

```sql
-- Payment failure tracking
CREATE TABLE IF NOT EXISTS public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  failure_code TEXT,
  failure_message TEXT,
  attempt_count INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution TEXT CHECK (resolution IN ('paid', 'forgiven', 'canceled', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dunning emails sent
CREATE TABLE IF NOT EXISTS public.dunning_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_failure_id UUID REFERENCES payment_failures(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('first_notice', 'second_notice', 'final_notice', 'suspension_warning', 'account_suspended')),
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Dunning configuration per tier
CREATE TABLE IF NOT EXISTS public.dunning_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_tier TEXT NOT NULL,
  retry_schedule JSONB DEFAULT '[1, 3, 5, 7]'::JSONB, -- days between retries
  grace_period_days INTEGER DEFAULT 7,
  suspension_after_days INTEGER DEFAULT 14,
  cancellation_after_days INTEGER DEFAULT 30,
  email_schedule JSONB DEFAULT '{"first_notice": 0, "second_notice": 3, "final_notice": 7, "suspension_warning": 10}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default dunning configs
INSERT INTO dunning_config (subscription_tier, grace_period_days, suspension_after_days) VALUES
  ('basic', 7, 14),
  ('pro', 10, 21),
  ('premium', 14, 28),
  ('enterprise', 21, 45);

CREATE INDEX idx_payment_failures_org ON payment_failures(organization_id);
CREATE INDEX idx_payment_failures_unresolved ON payment_failures(organization_id) WHERE resolved_at IS NULL;
```

### 3.2 Edge Function: process-dunning
Create `supabase/functions/process-dunning/index.ts`:

```typescript
/**
 * Scheduled dunning processor (runs every hour)
 *
 * 1. Find unresolved payment failures
 * 2. Check retry schedule
 * 3. Attempt retry via Stripe API
 * 4. Send appropriate dunning email based on attempt count
 * 5. Suspend/cancel subscriptions that exceed grace period
 * 6. Log all actions
 */
```

### 3.3 Dunning Email Templates
Create email templates for:
1. `first_notice` - "Payment failed, we'll retry automatically"
2. `second_notice` - "Still unable to process payment, please update card"
3. `final_notice` - "Urgent: Update payment to avoid service interruption"
4. `suspension_warning` - "Account will be suspended in X days"
5. `account_suspended` - "Account suspended due to non-payment"

### 3.4 Self-Service Payment Update
Create `src/components/billing/UpdatePaymentMethod.tsx`:
- Deep link from dunning emails
- Shows outstanding balance
- Allows card update via Stripe Elements
- Immediately retries failed payment on update

---

## PHASE 4: STRIPE TAX INTEGRATION

### 4.1 Enable Stripe Tax
Update `create-checkout/index.ts`:

```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing config
  automatic_tax: { enabled: true },
  tax_id_collection: { enabled: true },
  customer_update: {
    address: 'auto',
    name: 'auto',
  },
});
```

### 4.2 Database Migration
```sql
-- Tax information storage
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id_type TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Tax calculations log
CREATE TABLE IF NOT EXISTS public.tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  stripe_invoice_id TEXT,
  subtotal_cents INTEGER,
  tax_cents INTEGER,
  tax_rate_percent NUMERIC(5,2),
  tax_jurisdiction TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Tax Settings Component
Create `src/components/settings/TaxSettings.tsx`:
- Display/edit tax ID
- Show tax exemption status
- Display billing address
- Link to Stripe Tax documentation

---

## PHASE 5: SUBSCRIPTION ANALYTICS DASHBOARD

### 5.1 Database Views and Functions
Create migration `20260118_subscription_analytics.sql`:

```sql
-- MRR (Monthly Recurring Revenue) calculation
CREATE OR REPLACE FUNCTION calculate_mrr()
RETURNS TABLE (
  tier TEXT,
  period TEXT,
  mrr_cents BIGINT,
  subscriber_count INTEGER
) AS $$
  SELECT
    subscription_tier::TEXT as tier,
    subscription_period::TEXT as period,
    CASE
      WHEN subscription_period = 'monthly' THEN
        COUNT(*) * (
          CASE subscription_tier
            WHEN 'basic' THEN 4900
            WHEN 'pro' THEN 14900
            WHEN 'premium' THEN 29900
            WHEN 'enterprise' THEN 49900
          END
        )
      WHEN subscription_period = 'annual' THEN
        COUNT(*) * (
          CASE subscription_tier
            WHEN 'basic' THEN 4083  -- 49000/12
            WHEN 'pro' THEN 12417   -- 149000/12
            WHEN 'premium' THEN 24917 -- 299000/12
            WHEN 'enterprise' THEN 41583 -- 499000/12
          END
        )
    END as mrr_cents,
    COUNT(*)::INTEGER as subscriber_count
  FROM organizations
  WHERE subscription_status = 'active'
  GROUP BY subscription_tier, subscription_period;
$$ LANGUAGE SQL STABLE;

-- Churn tracking
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trial_started', 'trial_converted', 'trial_expired',
    'subscription_started', 'subscription_upgraded', 'subscription_downgraded',
    'subscription_canceled', 'subscription_reactivated', 'subscription_expired',
    'payment_succeeded', 'payment_failed'
  )),
  from_tier TEXT,
  to_tier TEXT,
  mrr_change_cents INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sub_events_org ON subscription_events(organization_id);
CREATE INDEX idx_sub_events_type ON subscription_events(event_type);
CREATE INDEX idx_sub_events_date ON subscription_events(created_at);

-- Materialized view for daily metrics
CREATE MATERIALIZED VIEW mv_subscription_metrics AS
SELECT
  date_trunc('day', created_at)::DATE as metric_date,
  event_type,
  COUNT(*) as event_count,
  COALESCE(SUM(mrr_change_cents), 0) as mrr_change
FROM subscription_events
GROUP BY 1, 2
ORDER BY 1 DESC;

CREATE UNIQUE INDEX ON mv_subscription_metrics (metric_date, event_type);

-- Churn rate calculation (monthly)
CREATE OR REPLACE FUNCTION calculate_churn_rate(p_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  month DATE,
  starting_subscribers INTEGER,
  churned_subscribers INTEGER,
  churn_rate NUMERIC(5,2)
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := date_trunc('month', p_month);
  v_end_date := v_start_date + INTERVAL '1 month';

  RETURN QUERY
  SELECT
    v_start_date as month,
    (SELECT COUNT(*)::INTEGER FROM organizations
     WHERE subscription_status = 'active'
     AND created_at < v_start_date) as starting_subscribers,
    (SELECT COUNT(*)::INTEGER FROM subscription_events
     WHERE event_type = 'subscription_canceled'
     AND created_at >= v_start_date
     AND created_at < v_end_date) as churned_subscribers,
    CASE
      WHEN (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active' AND created_at < v_start_date) > 0
      THEN ROUND(
        (SELECT COUNT(*)::NUMERIC FROM subscription_events
         WHERE event_type = 'subscription_canceled'
         AND created_at >= v_start_date
         AND created_at < v_end_date) * 100.0 /
        (SELECT COUNT(*) FROM organizations
         WHERE subscription_status = 'active'
         AND created_at < v_start_date), 2)
      ELSE 0
    END as churn_rate;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 5.2 Analytics Dashboard Component
Create `src/components/admin/analytics/SubscriptionAnalytics.tsx`:

```tsx
/**
 * Enterprise Subscription Analytics Dashboard
 *
 * Metrics to display:
 * 1. MRR Card - Current MRR with month-over-month change
 * 2. ARR Card - Annualized recurring revenue
 * 3. Subscriber Count by Tier - Stacked bar chart
 * 4. Churn Rate - Line chart (last 12 months)
 * 5. Trial Conversion Rate - Funnel visualization
 * 6. Revenue by Tier - Pie chart
 * 7. Net Revenue Retention (NRR) - Gauge
 * 8. Recent Events - Table with filters
 *
 * Features:
 * - Date range selector
 * - Export to CSV
 * - Drill-down capability
 * - Comparison with previous period
 */
```

### 5.3 Analytics Hooks
Create `src/hooks/useSubscriptionAnalytics.ts`:

```typescript
export function useSubscriptionAnalytics(dateRange: DateRange) {
  // Fetch MRR data
  // Fetch churn metrics
  // Fetch trial conversions
  // Fetch subscription events
  // Calculate NRR
}
```

---

## PHASE 6: COUPON & DISCOUNT SYSTEM

### 6.1 Database Migration
```sql
-- Coupons table (synced with Stripe)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_coupon_id TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent_off', 'amount_off')),
  percent_off NUMERIC(5,2),
  amount_off_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  duration TEXT NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER,
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  valid_tiers TEXT[] DEFAULT ARRAY['basic', 'pro', 'premium', 'enterprise'],
  min_amount_cents INTEGER,
  first_time_only BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES coupons(id),
  organization_id UUID REFERENCES organizations(id),
  stripe_promotion_code_id TEXT,
  discount_amount_cents INTEGER,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(active) WHERE active = true;
```

### 6.2 Edge Functions
Create `supabase/functions/coupons/`:
- `create-coupon.ts` - Create coupon in Stripe and DB
- `validate-coupon.ts` - Check if coupon is valid for user/tier
- `apply-coupon.ts` - Apply to checkout session
- `list-coupons.ts` - List active coupons for admin

### 6.3 Admin Coupon Management
Create `src/components/admin/coupons/`:
- `CouponsList.tsx` - List all coupons with usage stats
- `CreateCouponModal.tsx` - Create new coupon
- `CouponAnalytics.tsx` - Redemption analytics

### 6.4 Checkout Integration
Update `create-checkout/index.ts` to accept coupon codes:
```typescript
// If coupon provided, apply promotion code
if (couponCode) {
  const coupon = await validateCoupon(couponCode, tier, isFirstTime);
  if (coupon) {
    sessionParams.discounts = [{ coupon: coupon.stripe_coupon_id }];
  }
}
```

---

## PHASE 7: AUDIT LOGGING SYSTEM

### 7.1 Database Migration
```sql
-- Comprehensive billing audit log
CREATE TABLE IF NOT EXISTS public.billing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT CHECK (actor_type IN ('user', 'admin', 'system', 'stripe_webhook')),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  stripe_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX idx_billing_audit_org ON billing_audit_log(organization_id);
CREATE INDEX idx_billing_audit_date ON billing_audit_log(created_at);
CREATE INDEX idx_billing_audit_action ON billing_audit_log(action);

-- Actions to log:
-- subscription_created, subscription_updated, subscription_canceled, subscription_reactivated
-- payment_succeeded, payment_failed, payment_refunded
-- coupon_applied, coupon_removed
-- tier_upgraded, tier_downgraded
-- trial_started, trial_ended
-- invoice_created, invoice_paid, invoice_voided
-- payment_method_added, payment_method_removed, payment_method_updated
```

### 7.2 Audit Logger Utility
Create `supabase/functions/_shared/audit-logger.ts`:

```typescript
export async function logBillingAction(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    actorId?: string;
    actorType: 'user' | 'admin' | 'system' | 'stripe_webhook';
    action: string;
    resourceType: string;
    resourceId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    stripeEventId?: string;
    requestId?: string;
  }
) {
  await supabase.from('billing_audit_log').insert(params);
}
```

### 7.3 Update All Payment Functions
Add audit logging to:
- `stripe-webhook/index.ts`
- `create-checkout/index.ts`
- `upgrade-subscription/index.ts`
- `cancel-subscription/index.ts`
- `reactivate-subscription/index.ts`
- `process-refund/index.ts`

### 7.4 Audit Log Viewer
Create `src/components/admin/AuditLogViewer.tsx`:
- Filterable by organization, action, date range
- Search by resource ID
- Export to CSV
- Timeline visualization

---

## PHASE 8: RATE LIMITING & SECURITY

### 8.1 Rate Limiter for Checkout
Update `supabase/functions/_shared/rate-limiter.ts`:

```typescript
// Checkout rate limits (per organization)
export const CHECKOUT_LIMITS = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 10, // 10 checkout attempts per hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block if exceeded
};

// Payment update rate limits
export const PAYMENT_UPDATE_LIMITS = {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxAttempts: 5, // 5 payment method updates per day
};
```

### 8.2 Apply Rate Limiting
Update `create-checkout/index.ts`:
```typescript
// Check rate limit before creating checkout
const rateLimitResult = await checkRateLimit(redis, `checkout:${organizationId}`, CHECKOUT_LIMITS);
if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter
    }),
    { status: 429 }
  );
}
```

### 8.3 Fraud Detection Signals
Add to checkout creation:
```typescript
// Collect fraud signals
const fraudSignals = {
  ipAddress: req.headers.get('x-forwarded-for'),
  userAgent: req.headers.get('user-agent'),
  acceptLanguage: req.headers.get('accept-language'),
  accountAge: calculateAccountAge(organization.created_at),
  previousFailedPayments: await getFailedPaymentCount(organizationId),
};

// If high risk, require additional verification
if (calculateRiskScore(fraudSignals) > RISK_THRESHOLD) {
  // Enable Stripe Radar, require 3DS, etc.
}
```

---

## PHASE 9: MULTI-CURRENCY SUPPORT

### 9.1 Currency Configuration
Update `src/lib/stripe-config.ts`:

```typescript
export const SUPPORTED_CURRENCIES = {
  usd: { symbol: '$', name: 'US Dollar', default: true },
  eur: { symbol: '€', name: 'Euro' },
  gbp: { symbol: '£', name: 'British Pound' },
  mxn: { symbol: '$', name: 'Mexican Peso' },
};

export const PRICES_BY_CURRENCY = {
  basic: {
    monthly: { usd: 4900, eur: 4500, gbp: 3900, mxn: 89900 },
    annual: { usd: 49000, eur: 45000, gbp: 39000, mxn: 899000 },
  },
  // ... other tiers
};
```

### 9.2 Database Updates
```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_currency TEXT DEFAULT 'usd';
```

### 9.3 Currency Selector
Create `src/components/billing/CurrencySelector.tsx`:
- Show available currencies
- Update organization preference
- Show converted prices on pricing page

### 9.4 Update Checkout
Modify `create-checkout/index.ts` to use organization's preferred currency.

---

## PHASE 10: CUSTOMER PORTAL CUSTOMIZATION

### 10.1 Stripe Portal Configuration
Create edge function to configure portal:

```typescript
// Configure Stripe Customer Portal
const configuration = await stripe.billingPortal.configurations.create({
  business_profile: {
    headline: 'Sortavo - Gestiona tu suscripción',
    privacy_policy_url: 'https://sortavo.com/privacy',
    terms_of_service_url: 'https://sortavo.com/terms',
  },
  features: {
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      proration_behavior: 'none',
      cancellation_reason: {
        enabled: true,
        options: [
          'too_expensive',
          'missing_features',
          'switched_service',
          'unused',
          'customer_service',
          'too_complex',
          'other',
        ],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price', 'quantity', 'promotion_code'],
      proration_behavior: 'create_prorations',
      products: [/* configured products */],
    },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  },
});
```

---

## PHASE 11: BILLING EMAIL TEMPLATES

### 11.1 Create Email Templates
Create `supabase/functions/_shared/email-templates/billing/`:

1. `payment-succeeded.tsx` - Receipt with invoice link
2. `payment-failed.tsx` - First notice with retry info
3. `payment-failed-second.tsx` - Urgent notice
4. `payment-failed-final.tsx` - Account suspension warning
5. `subscription-created.tsx` - Welcome email
6. `subscription-upgraded.tsx` - Upgrade confirmation
7. `subscription-downgraded.tsx` - Downgrade confirmation
8. `subscription-canceled.tsx` - Cancellation confirmation
9. `subscription-reactivated.tsx` - Reactivation confirmation
10. `trial-ending.tsx` - Trial ending in 3 days
11. `trial-expired.tsx` - Trial expired, upgrade prompt
12. `invoice-upcoming.tsx` - Invoice coming soon
13. `refund-processed.tsx` - Refund confirmation

### 11.2 Email Template System
Use React Email for templates:
```typescript
import { Body, Container, Head, Html, Text, Button } from '@react-email/components';

export function PaymentSucceededEmail({ invoice, organization }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container>
          <Text>¡Gracias por tu pago!</Text>
          <Text>Hemos recibido tu pago de {formatCurrency(invoice.amount)}.</Text>
          <Button href={invoice.hosted_invoice_url}>
            Ver Factura
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## IMPLEMENTATION ORDER

1. **Phase 1**: Stripe Configuration Reset (required first)
2. **Phase 7**: Audit Logging (foundation for everything)
3. **Phase 2**: Refund Management
4. **Phase 3**: Dunning System
5. **Phase 4**: Stripe Tax
6. **Phase 5**: Analytics Dashboard
7. **Phase 6**: Coupon System
8. **Phase 8**: Rate Limiting
9. **Phase 9**: Multi-Currency
10. **Phase 10**: Portal Customization
11. **Phase 11**: Email Templates

---

## TESTING REQUIREMENTS

After implementation, verify:

1. **Checkout Flow**
   - Create checkout for each tier
   - Apply coupon during checkout
   - Tax calculation appears correctly
   - Multi-currency pricing works

2. **Webhook Processing**
   - All 15+ events are handled
   - Idempotency works (replay same event)
   - Audit logs are created

3. **Subscription Lifecycle**
   - Upgrade with proration
   - Downgrade at period end
   - Cancel and reactivate
   - Trial to paid conversion

4. **Payment Recovery**
   - Failed payment triggers dunning
   - Dunning emails are sent on schedule
   - Payment retry works
   - Subscription suspends after grace period

5. **Refunds**
   - Request refund
   - Approve/reject refund
   - Process refund via Stripe
   - Audit log tracks all actions

6. **Analytics**
   - MRR calculation is accurate
   - Churn rate calculation works
   - Events are tracked

---

## SUCCESS CRITERIA

The implementation is complete when:

1. ✅ New Stripe account configured with all products/prices
2. ✅ All 11 phases implemented and tested
3. ✅ Audit log captures all billing events
4. ✅ Dunning system prevents involuntary churn
5. ✅ Analytics dashboard shows key metrics
6. ✅ Refund workflow is fully functional
7. ✅ Tax compliance enabled
8. ✅ Rate limiting prevents abuse
9. ✅ All email templates working
10. ✅ Zero errors in webhook processing

This will make Sortavo's payment system **enterprise-grade and world-class**.
