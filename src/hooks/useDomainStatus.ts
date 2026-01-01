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

export function useDomainStatus() {
  const queryClient = useQueryClient();

  // Fetch Vercel domains
  const vercelDomainsQuery = useQuery({
    queryKey: ['vercel-domains'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-vercel-domains');
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.domains as VercelDomain[];
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
