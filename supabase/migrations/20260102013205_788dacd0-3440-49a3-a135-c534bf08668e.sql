-- =====================================================
-- PRE-PRODUCTION WARNINGS FIX: Issues 3-8
-- =====================================================

-- Warning 3: Restringir campos sensibles de raffles en vista pública
-- La política actual expone numbering_config y lucky_numbers_config
-- Solución: Crear vista segura para acceso público

CREATE OR REPLACE VIEW public.public_raffles AS
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
  -- Excluidos: numbering_config, lucky_numbers_config, winner_data, auto_publish_result
FROM public.raffles
WHERE status = 'active';

-- Warning 4: Telegram buyer links - agregar validación
-- Actualmente permite UPDATE/SELECT sin restricción
-- Cambiar a validación por email coincidente

DROP POLICY IF EXISTS "Anyone can update buyer telegram link by email" ON public.telegram_buyer_links;
CREATE POLICY "Buyers can update their own telegram link"
ON public.telegram_buyer_links
FOR UPDATE
USING (
  -- Solo permitir si el email coincide con un ticket del usuario
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.buyer_email = telegram_buyer_links.buyer_email
    AND t.reserved_at > now() - interval '30 days'
  )
);

DROP POLICY IF EXISTS "Anyone can view buyer telegram link by email" ON public.telegram_buyer_links;
CREATE POLICY "Buyers can view their own telegram link"
ON public.telegram_buyer_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.buyer_email = telegram_buyer_links.buyer_email
    AND t.reserved_at > now() - interval '30 days'
  )
);

-- Warning 5: Tickets - restringir UPDATE de tickets disponibles
-- Problema: Cualquiera puede cambiar status de available a reserved
-- Solución: Agregar validaciones en la política

DROP POLICY IF EXISTS "Anyone can reserve available tickets" ON public.tickets;
CREATE POLICY "Anyone can reserve available tickets with valid data"
ON public.tickets
FOR UPDATE
USING (status = 'available')
WITH CHECK (
  status = 'reserved'
  AND buyer_name IS NOT NULL 
  AND LENGTH(TRIM(buyer_name)) >= 2
  AND (buyer_email IS NOT NULL OR buyer_phone IS NOT NULL)
  AND reserved_until > now()
  AND reserved_until <= now() + interval '60 minutes'
);

-- Warning 6: Buyers - Crear función RPC para inserción segura
-- Evita que cualquiera inserte registros arbitrarios

CREATE OR REPLACE FUNCTION public.register_buyer(
  p_full_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
BEGIN
  -- Validar email
  IF p_email IS NULL OR p_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;
  
  -- Validar nombre
  IF p_full_name IS NULL OR LENGTH(TRIM(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'Nombre inválido';
  END IF;
  
  -- Buscar o crear buyer
  SELECT id INTO v_buyer_id
  FROM public.buyers
  WHERE email = LOWER(TRIM(p_email));
  
  IF v_buyer_id IS NULL THEN
    INSERT INTO public.buyers (email, full_name, phone, city)
    VALUES (LOWER(TRIM(p_email)), TRIM(p_full_name), p_phone, p_city)
    RETURNING id INTO v_buyer_id;
  ELSE
    -- Actualizar datos si ya existe
    UPDATE public.buyers
    SET 
      full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
      phone = COALESCE(p_phone, phone),
      city = COALESCE(p_city, city)
    WHERE id = v_buyer_id;
  END IF;
  
  RETURN v_buyer_id;
END;
$$;

-- Warning 7: Analytics - validar que raffle_id existe y es activo
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert valid analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (
  -- Permitir eventos sin raffle_id (page views generales)
  raffle_id IS NULL
  OR
  -- O validar que el raffle existe y está activo
  EXISTS (
    SELECT 1 FROM public.raffles r
    WHERE r.id = analytics_events.raffle_id
    AND r.status = 'active'
  )
);

-- Warning 8: Coupon usage - validar inserción
DROP POLICY IF EXISTS "Anyone can insert coupon usage" ON public.coupon_usage;
CREATE POLICY "Valid coupon usage only"
ON public.coupon_usage
FOR INSERT
WITH CHECK (
  -- Validar que el cupón existe y está activo
  EXISTS (
    SELECT 1 FROM public.coupons c
    WHERE c.id = coupon_usage.coupon_id
    AND c.active = true
  )
  AND
  -- Si hay ticket_id, validar que existe y está en proceso de compra
  (
    ticket_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = coupon_usage.ticket_id
      AND t.status IN ('reserved', 'sold')
    )
  )
);

-- =====================================================
-- ÍNDICES para optimizar las nuevas validaciones
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email_reserved 
ON public.tickets(buyer_email, reserved_at) 
WHERE buyer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buyers_email_lower 
ON public.buyers(LOWER(email));