import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";

// Centralized Vercel IPs for DNS verification display
export const VERCEL_IPS = ['76.76.21.21', '76.76.21.164', '76.76.21.241'];
export const VERCEL_CNAMES = ['cname.vercel-dns.com'];

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

// Helper function for fire-and-forget audit logging
const logAuditEvent = async (params: {
  p_action: string;
  p_resource_type: string;
  p_resource_id: string;
  p_resource_name: string;
  p_organization_id: string;
  p_changes?: Record<string, unknown>;
  p_metadata?: Record<string, unknown>;
}) => {
  try {
    await supabase.rpc('log_audit_event', {
      p_action: params.p_action,
      p_resource_type: params.p_resource_type,
      p_resource_id: params.p_resource_id,
      p_resource_name: params.p_resource_name,
      p_organization_id: params.p_organization_id,
      p_changes: params.p_changes ?? null,
      p_metadata: params.p_metadata ?? null,
    } as any);
  } catch (err) {
    console.warn('[audit] Log failed:', err);
  }
};

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

  // Lista de subdominios reservados para mostrar advertencia
  const RESERVED_SUBDOMAINS = ['www', 'api', 'app', 'admin', 'mail', 'ftp', 'cdn', 'static', 'assets', 'media'];

  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      if (!organization?.id) throw new Error("No organization");

      // Validar que el plan permite custom domains
      const tier = (organization.subscription_tier || 'basic') as SubscriptionTier;
      const limits = getSubscriptionLimits(tier);
      if (!limits.canHaveCustomDomains) {
        throw new Error("Los dominios personalizados requieren Plan Pro o superior");
      }

      // Validar límite de dominios por tier
      const currentDomainCount = domains.length;
      if (currentDomainCount >= limits.maxCustomDomains) {
        throw new Error(`Has alcanzado el límite de ${limits.maxCustomDomains} dominios para tu plan. Actualiza para agregar más.`);
      }

      const normalizedDomain = domain.toLowerCase().trim();
      
      // Validar formato del dominio
      const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(normalizedDomain)) {
        throw new Error("Formato de dominio inválido. Ejemplo: midominio.com");
      }
      
      // Validar longitud máxima (253 caracteres según RFC)
      if (normalizedDomain.length > 253) {
        throw new Error("El dominio es demasiado largo (máximo 253 caracteres)");
      }

      // Detectar si es un subdominio reservado y advertir
      const parts = normalizedDomain.split('.');
      if (parts.length > 2) {
        const subdomain = parts[0];
        if (RESERVED_SUBDOMAINS.includes(subdomain)) {
          // No bloqueamos, solo es info para el toast
          console.info(`[addDomain] Adding reserved subdomain: ${subdomain}`);
        }
      }
      
      // Step 1: Register domain in Vercel FIRST
      const { data: vercelResult, error: vercelError } = await supabase.functions.invoke(
        'add-vercel-domain',
        { body: { domain: normalizedDomain } }
      );

      if (vercelError) {
        throw new Error("Error de conexión con el servidor");
      }

      if (!vercelResult?.success) {
        // Mapear errores de Vercel a mensajes user-friendly
        const errorDetail = vercelResult?.error || '';
        if (errorDetail.includes('already') || errorDetail.includes('exists')) {
          throw new Error("Este dominio ya está registrado en otro proyecto");
        } else if (errorDetail.includes('invalid') || errorDetail.includes('format')) {
          throw new Error("El formato del dominio no es válido");
        } else if (errorDetail.includes('rate') || errorDetail.includes('limit')) {
          throw new Error("Demasiadas solicitudes. Intenta en unos minutos.");
        }
        throw new Error("Error al registrar el dominio. Intenta de nuevo.");
      }

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
        await supabase.functions.invoke('remove-vercel-domain', {
          body: { domain: normalizedDomain }
        });
        
        if (dbError.code === "23505") {
          throw new Error("Este dominio ya está registrado");
        }
        throw new Error("Error al guardar el dominio");
      }

      // Log audit event for domain addition (fire and forget)
      logAuditEvent({
        p_action: 'create',
        p_resource_type: 'custom_domain',
        p_resource_id: data.id,
        p_resource_name: normalizedDomain,
        p_organization_id: organization.id,
        p_changes: { domain: normalizedDomain },
        p_metadata: { tier, is_reserved_subdomain: parts.length > 2 && RESERVED_SUBDOMAINS.includes(parts[0]) }
      });

      return { data, isReservedSubdomain: parts.length > 2 && RESERVED_SUBDOMAINS.includes(parts[0]) };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      if (result.isReservedSubdomain) {
        toast.success("Subdominio agregado. Considera también configurar el dominio raíz.", { duration: 5000 });
      } else {
        toast.success("Dominio agregado. Configura los registros DNS para verificarlo.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al agregar dominio");
    },
  });

  const removeDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const domainToDelete = domains.find(d => d.id === domainId);
      
      if (domainToDelete) {
        // Remove from Vercel first (continue even if fails)
        await supabase.functions.invoke('remove-vercel-domain', {
          body: { domain: domainToDelete.domain }
        }).catch(() => { /* Domain might not exist in Vercel */ });
      }

      // Delete from Supabase
      const { error } = await supabase
        .from("custom_domains")
        .delete()
        .eq("id", domainId);

      if (error) throw error;

      // Log audit event for domain removal (fire and forget)
      if (domainToDelete && organization?.id) {
        logAuditEvent({
          p_action: 'delete',
          p_resource_type: 'custom_domain',
          p_resource_id: domainId,
          p_resource_name: domainToDelete.domain,
          p_organization_id: organization.id,
          p_changes: { domain: domainToDelete.domain, was_primary: domainToDelete.is_primary }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-domains"] });
      toast.success("Dominio eliminado");
    },
    onError: () => {
      toast.error("Error al eliminar dominio");
    },
  });

  const setPrimaryDomain = useMutation({
    mutationFn: async (domainId: string) => {
      if (!organization?.id) throw new Error("No organization");
      
      const domainToSetPrimary = domains.find(d => d.id === domainId);

      // Use atomic RPC function to set primary domain
      const { error } = await supabase.rpc('set_primary_domain', {
        p_domain_id: domainId,
        p_organization_id: organization.id
      });

      if (error) throw error;

      // Log audit event for setting primary domain (fire and forget)
      if (domainToSetPrimary) {
        logAuditEvent({
          p_action: 'update',
          p_resource_type: 'custom_domain',
          p_resource_id: domainId,
          p_resource_name: domainToSetPrimary.domain,
          p_organization_id: organization.id,
          p_changes: { is_primary: true },
          p_metadata: { previous_primary: domains.find(d => d.is_primary)?.domain }
        });
      }
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

      // Log audit event for domain verification (fire and forget)
      if (organization?.id) {
        logAuditEvent({
          p_action: 'update',
          p_resource_type: 'custom_domain',
          p_resource_id: domainId,
          p_resource_name: domain.domain,
          p_organization_id: organization.id,
          p_changes: { verified: true, ssl_status: 'active' },
          p_metadata: { verified_at: new Date().toISOString() }
        });
      }

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

  const diagnoseVercel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('diagnose-vercel-access');
      
      if (error) {
        throw new Error('Error al ejecutar diagnóstico');
      }
      
      return data;
    },
    onSuccess: (result) => {
      if (result?.diagnosis?.recommendation) {
        toast.success("Diagnóstico completado");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
    diagnoseVercel,
  };
}
