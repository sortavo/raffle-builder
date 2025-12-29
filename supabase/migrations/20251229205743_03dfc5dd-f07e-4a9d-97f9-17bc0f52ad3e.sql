-- Create a function to get paginated buyers with server-side grouping
CREATE OR REPLACE FUNCTION public.get_buyers_paginated(
  p_raffle_id UUID,
  p_status TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  buyer_key TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  ticket_numbers TEXT[],
  ticket_count BIGINT,
  status TEXT,
  first_reserved_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- First get total count of unique buyers matching filters
  SELECT COUNT(DISTINCT COALESCE(t.buyer_email, t.buyer_phone, t.buyer_name))
  INTO v_total
  FROM public.tickets t
  WHERE t.raffle_id = p_raffle_id
    AND t.buyer_name IS NOT NULL
    AND (p_status IS NULL OR p_status = 'all' OR t.status = p_status::ticket_status)
    AND (p_city IS NULL OR t.buyer_city = p_city)
    AND (p_search IS NULL OR 
         t.buyer_name ILIKE '%' || p_search || '%' OR
         t.buyer_email ILIKE '%' || p_search || '%' OR
         t.buyer_phone ILIKE '%' || p_search || '%')
    AND (p_start_date IS NULL OR t.reserved_at >= p_start_date)
    AND (p_end_date IS NULL OR t.reserved_at <= p_end_date);

  -- Return grouped and paginated results
  RETURN QUERY
  SELECT 
    COALESCE(t.buyer_email, t.buyer_phone, t.buyer_name) as buyer_key,
    MAX(t.buyer_name) as buyer_name,
    MAX(t.buyer_email) as buyer_email,
    MAX(t.buyer_phone) as buyer_phone,
    MAX(t.buyer_city) as buyer_city,
    ARRAY_AGG(t.ticket_number ORDER BY t.ticket_index) as ticket_numbers,
    COUNT(*)::BIGINT as ticket_count,
    MODE() WITHIN GROUP (ORDER BY t.status::TEXT) as status,
    MIN(t.reserved_at) as first_reserved_at,
    v_total as total_count
  FROM public.tickets t
  WHERE t.raffle_id = p_raffle_id
    AND t.buyer_name IS NOT NULL
    AND (p_status IS NULL OR p_status = 'all' OR t.status = p_status::ticket_status)
    AND (p_city IS NULL OR t.buyer_city = p_city)
    AND (p_search IS NULL OR 
         t.buyer_name ILIKE '%' || p_search || '%' OR
         t.buyer_email ILIKE '%' || p_search || '%' OR
         t.buyer_phone ILIKE '%' || p_search || '%')
    AND (p_start_date IS NULL OR t.reserved_at >= p_start_date)
    AND (p_end_date IS NULL OR t.reserved_at <= p_end_date)
  GROUP BY COALESCE(t.buyer_email, t.buyer_phone, t.buyer_name)
  ORDER BY MIN(t.reserved_at) DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;