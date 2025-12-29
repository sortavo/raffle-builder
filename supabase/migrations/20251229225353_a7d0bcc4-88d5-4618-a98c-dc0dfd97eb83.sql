
-- DROP the overly permissive policy that exposes all columns
DROP POLICY IF EXISTS "Public can view tickets of active raffles" ON public.tickets;

-- Create a secure RPC function that only returns public fields
-- This is the ONLY way public users can access ticket data
CREATE OR REPLACE FUNCTION public.get_public_tickets(
  p_raffle_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  ticket_index INTEGER,
  status ticket_status,
  buyer_name TEXT,
  buyer_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Only return tickets from active raffles
  RETURN QUERY
  SELECT 
    t.id,
    t.ticket_number,
    t.ticket_index,
    t.status,
    t.buyer_name,
    t.buyer_city
  FROM public.tickets t
  INNER JOIN public.raffles r ON r.id = t.raffle_id
  WHERE t.raffle_id = p_raffle_id
    AND r.status = 'active'
  ORDER BY t.ticket_index ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- Function to get ticket counts (no sensitive data exposed)
CREATE OR REPLACE FUNCTION public.get_public_ticket_counts(p_raffle_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  sold_count BIGINT,
  reserved_count BIGINT,
  available_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE t.status = 'sold')::BIGINT as sold_count,
    COUNT(*) FILTER (WHERE t.status = 'reserved')::BIGINT as reserved_count,
    COUNT(*) FILTER (WHERE t.status = 'available')::BIGINT as available_count
  FROM public.tickets t
  INNER JOIN public.raffles r ON r.id = t.raffle_id
  WHERE t.raffle_id = p_raffle_id
    AND r.status = 'active';
END;
$$;

-- Function to search tickets by number (for mega-raffles)
CREATE OR REPLACE FUNCTION public.search_public_tickets(
  p_raffle_id UUID,
  p_search TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  ticket_index INTEGER,
  status ticket_status,
  buyer_name TEXT,
  buyer_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.ticket_number,
    t.ticket_index,
    t.status,
    t.buyer_name,
    t.buyer_city
  FROM public.tickets t
  INNER JOIN public.raffles r ON r.id = t.raffle_id
  WHERE t.raffle_id = p_raffle_id
    AND r.status = 'active'
    AND t.ticket_number ILIKE '%' || p_search || '%'
  ORDER BY t.ticket_index ASC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_tickets TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_ticket_counts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_tickets TO anon, authenticated;

-- Drop the view since we're using RPC instead (more secure)
DROP VIEW IF EXISTS public.tickets_public;

-- Add comments
COMMENT ON FUNCTION public.get_public_tickets IS 'Returns paginated public ticket data for active raffles. Only exposes: id, ticket_number, ticket_index, status, buyer_name, buyer_city. Protects: buyer_email, buyer_phone, payment_reference, order_total.';
COMMENT ON FUNCTION public.get_public_ticket_counts IS 'Returns ticket count statistics for active raffles. No personal data exposed.';
COMMENT ON FUNCTION public.search_public_tickets IS 'Searches tickets by number for active raffles. Only exposes public fields.';
