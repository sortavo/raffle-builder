
-- Drop legacy versions that use sold_tickets

-- Drop the 3-param version of get_virtual_tickets that uses sold_tickets
DROP FUNCTION IF EXISTS get_virtual_tickets(uuid, integer, integer);

-- Drop the 8-param version of get_buyers_paginated that uses sold_tickets  
DROP FUNCTION IF EXISTS get_buyers_paginated(uuid, text, text, text, timestamp with time zone, timestamp with time zone, integer, integer);

-- Create a wrapper for 3-param calls to redirect to the 5-param version
CREATE OR REPLACE FUNCTION get_virtual_tickets(
  p_raffle_id UUID,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 100
)
RETURNS TABLE(
  ticket_index INTEGER,
  ticket_number TEXT,
  status TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  reference_code TEXT,
  order_id UUID,
  reserved_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_virtual_tickets(p_raffle_id, p_page, p_page_size, NULL::TEXT, NULL::TEXT);
END;
$$;

-- Drop and recreate sold_tickets_compat view with correct types
DROP VIEW IF EXISTS sold_tickets_compat;

CREATE VIEW sold_tickets_compat AS
SELECT 
  o.id as order_id,
  o.raffle_id,
  idx.ticket_index,
  format_virtual_ticket(idx.ticket_index, r.numbering_config, r.total_tickets) as ticket_number,
  o.status::TEXT as status,
  o.buyer_id,
  o.buyer_name,
  o.buyer_email,
  o.buyer_phone,
  o.buyer_city,
  o.payment_proof_url,
  o.payment_method,
  o.reference_code as payment_reference,
  o.order_total,
  o.reserved_at,
  o.reserved_until,
  o.sold_at,
  o.approved_at,
  o.approved_by,
  o.created_at,
  o.canceled_at
FROM orders o
JOIN raffles r ON r.id = o.raffle_id
CROSS JOIN LATERAL expand_order_to_indices(o.ticket_ranges, o.lucky_indices) AS idx(ticket_index)
WHERE o.status IN ('reserved', 'sold');
