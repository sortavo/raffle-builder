-- Add a unique constraint on organization slug if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_key'
  ) THEN
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Create a function to validate organization slugs
CREATE OR REPLACE FUNCTION public.validate_organization_slug()
RETURNS TRIGGER AS $$
DECLARE
  reserved_slugs TEXT[] := ARRAY[
    'auth', 'dashboard', 'onboarding', 'pricing', 'help', 'my-tickets', 'ticket', 'invite',
    'terms', 'privacy', 'r',
    'admin', 'api', 'login', 'logout', 'signup', 'register', 'settings', 'config',
    'app', 'www', 'mail', 'email', 'support', 'billing', 'account', 'org', 'organization',
    'user', 'users', 'static', 'assets', 'public', 'private', 'internal', 'system',
    'root', 'null', 'undefined', 'new', 'edit', 'delete', 'create', 'update',
    'cdn', 'media', 'images', 'files', 'uploads', 'downloads', 'docs', 'blog',
    'news', 'about', 'contact', 'faq', 'search', 'sitemap', 'robots', 'favicon',
    'sortavo', 'sorteo', 'sorteos', 'rifa', 'rifas', 'boleto', 'boletos'
  ];
  slug_lower TEXT;
  reserved TEXT;
BEGIN
  -- Skip validation if slug is null
  IF NEW.slug IS NULL THEN
    RETURN NEW;
  END IF;
  
  slug_lower := LOWER(NEW.slug);
  
  -- Check if slug matches reserved words
  FOREACH reserved IN ARRAY reserved_slugs
  LOOP
    IF slug_lower = reserved OR 
       slug_lower LIKE reserved || '-%' OR 
       slug_lower LIKE '%-' || reserved THEN
      RAISE EXCEPTION 'Slug "%" is reserved and cannot be used', NEW.slug;
    END IF;
  END LOOP;
  
  -- Validate slug format (lowercase alphanumeric with hyphens)
  IF slug_lower !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid slug format. Use only lowercase letters, numbers, and hyphens';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to validate slugs on insert and update
DROP TRIGGER IF EXISTS validate_organization_slug_trigger ON public.organizations;
CREATE TRIGGER validate_organization_slug_trigger
  BEFORE INSERT OR UPDATE OF slug ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_organization_slug();