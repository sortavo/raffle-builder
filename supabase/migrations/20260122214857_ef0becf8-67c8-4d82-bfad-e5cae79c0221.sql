-- Add payment_proof_uploaded_at column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;

-- Create index for queries that filter by this timestamp
CREATE INDEX IF NOT EXISTS idx_orders_proof_uploaded 
ON orders(payment_proof_uploaded_at) 
WHERE payment_proof_uploaded_at IS NOT NULL;

-- Update the get_buyers_paginated function to include new timestamp fields
CREATE OR REPLACE FUNCTION get_buyers_paginated(
  p_raffle_id UUID,
  p_status TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE (
  order_id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  ticket_count INT,
  ticket_ranges JSONB,
  lucky_indices INT[],
  order_total NUMERIC,
  status TEXT,
  payment_method TEXT,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  payment_proof_uploaded_at TIMESTAMPTZ,
  reference_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS order_id,
    o.buyer_name,
    o.buyer_email,
    o.buyer_phone,
    o.buyer_city,
    o.ticket_count,
    o.ticket_ranges,
    o.lucky_indices,
    o.order_total,
    o.status,
    o.payment_method,
    o.payment_proof_url,
    o.created_at,
    o.sold_at,
    o.approved_at,
    o.payment_proof_uploaded_at,
    o.reference_code
  FROM orders o
  WHERE o.raffle_id = p_raffle_id
    AND (p_status IS NULL OR o.status = p_status)
    AND (p_city IS NULL OR o.buyer_city ILIKE '%' || p_city || '%')
    AND (p_search IS NULL OR 
         o.buyer_name ILIKE '%' || p_search || '%' OR
         o.buyer_email ILIKE '%' || p_search || '%' OR
         o.buyer_phone ILIKE '%' || p_search || '%' OR
         o.reference_code ILIKE '%' || p_search || '%')
  ORDER BY o.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;