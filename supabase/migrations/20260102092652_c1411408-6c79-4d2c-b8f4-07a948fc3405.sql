-- Update get_organization_by_domain to flexibly search www/non-www variants
CREATE OR REPLACE FUNCTION public.get_organization_by_domain(p_domain text)
 RETURNS TABLE(id uuid, name text, slug text, logo_url text, brand_color text, favicon_url text, meta_title text, meta_description text, custom_css text, white_label_enabled boolean, powered_by_visible boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized_domain TEXT;
  www_domain TEXT;
BEGIN
  -- Normalize: remove www. prefix if exists (case-insensitive)
  normalized_domain := lower(regexp_replace(p_domain, '^www\.', '', 'i'));
  www_domain := 'www.' || normalized_domain;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.brand_color,
    o.favicon_url,
    o.meta_title,
    o.meta_description,
    o.custom_css,
    o.white_label_enabled,
    o.powered_by_visible
  FROM public.organizations o
  INNER JOIN public.custom_domains cd ON cd.organization_id = o.id
  WHERE cd.verified = true
    AND (
      lower(cd.domain) = lower(p_domain)
      OR lower(cd.domain) = normalized_domain
      OR lower(cd.domain) = www_domain
    )
  LIMIT 1;
END;
$function$;