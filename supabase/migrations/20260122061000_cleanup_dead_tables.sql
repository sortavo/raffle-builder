-- CLEANUP: Remove unused/legacy tables
-- These tables are either empty or from deprecated architectures

DO $$
BEGIN
  -- Drop legacy ticket architecture tables
  DROP TABLE IF EXISTS ticket_block_status CASCADE;
  DROP TABLE IF EXISTS ticket_reservation_status_old CASCADE;

  -- Drop empty admin/system tables
  DROP TABLE IF EXISTS admin_simulations CASCADE;
  DROP TABLE IF EXISTS archived_raffle_summary CASCADE;
  DROP TABLE IF EXISTS system_alerts CASCADE;
  DROP TABLE IF EXISTS system_settings CASCADE;

  -- Drop empty billing/payment tables
  DROP TABLE IF EXISTS billing_audit_log CASCADE;
  DROP TABLE IF EXISTS payment_failures CASCADE;
  DROP TABLE IF EXISTS stripe_events CASCADE;
  DROP TABLE IF EXISTS subscription_events CASCADE;
  DROP TABLE IF EXISTS refund_requests CASCADE;
  DROP TABLE IF EXISTS refund_audit_log CASCADE;
  DROP TABLE IF EXISTS dunning_emails CASCADE;

  -- Drop empty customer table (data lives in orders)
  DROP TABLE IF EXISTS customers CASCADE;

  -- Drop empty coupon_usage (keep coupons table for future use)
  DROP TABLE IF EXISTS coupon_usage CASCADE;

  -- Drop empty rate limiting table
  DROP TABLE IF EXISTS rate_limit_entries CASCADE;

  -- Drop legacy views
  DROP VIEW IF EXISTS public_ticket_status CASCADE;

  RAISE NOTICE 'Cleanup completed: removed 17 unused tables and 1 view';
END;
$$;
