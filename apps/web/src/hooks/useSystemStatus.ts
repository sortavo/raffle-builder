import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ServiceStatus = 'operational' | 'degraded' | 'outage';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTime: number;
  message?: string;
  lastChecked: string;
}

export interface SystemHealth {
  status: ServiceStatus;
  services: ServiceHealth[];
  checkedAt: string;
}

interface UseSystemStatusOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useSystemStatus(options: UseSystemStatusOptions = {}) {
  const { autoRefresh = true, refreshInterval = 60000 } = options;
  
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = useCallback(async () => {
    try {
      setError(null);
      
      const { data, error: fnError } = await supabase.functions.invoke('health-check');
      
      if (fnError) {
        throw new Error(fnError.message);
      }
      
      setHealth(data as SystemHealth);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[useSystemStatus] Error fetching health:', err);
      setError(err instanceof Error ? err.message : 'Error al obtener estado del sistema');
      
      // If we can't reach the health check, assume major outage
      setHealth({
        status: 'outage',
        services: [],
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchHealth();
  }, [fetchHealth]);

  // Initial fetch
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHealth]);

  return {
    health,
    isLoading,
    error,
    lastRefresh,
    refresh,
    overallStatus: health?.status ?? 'operational',
    services: health?.services ?? [],
  };
}
