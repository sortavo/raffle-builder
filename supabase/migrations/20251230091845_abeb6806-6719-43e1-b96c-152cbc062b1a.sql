-- Drop and recreate the get_buyers_paginated function with additional fields
DROP FUNCTION IF EXISTS public.get_buyers_paginated(uuid, text, text, text, timestamp with time zone, timestamp with time zone, integer, integer);

CREATE OR REPLACE FUNCTION public.get_buyers_paginated(
  p_raffle_id uuid, 
  p_status text DEFAULT NULL::text, 
  p_city text DEFAULT NULL::text, 
  p_search text DEFAULT NULL::text, 
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_page integer DEFAULT 1, 
  p_page_size integer DEFAULT 20
)
RETURNS TABLE(
  buyer_key text, 
  buyer_name text, 
  buyer_email text, 
  buyer_phone text, 
  buyer_city text, 
  ticket_numbers text[], 
  ticket_count bigint, 
  status text, 
  first_reserved_at timestamp with time zone, 
  total_count bigint,
  order_total numeric,
  payment_method text,
  payment_reference text,
  has_payment_proof boolean,
  sold_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Return grouped and paginated results with additional fields
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
    v_total as total_count,
    MAX(t.order_total) as order_total,
    MODE() WITHIN GROUP (ORDER BY t.payment_method) as payment_method,
    MAX(t.payment_reference) as payment_reference,
    BOOL_OR(t.payment_proof_url IS NOT NULL) as has_payment_proof,
    MAX(t.sold_at) as sold_at
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
$function$;