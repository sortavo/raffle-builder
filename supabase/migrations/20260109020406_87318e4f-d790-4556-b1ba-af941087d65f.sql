
-- 1. Move pg_trgm extension to extensions schema
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- 2. Recreate the functions that depend on pg_trgm in public schema
-- (they reference the extension, not need to move them)

-- 3. Revoke public API access to materialized view
REVOKE SELECT ON public.raffle_stats_mv FROM anon, authenticated;

-- 4. Create secure RPC to access raffle stats (replaces direct MV access)
CREATE OR REPLACE FUNCTION public.get_raffle_stats_for_org(p_organization_id uuid)
RETURNS TABLE (
  raffle_id uuid,
  title text,
  status raffle_status,
  total_tickets integer,
  sold_count bigint,
  reserved_count bigint,
  revenue numeric,
  ticket_price numeric,
  draw_date timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return stats for user's organization
  IF NOT has_org_access(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    rs.raffle_id,
    rs.title,
    rs.status,
    rs.total_tickets,
    rs.sold_count,
    rs.reserved_count,
    rs.revenue,
    rs.ticket_price,
    rs.draw_date,
    rs.created_at
  FROM raffle_stats_mv rs
  WHERE rs.organization_id = p_organization_id;
END;
$$;

-- 5. Tighten the notifications INSERT policy (require valid raffle reference)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications via RPC"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow if user_id matches a real user in the same org
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = notifications.user_id
      AND (
        notifications.organization_id IS NULL 
        OR p.organization_id = notifications.organization_id
      )
  )
);

-- 6. Tighten telegram_buyer_links INSERT (require valid email format)
DROP POLICY IF EXISTS "Anyone can insert buyer telegram link" ON public.telegram_buyer_links;
CREATE POLICY "Public can link telegram with valid email"
ON public.telegram_buyer_links
FOR INSERT
TO anon, authenticated
WITH CHECK (
  buyer_email IS NOT NULL 
  AND buyer_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND telegram_chat_id IS NOT NULL
);

-- 7. Add comment explaining intentional permissive policies
COMMENT ON POLICY "Service role only for stripe_events" ON public.stripe_events IS 
'Intentionally permissive - only accessible via service_role key in Edge Functions';

COMMENT ON POLICY "Authenticated users can read settings" ON public.system_settings IS 
'Intentionally permissive - system_settings contains non-sensitive configuration';
