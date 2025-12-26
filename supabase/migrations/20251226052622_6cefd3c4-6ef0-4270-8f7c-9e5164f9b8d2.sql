-- Add new array columns for multiple contacts (up to 5 each)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS emails text[] DEFAULT '{}';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS phones text[] DEFAULT '{}';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS whatsapp_numbers text[] DEFAULT '{}';

-- Migrate existing data to the new arrays
UPDATE public.organizations SET 
  emails = CASE WHEN email IS NOT NULL AND email != '' THEN ARRAY[email] ELSE '{}' END,
  phones = CASE WHEN phone IS NOT NULL AND phone != '' THEN ARRAY[phone] ELSE '{}' END,
  whatsapp_numbers = CASE WHEN whatsapp_number IS NOT NULL AND whatsapp_number != '' THEN ARRAY[whatsapp_number] ELSE '{}' END
WHERE emails = '{}' OR phones = '{}' OR whatsapp_numbers = '{}';