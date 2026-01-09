-- Dropear función existente para cambiar return type
DROP FUNCTION IF EXISTS get_buyers_paginated(UUID, INTEGER, INTEGER, TEXT, TEXT);

-- Recrear get_buyers_paginated con ticket_numbers
CREATE OR REPLACE FUNCTION get_buyers_paginated(
  p_raffle_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  order_id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  ticket_count INTEGER,
  status TEXT,
  reserved_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  total_amount NUMERIC,
  payment_method TEXT,
  reference_code TEXT,
  payment_proof_url TEXT,
  ticket_numbers TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id as order_id,
    o.buyer_name,
    o.buyer_email,
    o.buyer_phone,
    o.buyer_city,
    o.ticket_count,
    o.status,
    o.reserved_at,
    o.sold_at,
    o.order_total as total_amount,
    o.payment_method,
    o.reference_code,
    o.payment_proof_url,
    -- Expandir rangos a array de números formateados
    (
      SELECT COALESCE(array_agg(
        CASE 
          WHEN nc.pad_width IS NOT NULL AND nc.pad_width > 0
          THEN lpad(idx::TEXT, nc.pad_width, COALESCE(nc.pad_char, '0'))
          ELSE idx::TEXT
        END
        ORDER BY idx
      ), ARRAY[]::TEXT[])
      FROM (
        SELECT generate_series((range->>'s')::INT, (range->>'e')::INT) as idx
        FROM jsonb_array_elements(o.ticket_ranges) range
        UNION ALL
        SELECT unnest(o.lucky_indices)
      ) expanded,
      LATERAL (
        SELECT 
          COALESCE((r.numbering_config->>'pad_width')::INT, NULL) as pad_width,
          COALESCE(r.numbering_config->>'pad_char', '0') as pad_char
        FROM raffles r 
        WHERE r.id = o.raffle_id
      ) nc
    ) as ticket_numbers
  FROM orders o
  WHERE o.raffle_id = p_raffle_id
    AND o.buyer_name IS NOT NULL
    AND (p_status_filter IS NULL OR o.status = p_status_filter)
    AND (
      p_search IS NULL 
      OR o.buyer_name ILIKE '%' || p_search || '%'
      OR o.buyer_email ILIKE '%' || p_search || '%'
      OR o.buyer_phone ILIKE '%' || p_search || '%'
      OR o.reference_code ILIKE '%' || p_search || '%'
    )
  ORDER BY o.reserved_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
$$;