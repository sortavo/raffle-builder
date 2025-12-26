-- Tabla para Platform Admins (Super Admins)
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  notes text
);

-- Habilitar RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Función para validar dominio @sortavo.com antes de insertar
CREATE OR REPLACE FUNCTION public.validate_platform_admin_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Obtener el email del usuario desde auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  -- Validar que el email termine en @sortavo.com
  IF user_email IS NULL OR NOT user_email LIKE '%@sortavo.com' THEN
    RAISE EXCEPTION 'Solo usuarios con email @sortavo.com pueden ser Platform Admins';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar dominio antes de insertar
CREATE TRIGGER validate_platform_admin_domain
  BEFORE INSERT ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.validate_platform_admin_email();

-- Función para verificar si el usuario es Platform Admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

-- RLS: Solo platform admins pueden ver esta tabla
CREATE POLICY "Platform admins can view platform_admins"
  ON public.platform_admins FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Políticas para que Platform Admins puedan ver todas las organizaciones
CREATE POLICY "Platform admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Políticas para que Platform Admins puedan ver todos los sorteos
CREATE POLICY "Platform admins can view all raffles"
  ON public.raffles FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Políticas para que Platform Admins puedan ver todos los tickets
CREATE POLICY "Platform admins can view all tickets"
  ON public.tickets FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Políticas para que Platform Admins puedan ver todos los perfiles
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Políticas para que Platform Admins puedan ver todos los roles
CREATE POLICY "Platform admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Políticas para que Platform Admins puedan ver todos los compradores
CREATE POLICY "Platform admins can view all buyers"
  ON public.buyers FOR SELECT
  USING (is_platform_admin(auth.uid()));