-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net extension for HTTP calls (if available)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;

-- Note: The cron job to call process-email-queue needs to be set up via Supabase Dashboard
-- Go to: Database > Extensions > pg_cron > Jobs
-- Or use the Supabase Dashboard's Cron Jobs feature under Database
--
-- Cron expression: * * * * * (every minute)
-- SQL Command:
-- SELECT
--   net.http_post(
--     url:='https://xnwqrgumstikdmsxtame.supabase.co/functions/v1/process-email-queue',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;

-- Create helper function to check email queue status
CREATE OR REPLACE FUNCTION get_email_queue_stats()
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  oldest TIMESTAMPTZ,
  newest TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    status::TEXT,
    COUNT(*)::BIGINT,
    MIN(created_at),
    MAX(created_at)
  FROM email_queue
  GROUP BY status
  ORDER BY status;
$$;

-- Grant access to authenticated users to view stats (for admin dashboard)
GRANT EXECUTE ON FUNCTION get_email_queue_stats() TO authenticated;
