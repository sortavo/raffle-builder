-- Función optimizada para verificar disponibilidad de un ticket específico
-- Usa los índices GIN creados en Fase 1 para búsqueda O(log n)
CREATE OR REPLACE FUNCTION check_ticket_availability(
  p_raffle_id UUID,
  p_ticket_index INTEGER
)
RETURNS TABLE (
  order_id UUID,
  status TEXT,
  buyer_name TEXT,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Buscar si el ticket está en alguna orden activa
  RETURN QUERY
  SELECT 
    o.id AS order_id,
    o.status::TEXT,
    o.buyer_name,
    FALSE AS is_available
  FROM orders o
  WHERE o.raffle_id = p_raffle_id
    AND o.status IN ('reserved', 'pending', 'sold')
    AND (
      -- Ignorar reservaciones expiradas
      o.status != 'reserved' OR o.reserved_until > NOW()
    )
    AND (
      -- Buscar en ticket_ranges usando índice GIN
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(o.ticket_ranges) AS r
        WHERE (r->>'s')::INT <= p_ticket_index 
          AND (r->>'e')::INT >= p_ticket_index
      )
      OR
      -- Buscar en lucky_indices usando índice GIN
      p_ticket_index = ANY(o.lucky_indices)
    )
  LIMIT 1;
  
  -- Si no encontró nada, el ticket está disponible
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID AS order_id,
      'available'::TEXT AS status,
      NULL::TEXT AS buyer_name,
      TRUE AS is_available;
  END IF;
END;
$$;