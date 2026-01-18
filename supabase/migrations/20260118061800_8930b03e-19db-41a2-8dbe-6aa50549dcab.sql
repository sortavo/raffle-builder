-- =====================================================
-- CRON JOBS: Edge Functions via pg_net
-- =====================================================

-- Enable pg_net extension for HTTP calls from PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================================================
-- Helper function to invoke edge functions via HTTP
-- =====================================================
CREATE OR REPLACE FUNCTION public.invoke_edge_function(function_name TEXT, payload JSONB DEFAULT '{}'::JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  project_url TEXT := 'https://xnwqrgumstikdmsxtame.supabase.co';
  service_key TEXT;
  request_id BIGINT;
BEGIN
  -- Get service role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- Make async HTTP POST request to edge function
  IF service_key IS NOT NULL THEN
    SELECT extensions.http_post(
      url := project_url || '/functions/v1/' || function_name,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := payload
    ) INTO request_id;

    RETURN request_id;
  ELSE
    RAISE WARNING 'Service role key not found in vault for edge function: %', function_name;
    RETURN NULL;
  END IF;
END;
$$;

-- Grant execute to postgres (for cron)
GRANT EXECUTE ON FUNCTION public.invoke_edge_function(TEXT, JSONB) TO postgres;

-- =====================================================
-- CRON JOB: Send Payment Reminders (daily at 10 AM UTC)
-- =====================================================
SELECT cron.unschedule('send-payment-reminders-edge') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-payment-reminders-edge');

SELECT cron.schedule(
  'send-payment-reminders-edge',
  '0 10 * * *',
  $$SELECT public.invoke_edge_function('send-payment-reminders')$$
);

-- =====================================================
-- Update notify-pending-approvals to every 2 hours
-- =====================================================
SELECT cron.unschedule('notify-pending-approvals-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-pending-approvals-edge');

SELECT cron.schedule(
  'notify-pending-approvals-edge',
  '0 */2 * * *',
  $$SELECT public.invoke_edge_function('notify-pending-approvals')$$
);

-- =====================================================
-- Update all existing cron jobs to use the new helper function
-- =====================================================
SELECT cron.unschedule('process-job-queue-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-job-queue-edge');

SELECT cron.schedule(
  'process-job-queue-edge',
  '* * * * *',
  $$SELECT public.invoke_edge_function('process-job-queue')$$
);

SELECT cron.unschedule('refresh-materialized-views-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-materialized-views-edge');

SELECT cron.schedule(
  'refresh-materialized-views-edge',
  '*/5 * * * *',
  $$SELECT public.invoke_edge_function('refresh-materialized-views')$$
);

SELECT cron.unschedule('refresh-stats-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-stats-edge');

SELECT cron.schedule(
  'refresh-stats-edge',
  '*/10 * * * *',
  $$SELECT public.invoke_edge_function('refresh-stats')$$
);

SELECT cron.unschedule('cleanup-expired-orders-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-orders-edge');

SELECT cron.schedule(
  'cleanup-expired-orders-edge',
  '*/15 * * * *',
  $$SELECT public.invoke_edge_function('cleanup-expired-orders')$$
);

SELECT cron.unschedule('health-check-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'health-check-edge');

SELECT cron.schedule(
  'health-check-edge',
  '*/30 * * * *',
  $$SELECT public.invoke_edge_function('health-check')$$
);

SELECT cron.unschedule('archive-old-raffles-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'archive-old-raffles-edge');

SELECT cron.schedule(
  'archive-old-raffles-edge',
  '0 3 * * *',
  $$SELECT public.invoke_edge_function('archive-old-raffles')$$
);

SELECT cron.unschedule('cleanup-notifications-edge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-notifications-edge');

SELECT cron.schedule(
  'cleanup-notifications-edge',
  '0 4 * * *',
  $$SELECT public.invoke_edge_function('cleanup-notifications')$$
);