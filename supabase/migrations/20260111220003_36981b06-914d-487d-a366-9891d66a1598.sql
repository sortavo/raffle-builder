-- Function: search_public_tickets
-- Searches for tickets in a raffle, returning only public-safe fields
-- Protected fields (buyer_email, buyer_phone, order_total) are NOT exposed
CREATE OR REPLACE FUNCTION public.search_public_tickets(
  p_raffle_id UUID,
  p_search TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  ticket_index INTEGER,
  ticket_number TEXT,
  status TEXT,
  buyer_name TEXT,
  buyer_city TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numbering_config JSONB;
  v_total_tickets INTEGER;
BEGIN
  -- Get raffle configuration
  SELECT r.numbering_config, r.total_tickets 
  INTO v_numbering_config, v_total_tickets
  FROM raffles r
  WHERE r.id = p_raffle_id;

  -- Return matching tickets from orders
  RETURN QUERY
  WITH expanded_orders AS (
    SELECT 
      o.id as order_id,
      o.buyer_name,
      o.buyer_city,
      o.status as order_status,
      t.ticket_index as idx
    FROM orders o
    CROSS JOIN LATERAL expand_order_to_indices(o.lucky_indices, o.ticket_ranges) t
    WHERE o.raffle_id = p_raffle_id
      AND o.status IN ('reserved', 'sold')
  ),
  formatted_tickets AS (
    SELECT 
      eo.idx as ticket_index,
      format_virtual_ticket(v_numbering_config, eo.idx, v_total_tickets) as ticket_number,
      eo.order_status as status,
      eo.buyer_name,
      eo.buyer_city
    FROM expanded_orders eo
    
    UNION ALL
    
    -- Available tickets that match the search
    SELECT 
      gs.n as ticket_index,
      format_virtual_ticket(v_numbering_config, gs.n, v_total_tickets) as ticket_number,
      'available'::TEXT as status,
      NULL::TEXT as buyer_name,
      NULL::TEXT as buyer_city
    FROM generate_series(1, v_total_tickets) gs(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM expanded_orders eo WHERE eo.idx = gs.n
    )
  )
  SELECT 
    ft.ticket_index,
    ft.ticket_number,
    ft.status,
    ft.buyer_name,
    ft.buyer_city
  FROM formatted_tickets ft
  WHERE ft.ticket_number ILIKE '%' || p_search || '%'
     OR ft.buyer_name ILIKE '%' || p_search || '%'
     OR ft.buyer_city ILIKE '%' || p_search || '%'
  ORDER BY ft.ticket_index
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to anon and authenticated
GRANT EXECUTE ON FUNCTION public.search_public_tickets TO anon, authenticated;

-- Function: set_primary_domain
-- Atomically sets a domain as primary for an organization
CREATE OR REPLACE FUNCTION public.set_primary_domain(
  p_domain_id UUID,
  p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has access to this organization
  IF NOT has_org_access(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Unset all primary domains for this organization
  UPDATE custom_domains
  SET is_primary = false, updated_at = now()
  WHERE organization_id = p_organization_id
    AND is_primary = true;

  -- Set the specified domain as primary
  UPDATE custom_domains
  SET is_primary = true, updated_at = now()
  WHERE id = p_domain_id
    AND organization_id = p_organization_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_primary_domain TO authenticated;