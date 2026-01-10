import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VercelDomain {
  name: string;
  apexName: string;
  verified: boolean;
  redirect?: string | null;
  redirectStatusCode?: number | null;
}

export interface CustomDomain {
  id: string;
  domain: string;
  organization_id: string;
  verified: boolean;
  ssl_status: string | null;
  is_primary: boolean;
  organization_name?: string;
}

export interface DomainCheckResult {
  domain: string;
  status: 'online' | 'slow' | 'offline' | 'error';
  latency: number | null;
  statusCode: number | null;
  error?: string;
}

export interface DomainCheckResponse {
  success: boolean;
  results: DomainCheckResult[];
  summary: {
    online: number;
    slow: number;
    offline: number;
    total: number;
  };
  checkedAt: string;
}

export function useDomainStatus(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  // Fetch Vercel domains
  const vercelDomainsQuery = useQuery({
    queryKey: ['vercel-domains'],
    queryFn: async () => {
      const result = await supabase.functions.invoke('list-vercel-domains');
      const { data, error, response } = result as { 
        data: any; 
        error: any; 
        response?: Response 
      };
      
      // Extract HTTP status from multiple possible locations:
      // 1. response?.status - from the Response object returned by invoke
      // 2. error?.context?.status - FunctionsHttpError stores Response in context
      // 3. error?.status - fallback
      const httpStatus = 
        response?.status || 
        (error as any)?.context?.status || 
        (error as any)?.status;
      
      // Also check error body for status code
      const errorCode = data?.code || (error as any)?.context?.code;
      
      // Detect auth errors by status OR message patterns
      const isAuthError = 
        httpStatus === 401 ||
        errorCode === 401 ||
        error?.message?.includes('401') ||
        error?.message?.includes('Unauthorized') ||
        error?.message?.includes('Authentication required') ||
        error?.message?.includes('Missing authorization') ||
        data?.message?.includes?.('Missing authorization') ||
        data?.message?.includes?.('Authentication required');
      
      if (isAuthError) {
        const authError = new Error('AUTH_ERROR');
        (authError as any).status = 401;
        throw authError;
      }
      
      // Detect forbidden errors
      const isForbiddenError =
        httpStatus === 403 ||
        errorCode === 403 ||
        error?.message?.includes('403') ||
        error?.message?.includes('Forbidden') ||
        error?.message?.includes('platform admin') ||
        data?.message?.includes?.('platform admin');
      
      if (isForbiddenError) {
        const forbiddenError = new Error('FORBIDDEN');
        (forbiddenError as any).status = 403;
        throw forbiddenError;
      }
      
      // Detect server errors
      if (httpStatus >= 500 || error?.message?.includes('non-2xx')) {
        const serverError = new Error('SERVER_ERROR');
        (serverError as any).status = httpStatus || 500;
        (serverError as any).details = error?.message || data?.message || 'Error del servidor';
        throw serverError;
      }
      
      if (error) {
        const genericError = new Error(error.message || 'Error desconocido');
        (genericError as any).status = httpStatus;
        throw genericError;
      }
      
      if (!data?.success) {
        // Check response body for auth errors
        if (data?.error?.includes?.('Authentication') || data?.error?.includes?.('401') || data?.error?.includes?.('Missing authorization')) {
          const authError = new Error('AUTH_ERROR');
          (authError as any).status = 401;
          throw authError;
        }
        if (data?.error?.includes?.('platform admin') || data?.error?.includes?.('403')) {
          const forbiddenError = new Error('FORBIDDEN');
          (forbiddenError as any).status = 403;
          throw forbiddenError;
        }
        throw new Error(data?.error || 'Error desconocido');
      }
      return data.domains as VercelDomain[];
    },
    enabled: options?.enabled !== false,
    retry: (failureCount, error) => {
      // Don't retry on auth/permission errors
      if (error instanceof Error) {
        const msg = error.message;
        const status = (error as any).status;
        if (msg === 'AUTH_ERROR' || msg === 'FORBIDDEN' || status === 401 || status === 403) {
          return false;
        }
      }
      return failureCount < 2;
    },
  });

  // Fetch custom domains from database with organization names
  const customDomainsQuery = useQuery({
    queryKey: ['custom-domains-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_domains')
        .select(`
          id,
          domain,
          organization_id,
          verified,
          ssl_status,
          is_primary,
          organizations!inner(name)
        `)
        .order('domain');

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        domain: d.domain,
        organization_id: d.organization_id,
        verified: d.verified,
        ssl_status: d.ssl_status,
        is_primary: d.is_primary,
        organization_name: d.organizations?.name,
      })) as CustomDomain[];
    },
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message === 'AUTH_ERROR') {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Check domain availability
  const checkDomainsMutation = useMutation({
    mutationFn: async (domains: string[]): Promise<DomainCheckResponse> => {
      const { data, error } = await supabase.functions.invoke('check-domains', {
        body: { domains },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
  });

  // Get all unique domains for checking
  const getAllDomains = () => {
    const domains = new Set<string>();
    
    // Add Vercel domains
    vercelDomainsQuery.data?.forEach(d => {
      if (!d.name.includes('*')) { // Skip wildcard domains
        domains.add(d.name);
      }
    });

    // Add custom domains
    customDomainsQuery.data?.forEach(d => {
      domains.add(d.domain);
    });

    return Array.from(domains);
  };

  const checkAllDomains = () => {
    const domains = getAllDomains();
    if (domains.length > 0) {
      checkDomainsMutation.mutate(domains);
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['vercel-domains'] });
    queryClient.invalidateQueries({ queryKey: ['custom-domains-admin'] });
  };

  return {
    vercelDomains: vercelDomainsQuery.data || [],
    customDomains: customDomainsQuery.data || [],
    isLoadingDomains: vercelDomainsQuery.isLoading || customDomainsQuery.isLoading,
    domainsError: vercelDomainsQuery.error || customDomainsQuery.error,
    checkResults: checkDomainsMutation.data,
    isChecking: checkDomainsMutation.isPending,
    checkAllDomains,
    refresh,
    getAllDomains,
  };
}
