-- =====================================================
-- PRE-PRODUCTION SECURITY FIX: Issues 1, 4, 5
-- =====================================================

-- 1. Función segura para obtener invitación por token
-- Evita exposición de tokens de invitación
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  role app_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  organization_id uuid,
  invited_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.email,
    ti.role,
    ti.expires_at,
    ti.accepted_at,
    ti.organization_id,
    ti.invited_by
  FROM public.team_invitations ti
  WHERE ti.token = p_token;
END;
$$;

-- Eliminar política pública que expone todos los tokens
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.team_invitations;

-- =====================================================

-- 2. Función segura para validar cupones
-- El código se valida sin exponer la lista de cupones
CREATE OR REPLACE FUNCTION public.validate_coupon_code(
  p_code text,
  p_raffle_id uuid DEFAULT NULL,
  p_total numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  -- Buscar cupón por código exacto (case-insensitive)
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = UPPER(p_code)
    AND active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón no válido');
  END IF;
  
  -- Validar expiración
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón expirado');
  END IF;
  
  -- Validar fecha de inicio
  IF v_coupon.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón aún no válido');
  END IF;
  
  -- Validar usos máximos
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón agotado');
  END IF;
  
  -- Validar compra mínima
  IF v_coupon.min_purchase IS NOT NULL AND p_total < v_coupon.min_purchase THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Compra mínima: $' || v_coupon.min_purchase::text);
  END IF;
  
  -- Validar raffle específico
  IF v_coupon.raffle_id IS NOT NULL AND v_coupon.raffle_id != p_raffle_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón no válido para este sorteo');
  END IF;
  
  -- Cupón válido - retornar datos necesarios (sin exponer organization_id ni otros campos internos)
  RETURN jsonb_build_object(
    'valid', true,
    'coupon', jsonb_build_object(
      'id', v_coupon.id,
      'code', v_coupon.code,
      'name', v_coupon.name,
      'discount_type', v_coupon.discount_type,
      'discount_value', v_coupon.discount_value,
      'min_purchase', v_coupon.min_purchase
    )
  );
END;
$$;

-- Eliminar política pública que expone códigos de cupones
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;

-- =====================================================

-- 3. Vista segura para dominios públicos (sin verification_token)
DROP VIEW IF EXISTS public.public_custom_domains;

CREATE VIEW public.public_custom_domains AS
SELECT 
  id,
  organization_id,
  domain,
  is_primary,
  verified,
  created_at
FROM public.custom_domains
WHERE verified = true;

-- Eliminar política que expone verification_token
DROP POLICY IF EXISTS "Public can lookup verified domains" ON public.custom_domains;

-- Comentario: La función get_organization_by_domain ya es SECURITY DEFINER
-- y accede directamente a la tabla, por lo que no se ve afectada