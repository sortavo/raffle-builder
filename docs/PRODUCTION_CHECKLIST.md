# Sortavo Production Checklist

This checklist covers all critical aspects of deploying Sortavo (raffle/lottery SaaS platform) to production. Each section should be verified before launch.

---

## 1. Security

### Environment Variables
- [ ] Set `VITE_SUPABASE_URL` to production Supabase URL
- [ ] Set `VITE_SUPABASE_PUBLISHABLE_KEY` to production anon key
- [ ] Set `VITE_STRIPE_MODE` to `live` for production
- [ ] Verify `STRIPE_SECRET_KEY` starts with `sk_live_` (not `sk_test_`)
- [ ] Configure `STRIPE_WEBHOOK_SECRET` for production webhook endpoint
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` (keep secret, never expose to client)
- [ ] Configure `RESEND_API_KEY` for production email sending
- [ ] Set `INTERNAL_FUNCTION_SECRET` for secure edge function communication
- [ ] Configure `SENTRY_DSN` for error tracking
- [ ] Set `ENVIRONMENT=production` in edge functions
- [ ] Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for job queue

### API Keys & Secrets
- [ ] Rotate any development/staging API keys
- [ ] Verify no secrets committed to git (check `.env` is in `.gitignore`)
- [ ] Store secrets in Vercel/Supabase environment variables (not code)
- [ ] Ensure `INTERNAL_FUNCTION_SECRET` uses timing-safe comparison

### CORS Configuration
- [ ] Update `/supabase/functions/_shared/cors.ts` allowed origins:
  - [ ] Add `https://sortavo.com`
  - [ ] Add `https://www.sortavo.com`
  - [ ] Add `https://app.sortavo.com`
  - [ ] Remove or restrict development origins in production
- [ ] Verify subdomain pattern `^https:\/\/[a-z0-9-]+\.sortavo\.com$` works correctly
- [ ] Test custom domain CORS handling

### Authentication
- [ ] Verify Supabase Auth email templates are customized
- [ ] Configure magic link/password reset email sender domain
- [ ] Enable email confirmation for new signups
- [ ] Configure MFA enforcement for admin users (see `MFAEnrollment.tsx`, `MFAVerification.tsx`)
- [ ] Verify JWT token expiration settings
- [ ] Test session refresh mechanism

### Rate Limiting
- [ ] Verify rate limits in `/supabase/functions/_shared/rate-limiter.ts`:
  - [ ] STRICT: 10 req/min for payment submissions
  - [ ] STANDARD: 30 req/min for general API calls
  - [ ] RELAXED: 100 req/min for read-heavy endpoints
- [ ] Consider implementing Redis-based rate limiting for distributed deployments
- [ ] Test rate limit responses (429 status)

### Security Headers
- [ ] Implement Content Security Policy (CSP)
- [ ] Add X-Frame-Options header
- [ ] Add X-Content-Type-Options header
- [ ] Enable HSTS (Strict-Transport-Security)
- [ ] Verify Vercel security headers configuration

---

## 2. Database (Supabase)

### RLS Policies
- [ ] Verify all tables have Row Level Security enabled
- [ ] Audit RLS policies in recent migrations:
  - [ ] `20260121073509_mt3_mt5_mt17_rls_policies.sql`
  - [ ] `20260121073508_mt2_mt13_audit_security.sql`
- [ ] Test organization isolation (users can only see their org data)
- [ ] Test buyer isolation (buyers can only see their own tickets)
- [ ] Verify admin role policies are properly scoped
- [ ] Test payment proof access policies

### Indexes
- [ ] Verify indexes exist for common queries:
  - [ ] `tickets.raffle_id`
  - [ ] `tickets.buyer_id`
  - [ ] `tickets.status`
  - [ ] `orders.organization_id`
  - [ ] `orders.raffle_id`
  - [ ] `raffles.organization_id`
  - [ ] `raffles.slug`
  - [ ] `organizations.slug`
  - [ ] `profiles.email`
  - [ ] `profiles.organization_id`
- [ ] Review slow query logs after initial production traffic
- [ ] Consider partial indexes for status-filtered queries

### Backups
- [ ] Enable Supabase Point-in-Time Recovery (PITR)
- [ ] Configure daily backup schedule
- [ ] Document backup retention policy (recommended: 30 days)
- [ ] Test backup restoration procedure
- [ ] Set up backup monitoring/alerts

### Migrations
- [ ] Verify all migrations have been applied to production
- [ ] Review migration files for any destructive operations
- [ ] Test rollback procedures for recent migrations
- [ ] Document migration dependencies

---

## 3. Performance

### Caching
- [ ] Configure Vercel Edge caching for static assets
- [ ] Implement stale-while-revalidate for API responses where appropriate
- [ ] Configure React Query cache times in hooks
- [ ] Consider implementing Redis caching for hot data (ticket counts, raffle stats)

### CDN
- [ ] Verify Vercel CDN is properly configured
- [ ] Configure custom cache headers for images
- [ ] Set up Supabase Storage CDN for uploaded images
- [ ] Configure appropriate cache TTLs:
  - [ ] Static assets: 1 year
  - [ ] API responses: varies by endpoint
  - [ ] Images: 1 week minimum

### Image Optimization
- [ ] Verify client-side image compression is working (`/src/lib/image-compression.ts`):
  - [ ] Max dimensions: 2048x2048
  - [ ] Quality: 0.8 for JPEG
  - [ ] Min size to compress: 500KB
- [ ] Configure Vercel Image Optimization
- [ ] Verify payment proof images are compressed before upload
- [ ] Test prize/raffle cover image optimization

### Performance Monitoring
- [ ] Set up Vercel Analytics
- [ ] Configure Web Vitals monitoring:
  - [ ] LCP target: < 3 seconds (tested in Checkly)
  - [ ] FID target: < 100ms
  - [ ] CLS target: < 0.1
- [ ] Review initial performance benchmarks
- [ ] Set up performance degradation alerts

---

## 4. Monitoring

### Error Tracking (Sentry)
- [ ] Configure `SENTRY_DSN` in environment variables
- [ ] Verify Sentry React integration (`SentryErrorBoundary.tsx`)
- [ ] Configure Sentry for edge functions (`/supabase/functions/_shared/sentry.ts`)
- [ ] Set up Sentry release tracking
- [ ] Configure error alerting thresholds
- [ ] Set up Sentry source maps upload in CI/CD

### Uptime Monitoring (Checkly)
- [ ] Deploy Checkly checks (`checkly:deploy`)
- [ ] Verify API health checks:
  - [ ] Homepage availability (every 5 min)
  - [ ] Health check API endpoint
  - [ ] Auth page availability
  - [ ] Pricing page
  - [ ] System status page
- [ ] Configure browser checks for critical flows:
  - [ ] Homepage loads correctly
  - [ ] Auth page accessible
  - [ ] Pricing page shows plans
  - [ ] Mobile responsiveness
- [ ] Set up alerting (PagerDuty/Slack/Email)
- [ ] Configure check locations (us-east-1, us-west-1)

### Application Logs
- [ ] Configure structured logging in edge functions
- [ ] Set up log aggregation (Vercel logs, Supabase logs)
- [ ] Configure log retention policy
- [ ] Set up alerts for error-level logs

### Analytics
- [ ] Configure Google Analytics 4 (`VITE_SORTAVO_GA4_ID`)
- [ ] Set up Google Tag Manager (`VITE_SORTAVO_GTM_ID`)
- [ ] Configure Meta Pixel (`VITE_SORTAVO_META_PIXEL_ID`)
- [ ] Configure TikTok Pixel (`VITE_SORTAVO_TIKTOK_PIXEL_ID`)
- [ ] Verify tracking scripts generator works (`/src/lib/tracking-scripts.ts`)
- [ ] Test conversion tracking for subscriptions

---

## 5. Legal & Compliance

### Privacy Policy
- [ ] Verify privacy policy page exists (`/src/pages/legal/PrivacyPolicy.tsx`)
- [ ] Update last modified date (currently: December 24, 2025)
- [ ] Include data collection practices
- [ ] Document third-party integrations (Stripe, Resend, analytics)
- [ ] Include contact information (privacy@sortavo.com, dpo@sortavo.com)
- [ ] Review for GDPR compliance if serving EU customers

### Terms of Service
- [ ] Verify terms page exists (`/src/pages/legal/TermsOfService.tsx`)
- [ ] Update last modified date
- [ ] Include service description
- [ ] Define user responsibilities
- [ ] Include payment terms and refund policy
- [ ] Legal contact: legal@sortavo.com

### Cookie Consent
- [ ] Verify cookie notice component (`/src/components/CookieNotice.tsx`)
- [ ] Test consent flow on custom domains
- [ ] Implement cookie preference center
- [ ] Document cookies used by the application
- [ ] Comply with ePrivacy Directive if serving EU customers

### Data Protection
- [ ] Implement data export functionality (`export-user-data` edge function)
- [ ] Implement account deletion (`delete-user`, `delete-organization` functions)
- [ ] Document data retention policies
- [ ] Conduct security audit of PII handling
- [ ] Log sanitization prevents PCI data leakage (see stripe-webhook)

---

## 6. DNS & Domain

### SSL Certificates
- [ ] Verify SSL certificate is valid for sortavo.com
- [ ] Verify wildcard certificate covers *.sortavo.com subdomains
- [ ] Set up certificate auto-renewal
- [ ] Test HTTPS enforcement (no mixed content)

### Domain Configuration
- [ ] Configure DNS records for sortavo.com
- [ ] Set up www redirect (www.sortavo.com -> sortavo.com or vice versa)
- [ ] Configure tenant subdomains (*.sortavo.com)
- [ ] Test custom domain verification (`verify-dns`, `add-vercel-domain` functions)
- [ ] Configure Vercel domain settings
- [ ] Set up domain monitoring (`monitor-domains` function)

### Email DNS
- [ ] Configure SPF record for email sending
- [ ] Configure DKIM for Resend (updates.sortavo.com)
- [ ] Configure DMARC policy
- [ ] Test email deliverability

---

## 7. Payments (Stripe)

### Stripe Configuration
- [ ] Switch to live mode keys (verify `STRIPE_SECRET_KEY` starts with `sk_live_`)
- [ ] Configure production webhook endpoint
- [ ] Set `STRIPE_WEBHOOK_SECRET` to production value
- [ ] Verify webhook signature verification is enabled (NEVER skip in production)

### Products & Pricing
- [ ] Create production products in Stripe Dashboard
- [ ] Update price IDs in `/src/lib/stripe-config.ts`:
  - [ ] Basic: Monthly & Annual
  - [ ] Pro: Monthly & Annual
  - [ ] Premium: Monthly & Annual
  - [ ] Enterprise: Monthly & Annual
- [ ] Verify product-to-tier mapping in `/supabase/functions/_shared/stripe-config.ts`
- [ ] Configure trial periods (Basic: 7 days)

### Webhook Events
- [ ] Configure Stripe webhook to receive:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `customer.subscription.trial_will_end`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
  - [ ] `invoice.payment_action_required`
  - [ ] `customer.updated`
  - [ ] `customer.deleted`
  - [ ] `charge.refunded`
  - [ ] `checkout.session.completed`
- [ ] Test each webhook event handler
- [ ] Verify idempotency handling (stripe_events table)

### Payment Testing
- [ ] Test complete subscription flow with test cards
- [ ] Test payment failure handling
- [ ] Test 3D Secure / SCA flow
- [ ] Test subscription upgrade/downgrade
- [ ] Test subscription cancellation
- [ ] Test dunning (failed payment recovery)

---

## 8. Email (Resend)

### SMTP Configuration
- [ ] Configure `RESEND_API_KEY` for production
- [ ] Verify sender domain: `notificaciones@updates.sortavo.com`
- [ ] Test DNS records for email domain

### Email Templates
- [ ] Test all email templates in `/supabase/functions/send-email/index.ts`:
  - [ ] `reservation` - Ticket reservation confirmation
  - [ ] `proof_received` - Payment proof received
  - [ ] `approved` - Payment approved
  - [ ] `approved_bulk` - Bulk ticket approval
  - [ ] `rejected` - Payment rejected
  - [ ] `reminder` - Raffle reminder
  - [ ] `winner` - Winner notification
  - [ ] `payment_reminder` - Reservation expiring
  - [ ] `pending_approvals` - Pending approvals for organizers
- [ ] Verify HTML sanitization (XSS prevention)
- [ ] Verify URL sanitization in email links
- [ ] Test email rendering across clients (Gmail, Outlook, etc.)

### Transactional Emails
- [ ] Test team invitation emails (`send-team-invite`)
- [ ] Test notification emails
- [ ] Configure email rate limits to avoid spam flags
- [ ] Set up bounce/complaint handling

---

## 9. Testing

### Unit Tests
- [ ] Run `npm run test:run` - all tests must pass
- [ ] Verify test coverage with `npm run test:coverage`
- [ ] Key test files to verify:
  - [ ] Stripe webhook tests
  - [ ] RLS security tests
  - [ ] Hook tests (useAuth, useOrganization, useRaffles, etc.)
  - [ ] Utility tests (currency, ticket, subscription utils)

### E2E Tests
- [ ] Run `npm run test:e2e` - all Playwright tests must pass
- [ ] Verify tests run across browsers:
  - [ ] Chromium
  - [ ] Firefox
  - [ ] WebKit
  - [ ] Mobile Chrome
  - [ ] Mobile Safari
- [ ] Test critical flows:
  - [ ] `organizer-flow.spec.ts`
  - [ ] `buyer-flow.spec.ts`

### Performance Tests
- [ ] Review stress test (`e2e/stress-test/approval-stress.spec.ts`)
- [ ] Run K6 load test if needed (`scripts/load-test/k6-load-test.js`)
- [ ] Verify performance under expected load
- [ ] Test concurrent ticket reservations

### Integration Tests
- [ ] Test Stripe integration end-to-end
- [ ] Test Resend email delivery
- [ ] Test Supabase Edge Functions
- [ ] Test custom domain flow

---

## 10. Deployment

### CI/CD Pipeline
- [ ] Configure GitHub Actions or Vercel CI
- [ ] Set up automated testing on PR
- [ ] Configure staging environment deployment
- [ ] Set up production deployment approval workflow
- [ ] Enable branch protection for main branch

### Vercel Configuration
- [ ] Configure production environment variables
- [ ] Set up preview deployments for PRs
- [ ] Configure build settings
- [ ] Set up custom domains
- [ ] Enable Vercel Analytics

### Supabase Deployment
- [ ] Link production Supabase project
- [ ] Deploy all edge functions: `supabase functions deploy`
- [ ] Verify function secrets are configured
- [ ] Set up database webhooks if needed
- [ ] Configure scheduled functions (cron jobs):
  - [ ] `cleanup-notifications`
  - [ ] `cleanup-expired-orders`
  - [ ] `notify-pending-approvals`
  - [ ] `send-payment-reminders`
  - [ ] `refresh-materialized-views`
  - [ ] `process-dunning`

### Rollback Plan
- [ ] Document rollback procedure for Vercel deployment
- [ ] Document database rollback procedure
- [ ] Set up deployment notifications (Slack/Discord)
- [ ] Maintain list of recent releases for quick rollback
- [ ] Test rollback procedure in staging

### Go-Live Checklist
- [ ] Schedule maintenance window if needed
- [ ] Notify team of deployment
- [ ] Deploy database migrations
- [ ] Deploy edge functions
- [ ] Deploy frontend
- [ ] Run smoke tests on production
- [ ] Monitor error rates for 24 hours
- [ ] Monitor performance metrics
- [ ] Have on-call rotation ready

---

## Post-Launch

### Monitoring Period (First 7 Days)
- [ ] Check error rates daily
- [ ] Review performance metrics
- [ ] Monitor Stripe webhook success rate
- [ ] Review customer support tickets
- [ ] Check email delivery rates

### Documentation
- [ ] Update internal runbooks
- [ ] Document production architecture
- [ ] Create incident response procedures
- [ ] Document on-call escalation paths

---

## Quick Reference

### Production URLs
- **App**: https://sortavo.com
- **Supabase**: https://xnwqrgumstikdmsxtame.supabase.co
- **Status Page**: https://sortavo.com/status

### Key Contacts
- **Privacy**: privacy@sortavo.com
- **Legal**: legal@sortavo.com
- **DPO**: dpo@sortavo.com

### Critical Edge Functions
| Function | Purpose | JWT |
|----------|---------|-----|
| `stripe-webhook` | Handle Stripe events | No |
| `create-checkout` | Create Stripe sessions | No |
| `send-email` | Send transactional emails | No |
| `health-check` | API health monitoring | No |
| `submit-payment-proof` | Upload payment proofs | No |

### Subscription Tiers & Limits
| Tier | Active Raffles | Tickets/Raffle | Templates |
|------|---------------|----------------|-----------|
| Basic | 2 | 2,000 | 3 |
| Pro | 7 | 30,000 | 6 |
| Premium | 15 | 100,000 | 9 |
| Enterprise | 999 | 10,000,000 | 9 |
