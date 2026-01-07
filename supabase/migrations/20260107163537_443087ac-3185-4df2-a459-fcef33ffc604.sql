
-- Fix the release_expired_tickets function to work with sold_tickets (virtual model)
CREATE OR REPLACE FUNCTION public.release_expired_tickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  -- Delete expired reserved tickets from sold_tickets
  -- This releases them back to "available" (virtual model - no row = available)
  DELETE FROM public.sold_tickets
  WHERE status = 'reserved'
    AND reserved_until < NOW();
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  
  -- Log the action if tickets were released
  IF released_count > 0 THEN
    RAISE NOTICE 'Released % expired ticket reservations', released_count;
  END IF;
END;
$$;