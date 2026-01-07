-- ===========================================
-- FASE 1: Escalabilidad - archived_at, FTS, Índices críticos
-- ===========================================

-- 1. Agregar columna archived_at a raffles para soft delete
ALTER TABLE public.raffles 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Agregar columna search_vector para Full-Text Search
ALTER TABLE public.raffles 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector('spanish', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' ||
    COALESCE(prize_name, '')
  )
) STORED;

-- 3. Índice GIN para búsqueda Full-Text
CREATE INDEX IF NOT EXISTS idx_raffles_fts 
ON public.raffles USING GIN(search_vector);

-- 4. Índice para rifas activas sin archivar (dashboard, listados públicos)
CREATE INDEX IF NOT EXISTS idx_raffles_active_not_archived 
ON public.raffles(organization_id, status, created_at DESC)
WHERE archived_at IS NULL;

-- 5. Índice para rifas próximas a sortear
CREATE INDEX IF NOT EXISTS idx_raffles_upcoming_draws 
ON public.raffles(draw_date)
WHERE status = 'active' AND archived_at IS NULL;

-- 6. Índice covering para tickets disponibles (evita table lookup)
CREATE INDEX IF NOT EXISTS idx_tickets_available_covering 
ON public.tickets(raffle_id, status) 
INCLUDE (ticket_number, buyer_name, buyer_email)
WHERE status = 'available';

-- 7. Índice para cleanup de reservaciones expiradas
CREATE INDEX IF NOT EXISTS idx_tickets_expired_reservations 
ON public.tickets(reserved_until)
WHERE status = 'reserved' AND reserved_until IS NOT NULL;

-- 8. Índice para búsqueda de boletos por comprador
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_lookup 
ON public.tickets(buyer_email, raffle_id, status)
WHERE buyer_email IS NOT NULL;

-- 9. Eliminar índices duplicados/sin uso detectados en auditoría
DROP INDEX IF EXISTS idx_tickets_available_partial;
DROP INDEX IF EXISTS idx_tickets_raffle_ticket_index;

-- 10. Crear vista materializada para stats de rifas (CRÍTICO para escalabilidad)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.raffle_stats_mv AS
SELECT 
  r.id as raffle_id,
  r.organization_id,
  r.status,
  r.ticket_price,
  COUNT(t.id) FILTER (WHERE t.status = 'sold') as sold_count,
  COUNT(t.id) FILTER (WHERE t.status = 'reserved') as reserved_count,
  COUNT(t.id) FILTER (WHERE t.status = 'available') as available_count,
  COUNT(t.id) FILTER (WHERE t.status = 'canceled') as canceled_count,
  COUNT(t.id) as total_tickets_in_db,
  COALESCE(SUM(t.order_total) FILTER (WHERE t.status = 'sold' AND t.order_total IS NOT NULL), 0) as revenue_from_orders,
  COUNT(DISTINCT t.buyer_email) FILTER (WHERE t.buyer_email IS NOT NULL AND t.status = 'sold') as unique_buyers,
  MAX(t.sold_at) FILTER (WHERE t.status = 'sold') as last_sale_at,
  NOW() as refreshed_at
FROM public.raffles r
LEFT JOIN public.tickets t ON r.id = t.raffle_id
WHERE r.archived_at IS NULL
GROUP BY r.id, r.organization_id, r.status, r.ticket_price;

-- 11. Índices en la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_raffle_stats_mv_pk 
ON public.raffle_stats_mv(raffle_id);

CREATE INDEX IF NOT EXISTS idx_raffle_stats_mv_org 
ON public.raffle_stats_mv(organization_id, status);

-- 12. Función RPC para obtener stats del dashboard (evita query pesado)
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_organization_id UUID)
RETURNS TABLE(
  active_raffles BIGINT,
  total_revenue NUMERIC,
  tickets_sold BIGINT,
  total_tickets BIGINT,
  pending_approvals BIGINT,
  conversion_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE rs.status = 'active') as active_raffles,
    COALESCE(SUM(rs.revenue_from_orders + (rs.sold_count * rs.ticket_price) - rs.revenue_from_orders), 0) as total_revenue,
    COALESCE(SUM(rs.sold_count), 0) as tickets_sold,
    COALESCE(SUM(rs.total_tickets_in_db), 0) as total_tickets,
    COALESCE(SUM(rs.reserved_count), 0) as pending_approvals,
    CASE 
      WHEN SUM(rs.total_tickets_in_db) > 0 
      THEN ROUND((SUM(rs.sold_count)::NUMERIC / SUM(rs.total_tickets_in_db)) * 100, 1)
      ELSE 0 
    END as conversion_rate
  FROM public.raffle_stats_mv rs
  WHERE rs.organization_id = p_organization_id
    AND rs.status IN ('active', 'paused');
END;
$$;

-- 13. Función RPC para obtener stats por rifa individual
CREATE OR REPLACE FUNCTION public.get_raffle_stats_list(p_organization_id UUID)
RETURNS TABLE(
  raffle_id UUID,
  sold_count BIGINT,
  reserved_count BIGINT,
  available_count BIGINT,
  revenue NUMERIC,
  unique_buyers BIGINT,
  last_sale_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.raffle_id,
    rs.sold_count,
    rs.reserved_count,
    rs.available_count,
    rs.revenue_from_orders + (rs.sold_count * rs.ticket_price) - rs.revenue_from_orders as revenue,
    rs.unique_buyers,
    rs.last_sale_at
  FROM public.raffle_stats_mv rs
  WHERE rs.organization_id = p_organization_id
    AND rs.status IN ('active', 'paused');
END;
$$;

-- 14. Función para archivar rifas antiguas
CREATE OR REPLACE FUNCTION public.archive_old_raffles(days_old INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE public.raffles
  SET archived_at = NOW()
  WHERE status IN ('completed', 'canceled')
    AND draw_date < NOW() - (days_old || ' days')::INTERVAL
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- 15. Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION public.refresh_raffle_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.raffle_stats_mv;
END;
$$;

-- 16. Grant permisos
GRANT SELECT ON public.raffle_stats_mv TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_raffle_stats_list(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_raffle_stats() TO authenticated;