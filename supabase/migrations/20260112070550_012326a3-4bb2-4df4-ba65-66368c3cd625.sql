-- =====================================================
-- Migration: Fix Security Issues from Linter
-- Date: 2026-01-12
-- Issues addressed:
--   1. public_raffles uses SECURITY DEFINER (ERROR)
--   2. public_custom_domains uses SECURITY DEFINER (ERROR)
--   3. raffle_stats_mv exposed to API (WARN)
-- =====================================================

-- 1. Recreate public_raffles with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_raffles;

CREATE VIEW public.public_raffles 
WITH (security_invoker = true) AS
SELECT 
  id,
  organization_id,
  title,
  description,
  slug,
  status,
  category,
  template_id,
  customization,
  prize_name,
  prize_images,
  prize_video_url,
  prize_value,
  prize_terms,
  prize_display_mode,
  prizes,
  ticket_price,
  total_tickets,
  currency_code,
  draw_date,
  draw_method,
  lottery_digits,
  lottery_draw_number,
  start_date,
  reservation_time_minutes,
  max_tickets_per_person,
  max_tickets_per_purchase,
  close_sale_hours_before,
  livestream_url,
  allow_individual_sale,
  lucky_numbers_enabled,
  winner_announced,
  winner_ticket_number,
  created_at,
  updated_at
FROM public.raffles
WHERE status = ANY (ARRAY['active'::raffle_status, 'completed'::raffle_status]);

-- Grant access to the view
GRANT SELECT ON public.public_raffles TO anon, authenticated;

-- 2. Recreate public_custom_domains with SECURITY INVOKER  
DROP VIEW IF EXISTS public.public_custom_domains;

CREATE VIEW public.public_custom_domains
WITH (security_invoker = true) AS
SELECT 
  id,
  organization_id,
  domain,
  verified,
  is_primary,
  created_at
FROM public.custom_domains
WHERE verified = true;

-- Grant access to the view
GRANT SELECT ON public.public_custom_domains TO anon, authenticated;

-- 3. Revoke direct access to raffle_stats_mv from anon/authenticated
-- Access should only be via RPC functions with service_role
REVOKE ALL ON public.raffle_stats_mv FROM anon, authenticated;

-- Add comment documenting the security decision
COMMENT ON MATERIALIZED VIEW public.raffle_stats_mv IS 
'Protected materialized view - access only via get_raffle_stats_for_org() RPC function';