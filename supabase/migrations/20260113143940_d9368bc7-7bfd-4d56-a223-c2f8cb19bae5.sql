-- =====================================================
-- FASE 1: Seguridad Crítica - Restricción RLS de Orders
-- =====================================================

-- Drop existing functions that need signature changes
DROP FUNCTION IF EXISTS search_public_tickets(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS get_virtual_tickets_optimized(UUID, INT, INT);

-- 1. Crear vista pública SIN datos personales para consulta de estado de boletos
CREATE OR REPLACE VIEW public_ticket_status AS
SELECT 
  id,
  raffle_id,
  organization_id,
  ticket_ranges,
  lucky_indices,
  ticket_count,
  status,
  reserved_until,
  created_at
FROM orders
WHERE status IN ('sold', 'reserved', 'pending');

COMMENT ON VIEW public_ticket_status IS 'Vista pública segura que expone solo estado de boletos sin datos personales';

-- 2. Función RPC segura para que compradores accedan a SU orden por referencia
CREATE OR REPLACE FUNCTION get_secure_order_by_reference(p_reference_code TEXT)
RETURNS TABLE (
  id UUID,
  raffle_id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  ticket_ranges JSONB,
  lucky_indices INTEGER[],
  ticket_count INTEGER,
  status TEXT,
  reference_code TEXT,
  reserved_until TIMESTAMPTZ,
  order_total NUMERIC,
  payment_method TEXT,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id, o.raffle_id, o.buyer_name, o.buyer_email, o.buyer_phone, o.buyer_city,
    o.ticket_ranges, o.lucky_indices, o.ticket_count, o.status, o.reference_code,
    o.reserved_until, o.order_total, o.payment_method, o.payment_proof_url,
    o.created_at, o.sold_at
  FROM orders o
  WHERE o.reference_code = p_reference_code
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_secure_order_by_reference IS 'Función segura - acceso a orden solo con código de referencia';

-- 3. Función optimizada para boletos virtuales paginados
CREATE OR REPLACE FUNCTION get_virtual_tickets_optimized(
  p_raffle_id UUID,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 100
)
RETURNS TABLE (
  ticket_index INTEGER,
  ticket_number TEXT,
  status TEXT,
  buyer_name TEXT,
  order_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_page_size;
  v_total INT;
  v_numbering JSONB;
  v_start_num INT;
  v_padding INT;
  v_prefix TEXT;
  v_suffix TEXT;
BEGIN
  SELECT r.total_tickets, r.numbering_config INTO v_total, v_numbering
  FROM raffles r WHERE r.id = p_raffle_id;
  
  IF v_total IS NULL THEN RETURN; END IF;
  
  v_start_num := COALESCE((v_numbering->>'start_number')::INT, 1);
  v_padding := COALESCE((v_numbering->>'padding')::INT, 0);
  v_prefix := COALESCE(v_numbering->>'prefix', '');
  v_suffix := COALESCE(v_numbering->>'suffix', '');

  RETURN QUERY
  WITH page_indices AS (
    SELECT gs AS idx FROM generate_series(v_offset, LEAST(v_offset + p_page_size - 1, v_total - 1)) gs
  ),
  sold_data AS (
    SELECT 
      unnest(CASE 
        WHEN o.lucky_indices IS NOT NULL AND array_length(o.lucky_indices, 1) > 0 THEN o.lucky_indices
        ELSE ARRAY(SELECT generate_series((r->>'s')::INT, (r->>'e')::INT) FROM jsonb_array_elements(o.ticket_ranges) r)
      END) AS idx,
      o.id AS oid, o.buyer_name AS bname, o.status AS ostatus
    FROM orders o
    WHERE o.raffle_id = p_raffle_id AND o.status IN ('sold', 'reserved', 'pending')
      AND (o.status != 'reserved' OR o.reserved_until > NOW())
  )
  SELECT 
    pi.idx::INTEGER,
    v_prefix || CASE WHEN v_padding > 0 THEN LPAD((pi.idx + v_start_num)::TEXT, v_padding, '0') ELSE (pi.idx + v_start_num)::TEXT END || v_suffix,
    COALESCE(sd.ostatus, 'available')::TEXT,
    sd.bname,
    sd.oid
  FROM page_indices pi
  LEFT JOIN sold_data sd ON sd.idx = pi.idx
  ORDER BY pi.idx;
END;
$$;

-- 4. Función de búsqueda pública segura (sin datos sensibles)
CREATE OR REPLACE FUNCTION search_public_tickets(
  p_raffle_id UUID,
  p_search TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  ticket_index INTEGER,
  ticket_number TEXT,
  status TEXT,
  buyer_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numbering JSONB;
  v_start_num INT;
  v_padding INT;
  v_prefix TEXT;
  v_suffix TEXT;
  v_search_num INT;
BEGIN
  SELECT r.numbering_config INTO v_numbering FROM raffles r WHERE r.id = p_raffle_id;
  v_start_num := COALESCE((v_numbering->>'start_number')::INT, 1);
  v_padding := COALESCE((v_numbering->>'padding')::INT, 0);
  v_prefix := COALESCE(v_numbering->>'prefix', '');
  v_suffix := COALESCE(v_numbering->>'suffix', '');
  
  v_search_num := NULLIF(regexp_replace(p_search, '[^0-9]', '', 'g'), '')::INT;
  
  RETURN QUERY
  WITH sold_data AS (
    SELECT unnest(o.lucky_indices) AS idx, o.buyer_name AS bname, o.status AS ostatus
    FROM orders o
    WHERE o.raffle_id = p_raffle_id AND o.status IN ('sold', 'reserved', 'pending')
      AND (v_search_num IS NULL OR TRUE) -- Process all, filter below
      AND (v_search_num IS NOT NULL OR o.buyer_name ILIKE '%' || p_search || '%')
  )
  SELECT 
    sd.idx::INTEGER,
    v_prefix || CASE WHEN v_padding > 0 THEN LPAD((sd.idx + v_start_num)::TEXT, v_padding, '0') ELSE (sd.idx + v_start_num)::TEXT END || v_suffix,
    sd.ostatus::TEXT,
    sd.bname
  FROM sold_data sd
  WHERE v_search_num IS NULL 
     OR (sd.idx + v_start_num) = v_search_num
     OR (sd.idx + v_start_num)::TEXT LIKE '%' || v_search_num::TEXT || '%'
  ORDER BY sd.idx
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION search_public_tickets IS 'Búsqueda segura - NO expone email, teléfono ni datos de pago';

-- 5. Grant permissions
GRANT SELECT ON public_ticket_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_secure_order_by_reference TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_virtual_tickets_optimized TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_public_tickets TO anon, authenticated;