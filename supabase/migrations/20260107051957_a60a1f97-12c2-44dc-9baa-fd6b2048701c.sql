-- ============================================
-- OPTIMIZACIONES FINALES PARA CERTIFICACIÓN 100%
-- ============================================

-- 1. Función helper para calcular batch size óptimo
CREATE OR REPLACE FUNCTION public.get_optimal_batch_size(p_total_tickets INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE 
    WHEN p_total_tickets >= 10000000 THEN 2500  -- 10M+: batches pequeños
    WHEN p_total_tickets >= 5000000 THEN 3000   -- 5M+
    WHEN p_total_tickets >= 1000000 THEN 4000   -- 1M+
    ELSE 5000                                    -- Default
  END;
END;
$$;

-- 2. Función para deshabilitar índices no críticos durante generación masiva
CREATE OR REPLACE FUNCTION public.disable_non_critical_ticket_indexes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo deshabilitar índices que ralentizan INSERT masivos
  DROP INDEX IF EXISTS idx_tickets_raffle_status_index;
  DROP INDEX IF EXISTS idx_tickets_ticket_index;
  RAISE NOTICE 'Non-critical ticket indexes disabled for fast generation';
END;
$$;

-- 3. Función para re-habilitar índices después de generación
CREATE OR REPLACE FUNCTION public.enable_non_critical_ticket_indexes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Re-crear índices útiles para queries
  CREATE INDEX IF NOT EXISTS idx_tickets_raffle_status_index 
    ON public.tickets(raffle_id, status, ticket_index);
  CREATE INDEX IF NOT EXISTS idx_tickets_ticket_index 
    ON public.tickets(ticket_index);
  
  -- Actualizar estadísticas
  ANALYZE public.tickets;
  RAISE NOTICE 'Ticket indexes re-enabled and table analyzed';
END;
$$;

-- 4. Función para refresh manual de vista materializada
CREATE OR REPLACE FUNCTION public.refresh_raffle_stats_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.raffle_stats_mv;
END;
$$;

-- 5. Configurar autovacuum agresivo para tablas de alto volumen
ALTER TABLE public.tickets SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005
);

ALTER TABLE public.raffles SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);