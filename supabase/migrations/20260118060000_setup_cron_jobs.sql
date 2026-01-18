-- =====================================================
-- CRON JOBS: Scheduled Tasks with pg_cron
-- =====================================================
-- This migration sets up cron jobs that run SQL directly.
-- For edge functions that need HTTP calls, use Supabase Dashboard
-- or external cron (Vercel Cron, GitHub Actions, etc.)

-- Enable pg_cron extension (usually pre-enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- CRON JOB 1: Refresh Materialized Views (every 5 minutes)
-- =====================================================
-- Directly calls SQL function - no HTTP needed
SELECT cron.unschedule('refresh-materialized-views-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-materialized-views-cron'
);

SELECT cron.schedule(
  'refresh-materialized-views-cron',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT * FROM refresh_all_materialized_views()$$
);

-- =====================================================
-- CRON JOB 2: Cleanup Expired Tickets (every 5 minutes)
-- =====================================================
-- Directly calls SQL function for ticket cleanup
SELECT cron.unschedule('cleanup-expired-tickets-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-tickets-cron'
);

SELECT cron.schedule(
  'cleanup-expired-tickets-cron',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT * FROM cleanup_expired_tickets_batch(500, 20)$$
);

-- =====================================================
-- CRON JOB 3: Cancel Expired Reservations (every 5 minutes)
-- =====================================================
-- Updates orders with expired reservations to cancelled
SELECT cron.unschedule('cancel-expired-reservations-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cancel-expired-reservations-cron'
);

SELECT cron.schedule(
  'cancel-expired-reservations-cron',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  UPDATE orders
  SET status = 'cancelled', canceled_at = NOW(), updated_at = NOW()
  WHERE status = 'reserved'
    AND reserved_until < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM ticket_reservation_status trs
      WHERE trs.order_id = orders.id
    )
  $$
);

-- =====================================================
-- CRON JOB 4: Delete Old Cancelled Orders (daily at 2 AM)
-- =====================================================
-- Removes cancelled orders older than 7 days
SELECT cron.unschedule('delete-old-cancelled-orders-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'delete-old-cancelled-orders-cron'
);

SELECT cron.schedule(
  'delete-old-cancelled-orders-cron',
  '0 2 * * *',  -- Daily at 2 AM
  $$
  DELETE FROM orders
  WHERE status = 'cancelled'
    AND canceled_at < NOW() - INTERVAL '7 days'
  $$
);

-- =====================================================
-- CRON JOB 5: Delete Old Pending Orders (daily at 3 AM)
-- =====================================================
-- Removes abandoned pending orders older than 30 days
SELECT cron.unschedule('delete-old-pending-orders-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'delete-old-pending-orders-cron'
);

SELECT cron.schedule(
  'delete-old-pending-orders-cron',
  '0 3 * * *',  -- Daily at 3 AM
  $$
  DELETE FROM orders
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days'
    AND payment_proof_url IS NULL
  $$
);

-- =====================================================
-- CRON JOB 6: Cleanup Old Notifications (weekly on Sunday at 4 AM)
-- =====================================================
-- Removes read notifications older than 30 days
SELECT cron.unschedule('cleanup-old-notifications-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-notifications-cron'
);

SELECT cron.schedule(
  'cleanup-old-notifications-cron',
  '0 4 * * 0',  -- Sundays at 4 AM
  $$
  DELETE FROM notifications
  WHERE read = true
    AND read_at < NOW() - INTERVAL '30 days'
  $$
);

-- =====================================================
-- View to monitor cron job status and history
-- =====================================================
CREATE OR REPLACE VIEW public.cron_job_status AS
SELECT
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  j.database,
  (SELECT MAX(end_time) FROM cron.job_run_details d WHERE d.jobid = j.jobid) as last_run,
  (SELECT status FROM cron.job_run_details d WHERE d.jobid = j.jobid ORDER BY end_time DESC LIMIT 1) as last_status
FROM cron.job j
ORDER BY j.jobname;

-- Grant read access to authenticated users (for admin dashboard)
GRANT SELECT ON public.cron_job_status TO authenticated;

COMMENT ON VIEW public.cron_job_status IS 'Monitor scheduled cron jobs, their status, and last run time';

-- =====================================================
-- Documentation
-- =====================================================
--
-- SQL-based cron jobs (configured above):
--   - refresh-materialized-views-cron: */5 * * * * (every 5 min)
--   - cleanup-expired-tickets-cron: */5 * * * * (every 5 min)
--   - cancel-expired-reservations-cron: */5 * * * * (every 5 min)
--   - delete-old-cancelled-orders-cron: 0 2 * * * (daily 2 AM)
--   - delete-old-pending-orders-cron: 0 3 * * * (daily 3 AM)
--   - cleanup-old-notifications-cron: 0 4 * * 0 (Sundays 4 AM)
--
-- Edge Function cron jobs (configure via Supabase Dashboard or external cron):
--   - process-job-queue: Every 1 minute
--   - refresh-stats: Every 10 minutes
--   - archive-old-raffles: Daily at 3 AM
--
-- To configure edge function crons in Supabase Dashboard:
--   1. Go to Database > Extensions > Enable pg_net
--   2. Go to Edge Functions > Select function > Schedules
--   3. Add cron schedule
--
-- Or use external cron services (Vercel Cron, GitHub Actions):
--   curl -X POST https://xnwqrgumstikdmsxtame.supabase.co/functions/v1/process-job-queue \
--     -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
