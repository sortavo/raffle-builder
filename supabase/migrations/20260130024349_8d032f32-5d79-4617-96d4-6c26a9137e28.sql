-- Schedule Meta CAPI processor every 5 minutes
SELECT cron.unschedule('process-meta-capi')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-meta-capi');

SELECT cron.schedule(
  'process-meta-capi',
  '*/5 * * * *',
  $$SELECT public.invoke_edge_function('process-meta-capi')$$
);