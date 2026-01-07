-- Proteger vista materializada con RLS (solo lectura para miembros de org)
ALTER MATERIALIZED VIEW public.raffle_stats_mv OWNER TO postgres;

-- Revocar acceso anónimo
REVOKE ALL ON public.raffle_stats_mv FROM anon;

-- La vista materializada no soporta RLS directamente, 
-- pero las funciones RPC ya tienen SECURITY DEFINER y filtran por organization_id