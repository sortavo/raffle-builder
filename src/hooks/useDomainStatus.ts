import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createAppError, isAppError } from "@/types/errors";

// Helper to invoke edge functions with explicit Authorization header
async function invokeWithSession(functionName: string, options?: { body?: unknown }) {
  // Get current session explicitly
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  console.log(`[invokeWithSession] ${functionName} - Session exists: ${!!sessionData?.session}, Token exists: ${!!accessToken}`);
  
  if (!accessToken) {
    console.warn(`[invokeWithSession] ${functionName} - No access token available`);
    throw createAppError('AUTH_ERROR', { status: 401, reason: 'no_token' });
  }
  
  // Invoke with explicit Authorization header
  const result = await supabase.functions.invoke(functionName, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  // Safely extract response status
  const response = 'response' in result ? (result.response as Response | undefined) : undefined;
  
  console.log(`[invokeWithSession] ${functionName} - Response:`, {
    hasData: !!result.data,
    hasError: !!result.error,
    errorMessage: result.error?.message,
    responseStatus: response?.status,
    dataCode: result.data?.code,
  });
  
  return { ...result, response };
}

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
  organization_slug?: string;
  subscription_tier?: string | null;
  organization_email?: string;
  in_vercel?: boolean;
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

// Helper to extract HTTP status from various error shapes
function extractHttpStatus(
  response: Response | undefined,
  error: { message?: string; context?: { status?: number; code?: number }; status?: number } | null,
  data: { code?: number } | null
): number | undefined {
  return (
    response?.status ||
    error?.context?.status ||
    error?.status ||
    data?.code ||
    error?.context?.code
  );
}

// Helper to check for auth errors
function isAuthError(
  httpStatus: number | undefined,
  error: { message?: string } | null,
  data: { message?: string; error?: string } | null
): boolean {
  return (
    httpStatus === 401 ||
    error?.message?.includes('401') ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('Authentication required') ||
    error?.message?.includes('Missing authorization') ||
    data?.message?.includes?.('Missing authorization') ||
    data?.message?.includes?.('Authentication required') ||
    data?.error?.includes?.('Authentication') ||
    data?.error?.includes?.('401') ||
    data?.error?.includes?.('authorization') ||
    false
  );
}

// Helper to check for forbidden errors
function isForbiddenError(
  httpStatus: number | undefined,
  error: { message?: string } | null,
  data: { message?: string; error?: string } | null
): boolean {
  return (
    httpStatus === 403 ||
    error?.message?.includes('403') ||
    error?.message?.includes('Forbidden') ||
    error?.message?.includes('platform admin') ||
    data?.message?.includes?.('platform admin') ||
    data?.error?.includes?.('Platform admin') ||
    data?.error?.includes?.('admin') ||
    false
  );
}

export function useDomainStatus(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  // Fetch Vercel domains
  const vercelDomainsQuery = useQuery({
    queryKey: ['vercel-domains'],
    queryFn: async () => {
      const { data, error, response } = await invokeWithSession('list-vercel-domains');
      
      const httpStatus = extractHttpStatus(response, error, data);
      
      // Check for auth errors
      if (isAuthError(httpStatus, error, data)) {
        throw createAppError('AUTH_ERROR', { status: 401 });
      }
      
      // Check for forbidden errors
      if (isForbiddenError(httpStatus, error, data)) {
        throw createAppError('FORBIDDEN', { status: 403 });
      }
      
      // Check for server errors
      if (httpStatus && httpStatus >= 500 || error?.message?.includes('non-2xx')) {
        throw createAppError('SERVER_ERROR', {
          status: httpStatus || 500,
          details: error?.message || data?.message || 'Error del servidor',
        });
      }
      
      if (error) {
        throw createAppError(error.message || 'Error desconocido', { status: httpStatus });
      }
      
      if (!data?.success) {
        // Check response body for auth errors
        if (data?.error?.includes?.('Authentication') || data?.error?.includes?.('401') || data?.error?.includes?.('Missing authorization')) {
          throw createAppError('AUTH_ERROR', { status: 401 });
        }
        if (data?.error?.includes?.('platform admin') || data?.error?.includes?.('403')) {
          throw createAppError('FORBIDDEN', { status: 403 });
        }
        throw new Error(data?.error || 'Error desconocido');
      }
      return data.domains as VercelDomain[];
    },
    enabled: options?.enabled !== false,
    retry: (failureCount, error) => {
      // Don't retry on auth/permission errors
      if (isAppError(error)) {
        const { message, status } = error;
        if (message === 'AUTH_ERROR' || message === 'FORBIDDEN' || status === 401 || status === 403) {
          return false;
        }
      }
      return failureCount < 2;
    },
  });

  // Fetch custom domains (admin-only) via Edge Function (service role) to bypass RLS
  const customDomainsQuery = useQuery({
    queryKey: ['custom-domains-admin'],
    queryFn: async () => {
      const { data, error, response } = await invokeWithSession('admin-list-custom-domains');

      const httpStatus = extractHttpStatus(response, error, data);

      // Check for auth errors
      if (isAuthError(httpStatus, error, data)) {
        throw createAppError('AUTH_ERROR', { status: 401 });
      }

      // Check for forbidden errors
      if (isForbiddenError(httpStatus, error, data)) {
        throw createAppError('FORBIDDEN', { status: 403 });
      }

      // Check for server errors
      if (httpStatus && httpStatus >= 500 || error?.message?.includes('non-2xx')) {
        throw createAppError('SERVER_ERROR', {
          status: httpStatus || 500,
          details: error?.message || data?.error || 'Error del servidor',
        });
      }

      if (error) {
        throw createAppError(error.message || 'Error desconocido', { status: httpStatus });
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido');
      }

      return (data.domains || []) as CustomDomain[];
    },
    enabled: options?.enabled !== false,
    retry: (failureCount, error) => {
      // Don't retry on auth/permission errors
      if (isAppError(error)) {
        const { message, status } = error;
        if (message === 'AUTH_ERROR' || message === 'FORBIDDEN' || status === 401 || status === 403) {
          return false;
        }
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

  // Enrich custom domains with Vercel sync status - wrapped in useMemo for reactivity
  const enrichedCustomDomains = useMemo(() => {
    return (customDomainsQuery.data || []).map(cd => ({
      ...cd,
      in_vercel: vercelDomainsQuery.data?.some(vd => vd.name === cd.domain) || false,
    }));
  }, [customDomainsQuery.data, vercelDomainsQuery.data]);

  // Create a map of Vercel domains to their linked organizations - wrapped in useMemo
  const vercelToOrgMap = useMemo(() => {
    const map = new Map<string, { org_name: string; org_id: string; org_slug?: string }>();
    enrichedCustomDomains.forEach(cd => {
      if (cd.in_vercel && cd.organization_name) {
        map.set(cd.domain, {
          org_name: cd.organization_name,
          org_id: cd.organization_id,
          org_slug: cd.organization_slug,
        });
      }
    });
    return map;
  }, [enrichedCustomDomains]);

  return {
    vercelDomains: vercelDomainsQuery.data || [],
    customDomains: enrichedCustomDomains,
    isLoadingDomains: vercelDomainsQuery.isLoading || customDomainsQuery.isLoading,
    domainsError: vercelDomainsQuery.error || customDomainsQuery.error,
    checkResults: checkDomainsMutation.data,
    isChecking: checkDomainsMutation.isPending,
    checkAllDomains,
    refresh,
    getAllDomains,
    vercelToOrgMap,
  };
}
