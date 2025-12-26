-- Add slug column to organizations table for path-based routing
ALTER TABLE public.organizations ADD COLUMN slug TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- Add RLS policy for public access to organizations by slug
CREATE POLICY "Public can view organizations by slug"
ON public.organizations
FOR SELECT
USING (slug IS NOT NULL);