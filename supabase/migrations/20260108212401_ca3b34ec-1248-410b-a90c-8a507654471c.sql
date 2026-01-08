
-- Crear jobs de limpieza automática

-- Job para limpiar logs de cron diariamente a las 4 AM
SELECT cron.schedule(
  'cleanup-cron-logs',
  '0 4 * * *',
  $$ DELETE FROM cron.job_run_details WHERE start_time < NOW() - INTERVAL '7 days' $$
);

-- Job para limpiar respuestas HTTP cada hora a los :30
SELECT cron.schedule(
  'cleanup-http-responses',
  '30 * * * *',
  $$ DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '1 hour' $$
);
