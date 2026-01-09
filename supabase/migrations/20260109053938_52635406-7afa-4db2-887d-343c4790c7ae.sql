-- Phase 1: Security Fixes for External Migration

-- 1.1 Recreate public_raffles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_raffles;

CREATE VIEW public.public_raffles
WITH (security_invoker = true)
AS
SELECT 
  r.id,
  r.organization_id,
  r.title,
  r.slug,
  r.description,
  r.prize_name,
  r.prize_value,
  r.prize_images,
  r.prize_video_url,
  r.prize_terms,
  r.prize_display_mode,
  r.prizes,
  r.total_tickets,
  r.ticket_price,
  r.currency_code,
  r.draw_date,
  r.draw_method,
  r.lottery_digits,
  r.lottery_draw_number,
  r.livestream_url,
  r.status,
  r.template_id,
  r.customization,
  r.reservation_time_minutes,
  r.max_tickets_per_person,
  r.max_tickets_per_purchase,
  r.allow_individual_sale,
  r.close_sale_hours_before,
  r.lucky_numbers_enabled,
  r.winner_announced,
  r.winner_ticket_number,
  r.category,
  r.start_date,
  r.created_at,
  r.updated_at
FROM raffles r
WHERE r.status IN ('active', 'completed');

-- 1.2 Recreate public_custom_domains view with SECURITY INVOKER  
DROP VIEW IF EXISTS public.public_custom_domains;

CREATE VIEW public.public_custom_domains
WITH (security_invoker = true)
AS
SELECT 
  cd.id,
  cd.organization_id,
  cd.domain,
  cd.verified,
  cd.is_primary,
  cd.created_at
FROM custom_domains cd
WHERE cd.verified = true;

-- 1.3 Revoke direct access to raffle_stats_mv (access only via RPC functions)
REVOKE SELECT ON public.raffle_stats_mv FROM anon;
REVOKE SELECT ON public.raffle_stats_mv FROM authenticated;

-- Grant to service_role only (for admin/internal use)
GRANT SELECT ON public.raffle_stats_mv TO service_role;