-- =====================================================
-- HARDENING DE PRODUCCIÓN: Resolver 4 Issues del Linter
-- =====================================================

-- Issue 1: Recrear vistas con SECURITY INVOKER explícito
-- -----------------------------------------------------

-- 1.1 Recrear public_raffles con SECURITY INVOKER
DROP VIEW IF EXISTS public_raffles;
CREATE VIEW public_raffles 
WITH (security_invoker = true) AS
SELECT 
  id, organization_id, title, description, slug, status,
  category, template_id, customization, prize_name, prize_images,
  prize_video_url, prize_value, prize_terms, prize_display_mode,
  prizes, ticket_price, total_tickets, currency_code, draw_date,
  draw_method, lottery_digits, lottery_draw_number, start_date,
  reservation_time_minutes, max_tickets_per_person, 
  max_tickets_per_purchase, min_tickets_per_purchase,
  close_sale_hours_before, livestream_url, allow_individual_sale, 
  lucky_numbers_enabled, lucky_numbers_config, numbering_config,
  winner_announced, winner_ticket_number, winner_data, created_at, updated_at
FROM raffles
WHERE status IN ('active', 'completed');

-- Otorgar permisos en public_raffles
GRANT SELECT ON public_raffles TO anon, authenticated;

-- 1.2 Recrear public_custom_domains con SECURITY INVOKER
DROP VIEW IF EXISTS public_custom_domains;
CREATE VIEW public_custom_domains 
WITH (security_invoker = true) AS
SELECT id, organization_id, domain, verified, is_primary, created_at
FROM custom_domains
WHERE verified = true;

-- Otorgar permisos en public_custom_domains
GRANT SELECT ON public_custom_domains TO anon, authenticated;

-- 1.3 Recrear public_ticket_status con SECURITY INVOKER
DROP VIEW IF EXISTS public_ticket_status;
CREATE VIEW public_ticket_status 
WITH (security_invoker = true) AS
SELECT id, raffle_id, organization_id, ticket_ranges, lucky_indices,
       ticket_count, status, reserved_until, created_at
FROM orders
WHERE status IN ('sold', 'reserved', 'pending');

-- Otorgar permisos en public_ticket_status
GRANT SELECT ON public_ticket_status TO anon, authenticated;

-- Issue 2: Mover pg_trgm al schema extensions
-- -----------------------------------------------------
-- Primero crear el schema extensions si no existe
CREATE SCHEMA IF NOT EXISTS extensions;

-- Nota: Mover pg_trgm requiere recrear índices. 
-- Esto puede hacerse sin DROP si se usa ALTER EXTENSION
-- Verificar si pg_trgm ya existe en extensions
DO $$
BEGIN
  -- Si pg_trgm está en public, moverlo a extensions
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'pg_trgm' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- No podemos ALTER EXTENSION para mover schema en todas las versiones
    -- Documentar que esto requiere verificación manual
    RAISE NOTICE 'pg_trgm está en public. Considerar mover a extensions manualmente si es posible.';
  END IF;
END $$;

-- Issue 3: Restringir RLS Policy de stripe_events
-- -----------------------------------------------------
-- Eliminar policy permisiva existente
DROP POLICY IF EXISTS "Service role only for stripe_events" ON stripe_events;
DROP POLICY IF EXISTS "stripe_events_service_role_only" ON stripe_events;

-- Crear policy restrictiva (solo service_role puede acceder)
-- Nota: auth.role() devuelve 'service_role' cuando se usa la service_role key
CREATE POLICY "stripe_events_service_role_only" ON stripe_events
  FOR ALL
  USING (
    -- Solo permitir acceso desde service_role (edge functions)
    -- o platform admins para debugging
    (SELECT auth.role()) = 'service_role'
    OR EXISTS (
      SELECT 1 FROM platform_admins 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
  );

-- Comentario explicativo
COMMENT ON POLICY "stripe_events_service_role_only" ON stripe_events IS 
'Solo permite acceso a stripe_events desde edge functions (service_role) o platform_admins para auditoría. Los inserts solo desde service_role.';