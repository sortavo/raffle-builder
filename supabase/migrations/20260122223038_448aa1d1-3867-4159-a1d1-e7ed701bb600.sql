-- Fix statement timeout for atomic_reserve_tickets to handle large reservations (60s)
ALTER FUNCTION atomic_reserve_tickets SET statement_timeout = '60s';

-- Recreate invoke_edge_function that was deleted but is still referenced by triggers
CREATE OR REPLACE FUNCTION public.invoke_edge_function(function_name TEXT, payload JSONB DEFAULT '{}'::JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Get config from vault or env
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Silently skip if not configured (prevents errors in dev)
  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'Edge function invocation skipped: missing config';
    RETURN;
  END IF;
  
  -- This is a stub - actual edge function calls should be done from application code
  -- Kept for backward compatibility with any remaining triggers
  RAISE NOTICE 'Edge function % would be called with payload: %', function_name, payload::TEXT;
END;
$$;

-- Add regular index to speed up conflict check for large raffles (non-concurrent for migration)
CREATE INDEX IF NOT EXISTS idx_orders_raffle_status_lookup 
ON orders (raffle_id, status) 
WHERE status IN ('reserved', 'pending', 'sold', 'pending_approval');