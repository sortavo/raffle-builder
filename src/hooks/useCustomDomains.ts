import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";

export interface CustomDomain {
  id: string;
  organization_id: string;
  domain: string;
  is_primary: boolean;
  verified: boolean;
  verification_token: string;
  verification_method: string;
  ssl_status: string;
  created_at: string;
  verified_at: string | null;
  updated_at: string;
}

export interface DNSDiagnostic {
  aRecords: string[];
  cnameRecords: string[];
  pointsToVercel: boolean;
  currentTarget: string | null;
  expectedTarget: string;
  recordsFound: number;
  propagationComplete: boolean;
}

export interface DNSVerificationResult {
  verified: boolean;
  domain: string;
  diagnostic: DNSDiagnostic;
  error?: string;
}

export function useCustomDomains() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const { data: domains = [], isLoading, error } = useQuery({
    queryKey: ["custom-domains", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("custom_domains")
        .select("*")
        .eq("organization_id", organization.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CustomDomain[];
    },
    enabled: !!organization?.id,
  });

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      if (!organization?.id) throw new Error("No organization");

      // Validar que el plan permite custom domains
      const tier = (organization.subscription_tier || 'basic') as SubscriptionTier;
      const limits = getSubscriptionLimits(tier);
      if (!limits.canHaveCustomDomains) {
        throw new Error("Los dominios personalizados requieren Plan Pro o superior");
      }

      const normalizedDomain = domain.toLowerCase().trim();
      
      // Step 1: Register domain in Vercel FIRST
      console.log('[addDomain] Registering domain in Vercel:', normalizedDomain);
      const { data: vercelResult, error: vercelError } = await supabase.functions.invoke(
        'add-vercel-domain',
        { body: { domain: normalizedDomain } }
      );

      if (vercelError) {
        console.error('[addDomain] Vercel function error:', vercelError);
        throw new Error('Error al conectar con Vercel');
      }

      if (!vercelResult?.success) {
        console.error('[addDomain] Vercel API error:', vercelResult?.error);
        throw new Error(vercelResult?.error || 'Error al registrar dominio en Vercel');
      }

      console.log('[addDomain] Vercel registration successful:', vercelResult.vercelDomain);

      // Step 2: Save to Supabase
      const { data, error: dbError } = await supabase
        .from("custom_domains")
        .insert({
          organization_id: organization.id,
          domain: normalizedDomain,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback: Remove from Vercel if DB save fails
        console.error('[addDomain] DB error, rolling back Vercel:', dbError);
        await supabase.functions.invoke('remove-vercel-domain', {
          body: { domain: normalizedDomain }
        });
        
        if (dbError.code === "23505") {
          throw new Error("Este dominio ya está registrado");
        }
        throw dbError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Dominio agregado a Vercel. Configura los registros DNS para verificarlo.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar dominio");
    },
  });

  const removeDomain = useMutation({
    mutationFn: async (domainId: string) => {
      // Step 1: Get domain name from DB
      const domainToDelete = domains.find(d => d.id === domainId);
      
      if (domainToDelete) {
        // Step 2: Remove from Vercel first
        console.log('[removeDomain] Removing from Vercel:', domainToDelete.domain);
        const { data: vercelResult, error: vercelError } = await supabase.functions.invoke(
          'remove-vercel-domain',
          { body: { domain: domainToDelete.domain } }
        );

        if (vercelError) {
          console.error('[removeDomain] Vercel function error:', vercelError);
          // Continue anyway - domain might not exist in Vercel
        } else if (!vercelResult?.success) {
          console.warn('[removeDomain] Vercel removal warning:', vercelResult?.error);
          // Continue anyway - we still want to delete from DB
        }
      }

      // Step 3: Delete from Supabase
      const { error } = await supabase
        .from("custom_domains")
        .delete()
        .eq("id", domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Dominio eliminado de Vercel y base de datos");
    },
    onError: () => {
      toast.error("Error al eliminar dominio");
    },
  });

  const setPrimaryDomain = useMutation({
    mutationFn: async (domainId: string) => {
      if (!organization?.id) throw new Error("No organization");

      // First, unset all primary domains for this org
      await supabase
        .from("custom_domains")
        .update({ is_primary: false })
        .eq("organization_id", organization.id);

      // Then set the new primary
      const { error } = await supabase
        .from("custom_domains")
        .update({ is_primary: true })
        .eq("id", domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Dominio principal actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar dominio principal");
    },
  });

  const verifyDomain = useMutation({
    mutationFn: async (domainId: string): Promise<DNSVerificationResult> => {
      // Get domain from DB
      const domain = domains.find(d => d.id === domainId);
      if (!domain) throw new Error("Dominio no encontrado");

      // Call edge function for real DNS verification
      const { data, error: fnError } = await supabase.functions.invoke('verify-dns', {
        body: { domain: domain.domain }
      });

      if (fnError) {
        console.error('[verifyDomain] Edge function error:', fnError);
        throw new Error('Error al verificar DNS');
      }

      const result = data as DNSVerificationResult;

      if (!result.verified) {
        // Create detailed error for UI to show diagnostic
        const error = new Error(
          `DNS no apunta a Vercel. Actual: ${result.diagnostic.currentTarget || 'No resuelve'}`
        );
        (error as any).diagnostic = result.diagnostic;
        (error as any).domain = result.domain;
        throw error;
      }

      // If verified, update DB
      const { error: updateError } = await supabase
        .from("custom_domains")
        .update({ 
          verified: true, 
          verified_at: new Date().toISOString(),
          ssl_status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", domainId);

      if (updateError) throw updateError;

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success(`✅ ${result.domain} verificado y activo`);
    },
    onError: (error: any) => {
      // Don't show toast here - let UI handle it with diagnostic modal
      console.error('[verifyDomain] Verification failed:', error.message);
    },
  });

  return {
    domains,
    isLoading,
    error,
    addDomain,
    removeDomain,
    setPrimaryDomain,
    verifyDomain,
  };
}
