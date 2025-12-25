-- Add payment_reference column if not exists (already exists but ensure it's being used)
-- This column will store the unique reference code for each reservation group

-- Create a function to generate unique reference codes
CREATE OR REPLACE FUNCTION generate_reference_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;