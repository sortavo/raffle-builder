-- Create a security definer function to allow public access to order verification by reference code
-- This bypasses RLS in a controlled way, only returning data for matching payment_reference

CREATE OR REPLACE FUNCTION public.get_order_by_reference(p_reference_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Return null if no reference code provided
  IF p_reference_code IS NULL OR TRIM(p_reference_code) = '' THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'tickets', (
      SELECT json_agg(
        json_build_object(
          'id', t.id,
          'ticket_number', t.ticket_number,
          'ticket_index', t.ticket_index,
          'status', t.status,
          'reserved_at', t.reserved_at,
          'sold_at', t.sold_at,
          'payment_reference', t.payment_reference,
          'order_total', t.order_total,
          'payment_method', t.payment_method,
          'buyer_name', t.buyer_name,
          'buyer_email', t.buyer_email,
          'buyer_phone', t.buyer_phone,
          'buyer_city', t.buyer_city
        ) ORDER BY t.ticket_index
      )
      FROM tickets t
      WHERE t.payment_reference = UPPER(p_reference_code)
    ),
    'raffle', (
      SELECT json_build_object(
        'id', r.id,
        'title', r.title,
        'slug', r.slug,
        'prize_name', r.prize_name,
        'prize_images', r.prize_images,
        'draw_date', r.draw_date,
        'ticket_price', r.ticket_price,
        'currency_code', r.currency_code,
        'status', r.status
      )
      FROM raffles r
      WHERE r.id = (
        SELECT raffle_id FROM tickets 
        WHERE payment_reference = UPPER(p_reference_code) 
        LIMIT 1
      )
    ),
    'organization', (
      SELECT json_build_object(
        'id', o.id,
        'name', o.name,
        'logo_url', o.logo_url,
        'whatsapp_number', o.whatsapp_number,
        'slug', o.slug
      )
      FROM organizations o
      WHERE o.id = (
        SELECT r.organization_id 
        FROM raffles r
        JOIN tickets t ON t.raffle_id = r.id
        WHERE t.payment_reference = UPPER(p_reference_code)
        LIMIT 1
      )
    )
  ) INTO v_result;
  
  -- Return null if no tickets found
  IF v_result->'tickets' IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN v_result;
END;
$$;