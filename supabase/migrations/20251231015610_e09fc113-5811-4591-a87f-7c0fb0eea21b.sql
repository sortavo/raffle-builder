-- Add address field to organizations table
ALTER TABLE public.organizations
ADD COLUMN address TEXT NULL;