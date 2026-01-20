-- =============================================================
-- Add cron jobs for dunning system (process-dunning Edge Function)
-- Runs twice daily to process failed payment recovery
-- =============================================================

-- Remove existing jobs if any (for idempotency)
SELECT cron.unschedule('process-dunning-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-dunning-daily');

SELECT cron.unschedule('process-dunning-evening')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-dunning-evening');

-- Schedule dunning processor at 9:00 AM UTC
SELECT cron.schedule(
  'process-dunning-daily',
  '0 9 * * *',
  $$SELECT public.invoke_edge_function('process-dunning')$$
);

-- Schedule dunning processor at 6:00 PM UTC (for time zone coverage)
SELECT cron.schedule(
  'process-dunning-evening',
  '0 18 * * *',
  $$SELECT public.invoke_edge_function('process-dunning')$$
);