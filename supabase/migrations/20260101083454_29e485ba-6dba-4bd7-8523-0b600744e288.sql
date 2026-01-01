-- Función para verificar si una organización puede tener custom domains
CREATE OR REPLACE FUNCTION public.can_have_custom_domains(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(subscription_tier::text, 'basic') IN ('pro', 'premium', 'enterprise')
  FROM public.organizations
  WHERE id = org_id
$$;

-- Eliminar policy existente si hay conflicto con la nueva
DROP POLICY IF EXISTS "Org admins can manage their domains" ON public.custom_domains;

-- Policy para SELECT: org admins pueden ver sus dominios
CREATE POLICY "Org admins can view their domains" ON public.custom_domains
FOR SELECT
USING (is_org_admin(auth.uid(), organization_id));

-- Policy para INSERT: Solo Pro+ pueden insertar dominios
CREATE POLICY "Only Pro+ can insert domains" ON public.custom_domains
FOR INSERT
WITH CHECK (
  is_org_admin(auth.uid(), organization_id) 
  AND can_have_custom_domains(organization_id)
);

-- Policy para UPDATE: org admins pueden actualizar sus dominios
CREATE POLICY "Org admins can update their domains" ON public.custom_domains
FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

-- Policy para DELETE: org admins pueden eliminar sus dominios
CREATE POLICY "Org admins can delete their domains" ON public.custom_domains
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));