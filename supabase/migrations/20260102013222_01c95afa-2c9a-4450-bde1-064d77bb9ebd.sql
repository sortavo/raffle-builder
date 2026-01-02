-- =====================================================
-- FIX: Convertir vistas a SECURITY INVOKER
-- =====================================================

-- Recrear public_raffles como vista normal (SECURITY INVOKER por defecto)
DROP VIEW IF EXISTS public.public_raffles;
CREATE VIEW public.public_raffles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  organization_id,
  title,
  description,
  slug,
  prize_name,
  prize_images,
  prize_video_url,
  prize_value,
  prize_terms,
  prize_display_mode,
  prizes,
  ticket_price,
  total_tickets,
  draw_date,
  draw_method,
  lottery_digits,
  lottery_draw_number,
  start_date,
  status,
  template_id,
  customization,
  category,
  livestream_url,
  close_sale_hours_before,
  max_tickets_per_person,
  max_tickets_per_purchase,
  reservation_time_minutes,
  allow_individual_sale,
  lucky_numbers_enabled,
  winner_announced,
  winner_ticket_number,
  currency_code,
  created_at,
  updated_at
FROM public.raffles
WHERE status = 'active';

-- Recrear public_custom_domains con SECURITY INVOKER
DROP VIEW IF EXISTS public.public_custom_domains;
CREATE VIEW public.public_custom_domains
WITH (security_invoker = true)
AS
SELECT 
  id,
  organization_id,
  domain,
  is_primary,
  verified,
  created_at
FROM public.custom_domains
WHERE verified = true;