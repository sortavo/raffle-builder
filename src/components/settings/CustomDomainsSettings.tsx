import { useState, useEffect, useCallback } from "react";
import { useCustomDomains, CustomDomain, DNSDiagnostic, VERCEL_IPS } from "@/hooks/useCustomDomains";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";
import { UpgradePlanModal } from "@/components/raffle/UpgradePlanModal";
import { TrackingSettings } from "@/components/settings/TrackingSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Copy, 
  ExternalLink,
  Star,
  RefreshCw,
  Info,
  Lock,
  AlertTriangle,
  XCircle,
  Link as LinkIcon,
  Check,
  X,
  Sparkles,
  Loader2,
  Save,
  Wifi,
  WifiOff,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeToSlug, isValidSlug, getOrganizationPublicUrl, isReservedSlug } from "@/lib/url-utils";

// VERCEL_IPS is now imported from useCustomDomains hook

interface DiagnosticModalState {
  domain: string;
  diagnostic: DNSDiagnostic;
}

interface VercelDiagnosisResult {
  configuredSecrets: {
    hasToken: boolean;
    hasProjectId: boolean;
    hasTeamId: boolean;
    projectId: string;
    teamId: string | null;
  };
  tests: {
    projectWithTeam: { status: number; found: boolean; error?: string; projectName?: string };
    projectWithoutTeam: { status: number; found: boolean; error?: string; projectName?: string };
    listWithTeam: { status: number; foundInList: boolean; projectCount: number; error?: string };
    listWithoutTeam: { status: number; foundInList: boolean; projectCount: number; error?: string };
  };
  recommendation: string;
}

// ✅ AJUSTADO: DNSDiagnosticModal con responsive mobile-first
function DNSDiagnosticModal({ 
  data, 
  open, 
  onOpenChange 
}: {
  data: DiagnosticModalState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!data) return null;
  
  const { domain, diagnostic } = data;

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copiado al portapapeles");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ AJUSTADO: max-w responsive */}
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          {/* ✅ AJUSTADO: Typography más compacta */}
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {diagnostic.pointsToVercel ? (
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />
            )}
            <span className="break-all">DNS - {domain}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Información técnica sobre la configuración DNS actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
          <Alert variant={diagnostic.pointsToVercel ? "default" : "destructive"}>
            <AlertTitle className="flex items-center gap-2 text-xs sm:text-sm">
              {diagnostic.pointsToVercel ? '✅ Configurado Correctamente' : '❌ Configuración Incorrecta'}
            </AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              {diagnostic.pointsToVercel 
                ? 'El dominio apunta correctamente a Vercel'
                : 'El dominio NO apunta a Vercel. Revisa la configuración DNS.'}
            </AlertDescription>
          </Alert>

          <div className="grid gap-3 sm:gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-xs sm:text-sm">A Records Encontrados:</h4>
              {diagnostic.aRecords.length > 0 ? (
                <div className="bg-muted p-2 sm:p-3 rounded-lg space-y-1">
                  {diagnostic.aRecords.map((ip: string, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      {/* ✅ AJUSTADO: Code blocks con break-all */}
                      <code className="text-[11px] sm:text-xs break-all" style={{ overflowWrap: 'anywhere' }}>{ip}</code>
                      {VERCEL_IPS.includes(ip) && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0">
                          ✓ Vercel
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">Ninguno encontrado</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-xs sm:text-sm">CNAME Records:</h4>
              {diagnostic.cnameRecords.length > 0 ? (
                <div className="bg-muted p-2 sm:p-3 rounded-lg space-y-1">
                  {diagnostic.cnameRecords.map((cname: string, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      {/* ✅ AJUSTADO: Code blocks con break-all */}
                      <code className="text-[11px] sm:text-xs break-all min-w-0" style={{ overflowWrap: 'anywhere' }}>{cname}</code>
                      {cname.includes('vercel') && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0">
                          ✓ Vercel
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">Ninguno encontrado</p>
              )}
            </div>

            {!diagnostic.pointsToVercel && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs sm:text-sm">Configuración Correcta:</h4>
                <div className="bg-muted p-2 sm:p-3 rounded-lg space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-mono">A</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Host:</span>
                    <span className="font-mono">@</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">76.76.21.21</span>
                      {/* ✅ AJUSTADO: Button con h-9 min-w-[44px] */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-9 w-9 p-0 shrink-0"
                        onClick={() => handleCopy("76.76.21.21")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!diagnostic.propagationComplete && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle className="text-xs sm:text-sm">DNS Aún Propagando</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                Los cambios DNS pueden tardar hasta 48 horas en propagarse completamente.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* ✅ AJUSTADO: Footer responsive con botones h-9 */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            asChild
            className="h-9 text-muted-foreground sm:mr-auto order-last sm:order-first"
          >
            <a href="/contact" target="_blank">
              ¿Necesitas ayuda?
            </a>
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 flex-1 sm:flex-none min-w-[44px]">
              Cerrar
            </Button>
            {!diagnostic.pointsToVercel && (
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText("Tipo: A\nHost: @\nValor: 76.76.21.21");
                  toast.success("Configuración copiada al portapapeles");
                }}
                className="h-9 flex-1 sm:flex-none min-w-[44px]"
              >
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span>Copiar Todo</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ✅ AJUSTADO: VercelDiagnosticModal con responsive mobile-first
function VercelDiagnosticModal({
  data,
  open,
  onOpenChange,
  isPending
}: {
  data: VercelDiagnosisResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
}) {
  const handleCopyDiagnosis = () => {
    if (!data) return;
    const text = `
VERCEL ACCESS DIAGNOSIS
=======================
Secrets Configured:
- Token: ${data.configuredSecrets.hasToken ? '✅' : '❌'}
- Project ID: ${data.configuredSecrets.projectId}
- Team ID: ${data.configuredSecrets.teamId || 'NOT SET'}

Test Results:
- Project with teamId: ${data.tests.projectWithTeam.found ? '✅ Found' : `❌ ${data.tests.projectWithTeam.error}`}
- Project without teamId: ${data.tests.projectWithoutTeam.found ? '✅ Found' : `❌ ${data.tests.projectWithoutTeam.error}`}
- List with teamId: ${data.tests.listWithTeam.foundInList ? '✅' : '❌'} (${data.tests.listWithTeam.projectCount} projects)
- List without teamId: ${data.tests.listWithoutTeam.foundInList ? '✅' : '❌'} (${data.tests.listWithoutTeam.projectCount} projects)

Recommendation: ${data.recommendation}
    `.trim();
    navigator.clipboard.writeText(text);
    toast.success("Diagnóstico copiado al portapapeles");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ AJUSTADO: max-w responsive */}
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          {/* ✅ AJUSTADO: Typography más compacta */}
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
            Diagnóstico Vercel
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Resultados de las pruebas de conectividad con la API de Vercel
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="py-6 sm:py-8 text-center">
            <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-3 sm:mb-4 text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground">Ejecutando diagnóstico...</p>
          </div>
        ) : data ? (
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {/* Secrets Status */}
            <div className="space-y-2">
              <h4 className="font-medium text-xs sm:text-sm">Secrets Configurados:</h4>
              <div className="bg-muted p-2 sm:p-3 rounded-lg space-y-1 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  {data.configuredSecrets.hasToken ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0" />
                  )}
                  <span>VERCEL_API_TOKEN</span>
                </div>
                <div className="flex items-start gap-2">
                  {data.configuredSecrets.hasProjectId ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <span className="min-w-0">
                    PROJECT_ID: <code className="text-[10px] sm:text-xs bg-background px-1 rounded break-all" style={{ overflowWrap: 'anywhere' }}>{data.configuredSecrets.projectId}</code>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  {data.configuredSecrets.hasTeamId ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <span className="min-w-0">
                    TEAM_ID: <code className="text-[10px] sm:text-xs bg-background px-1 rounded break-all" style={{ overflowWrap: 'anywhere' }}>{data.configuredSecrets.teamId || 'NOT SET'}</code>
                  </span>
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              <h4 className="font-medium text-xs sm:text-sm">Pruebas de Acceso:</h4>
              <div className="bg-muted p-2 sm:p-3 rounded-lg space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">GET /projects con teamId</span>
                  {data.tests.projectWithTeam.found ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0">
                      ✅ OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0">
                      ❌ {data.tests.projectWithTeam.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">GET /projects sin teamId</span>
                  {data.tests.projectWithoutTeam.found ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0">
                      ✅ OK
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0">
                      ❌ {data.tests.projectWithoutTeam.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">Lista con teamId</span>
                  <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0">
                    {data.tests.listWithTeam.projectCount} proyectos
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">Lista sin teamId</span>
                  <span className="text-muted-foreground text-[10px] sm:text-xs shrink-0">
                    {data.tests.listWithoutTeam.projectCount} proyectos
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <Alert variant={data.recommendation.includes('✅') ? 'default' : 'destructive'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs sm:text-sm">Recomendación</AlertTitle>
              <AlertDescription className="mt-2 whitespace-pre-wrap text-xs sm:text-sm">
                {data.recommendation}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>Haz clic en "Diagnosticar" para iniciar el diagnóstico</p>
          </div>
        )}

        {/* ✅ AJUSTADO: Footer responsive con botones h-9 */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {data && (
            <Button variant="outline" onClick={handleCopyDiagnosis} className="h-9 sm:mr-auto min-w-[44px] order-last sm:order-first">
              <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
              <span>Copiar</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 min-w-[44px]">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomDomainsSettings() {
  const { 
    domains, 
    isLoading, 
    addDomain, 
    removeDomain, 
    setPrimaryDomain,
    verifyDomain,
    diagnoseVercel
  } = useCustomDomains();
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  
  // Slug state
  const [slugInput, setSlugInput] = useState("");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDnsDialog, setShowDnsDialog] = useState<CustomDomain | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomDomain | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [debouncedDomain, setDebouncedDomain] = useState("");
  const [vercelDiagnosisModal, setVercelDiagnosisModal] = useState(false);

  // Debounce domain input for validation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDomain(newDomain);
    }, 300);
    return () => clearTimeout(timer);
  }, [newDomain]);
  const [vercelDiagnosisData, setVercelDiagnosisData] = useState<VercelDiagnosisResult | null>(null);
  const [diagnosticModal, setDiagnosticModal] = useState<DiagnosticModalState | null>(null);

  // Check if organization has tracking configured (use type assertion for tracking fields)
  const orgWithTracking = organization as typeof organization & {
    tracking_enabled?: boolean;
    tracking_gtm_id?: string | null;
    tracking_meta_pixel_id?: string | null;
    tracking_ga4_id?: string | null;
    tracking_tiktok_pixel_id?: string | null;
  };
  const hasTrackingConfigured = Boolean(
    orgWithTracking?.tracking_enabled && (
      orgWithTracking?.tracking_gtm_id ||
      orgWithTracking?.tracking_meta_pixel_id ||
      orgWithTracking?.tracking_ga4_id ||
      orgWithTracking?.tracking_tiktok_pixel_id
    )
  );

  // Determinar si el plan permite custom domains
  const tier = (organization?.subscription_tier || 'basic') as SubscriptionTier;
  const limits = getSubscriptionLimits(tier);
  const canHaveCustomDomains = limits.canHaveCustomDomains;
  
  const suggestedSlug = organization?.name ? normalizeToSlug(organization.name) : "";
  const hasExistingSlug = Boolean(organization?.slug);
  const isChangingSlug = hasExistingSlug && slugInput !== organization?.slug;

  // Sync slugInput with organization.slug when it loads
  useEffect(() => {
    if (organization?.slug && !slugInput) {
      setSlugInput(organization.slug);
    }
  }, [organization?.slug]);

  // Check slug availability with debounce
  useEffect(() => {
    setSlugError(null);
    
    if (!slugInput || slugInput === organization?.slug) {
      setSlugAvailable(null);
      return;
    }

    if (!isValidSlug(slugInput)) {
      setSlugAvailable(false);
      setSlugError("Solo letras minúsculas, números y guiones");
      return;
    }
    
    if (isReservedSlug(slugInput)) {
      setSlugAvailable(false);
      setSlugError("Este nombre está reservado por el sistema");
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", slugInput)
          .maybeSingle();

        if (error) {
          console.error("Error checking slug:", error);
          setSlugAvailable(null);
        } else {
          setSlugAvailable(!data);
          if (data) {
            setSlugError("Este slug ya está en uso");
          }
        }
      } catch (err) {
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slugInput, organization?.slug]);

  const handleSaveSlug = async () => {
    if (!organization?.id) return;
    
    if (slugInput && !isValidSlug(slugInput)) {
      toast.error("El slug solo puede contener letras minúsculas, números y guiones");
      return;
    }
    
    if (slugInput && isReservedSlug(slugInput)) {
      toast.error("Este nombre está reservado por el sistema");
      return;
    }

    if (slugInput && slugAvailable === false) {
      toast.error(slugError || "Este slug ya está en uso");
      return;
    }

    setIsSavingSlug(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ slug: slugInput || null })
        .eq("id", organization.id);

      if (error) throw error;

      toast.success("URL pública actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    } catch (error: any) {
      if (error.message?.includes("duplicate key")) {
        toast.error("Este slug ya está en uso por otra organización");
      } else {
        toast.error("Error al actualizar: " + error.message);
      }
    } finally {
      setIsSavingSlug(false);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada al portapapeles");
    } catch {
      toast.error("Error al copiar la URL");
    }
  };

  const applySuggestedSlug = () => {
    if (suggestedSlug) {
      setSlugInput(suggestedSlug);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    
    await addDomain.mutateAsync(newDomain);
    setNewDomain("");
    setShowAddDialog(false);
  };

  const handleRunVercelDiagnosis = async () => {
    setVercelDiagnosisModal(true);
    setVercelDiagnosisData(null);
    const result = await diagnoseVercel.mutateAsync();
    if (result?.diagnosis) {
      setVercelDiagnosisData(result.diagnosis);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      await verifyDomain.mutateAsync(domainId);
    } catch (error: any) {
      // Show toast first with user-friendly message
      toast.error("⚠️ Configuración DNS incorrecta", {
        description: "Revisa los detalles para corregir",
        duration: 4000
      });
      
      // Then show diagnostic modal if we have diagnostic data
      if (error.diagnostic && error.domain) {
        setDiagnosticModal({
          domain: error.domain,
          diagnostic: error.diagnostic
        });
      }
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copiado al portapapeles");
  };

  const handleCopyRecord = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Registro copiado");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
            Dominios Personalizados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          <div className="animate-pulse space-y-3 sm:space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ✅ AJUSTADO: Card "URL Pública" con responsive mobile-first */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="p-3 sm:p-4 lg:p-6 pb-3 sm:pb-4">
          {/* ✅ AJUSTADO: Header con flex-col en mobile */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* ✅ AJUSTADO: Typography más compacta */}
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                URL Pública de la Organización
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configura una URL personalizada para tu página de sorteos
              </CardDescription>
            </div>
            {hasExistingSlug && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0 self-start sm:self-center">
                <Check className="h-3 w-3 mr-1" />
                Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-xs font-medium">Identificador único (slug)</Label>
            <div className="relative">
              <Input
                id="slug"
                value={slugInput}
                onChange={(e) => setSlugInput(normalizeToSlug(e.target.value))}
                placeholder="mi-organizacion"
                className="pr-10 w-full h-10"
              />
              {isCheckingSlug && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isCheckingSlug && slugAvailable === true && slugInput && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {!isCheckingSlug && slugAvailable === false && slugInput && (
                <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Solo letras minúsculas, números y guiones. Ejemplo: mi-organizacion
            </p>
            
            {/* Tu URL Section - Always visible */}
            <div className="mt-3">
              <Label className="text-xs font-medium mb-2 block">Tu URL</Label>
              
              {/* Case 1: Has valid slugInput */}
              {slugInput && isValidSlug(slugInput) && (
                <div className={`p-3 sm:p-4 rounded-lg border ${
                  slugInput === organization?.slug 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-muted border-border'
                }`}>
                  {/* ✅ AJUSTADO: flex-col siempre en mobile, botones con texto visible */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                    <Badge 
                      variant={slugInput === organization?.slug ? "default" : "secondary"}
                      className={`${slugInput === organization?.slug ? "bg-green-600" : ""} text-[10px] sm:text-xs px-1.5 py-0.5 shrink-0 self-start`}
                    >
                      {slugInput === organization?.slug ? "URL Activa" : "Vista previa"}
                    </Badge>
                    {/* ✅ AJUSTADO: Botones con h-9, texto siempre visible */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(getOrganizationPublicUrl(slugInput))}
                        className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        <span>Copiar</span>
                      </Button>
                      {slugInput === organization?.slug && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <a href={getOrganizationPublicUrl(slugInput)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                            <span>Visitar</span>
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* ✅ AJUSTADO: Code block con break-all y overflowWrap */}
                  <code 
                    className={`text-[11px] sm:text-xs break-all block px-2 py-1.5 rounded bg-background/50 ${
                      slugInput === organization?.slug 
                        ? 'text-green-700 dark:text-green-400' 
                        : 'text-foreground'
                    }`}
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {getOrganizationPublicUrl(slugInput)}
                  </code>
                  {slugInput !== organization?.slug && (
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-2">
                      Guarda los cambios para activar esta URL
                    </p>
                  )}
                </div>
              )}
              
              {/* Case 2: Empty input but has suggestion */}
              {!slugInput && suggestedSlug && (
                <div className="p-3 sm:p-4 rounded-lg border bg-primary/5 border-primary/20">
                  {/* ✅ AJUSTADO: flex-col en mobile */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0.5">Sugerencia</Badge>
                    </div>
                    {/* ✅ AJUSTADO: Botones con texto visible */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(getOrganizationPublicUrl(suggestedSlug))}
                        className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        <span>Copiar</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applySuggestedSlug}
                        className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        Usar sugerencia
                      </Button>
                    </div>
                  </div>
                  {/* ✅ AJUSTADO: Code block con break-all */}
                  <code 
                    className="text-[11px] sm:text-xs break-all block text-foreground px-2 py-1.5 rounded bg-background/50"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {getOrganizationPublicUrl(suggestedSlug)}
                  </code>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-2">
                    Basada en el nombre de tu organización
                  </p>
                </div>
              )}
              
              {/* Case 3: Empty input and no suggestion */}
              {!slugInput && !suggestedSlug && (
                <div className="p-3 sm:p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    Escribe un identificador arriba para ver tu URL
                  </p>
                </div>
              )}
            </div>
            
            {slugError && slugInput && !isCheckingSlug && (
              <p className="text-xs sm:text-sm text-destructive">
                {slugError}
              </p>
            )}
          </div>

          {/* ✅ AJUSTADO: Warning box con padding responsive */}
          {isChangingSlug && (
            <div className="p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                    ¿Estás seguro de cambiar el slug?
                  </p>
                  <p className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-500">
                    Los enlaces existentes dejarán de funcionar. Asegúrate de actualizar todos los enlaces que hayas compartido.
                  </p>
                  <div className="mt-2 space-y-1 text-[11px] sm:text-xs">
                    {/* ✅ AJUSTADO: URLs con break-all */}
                    <p className="text-muted-foreground break-all" style={{ overflowWrap: 'anywhere' }}>
                      <span className="line-through">{getOrganizationPublicUrl(organization?.slug!)}</span>
                    </p>
                    <p className="text-foreground font-medium break-all" style={{ overflowWrap: 'anywhere' }}>
                      → {getOrganizationPublicUrl(slugInput)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ AJUSTADO: Save Button con h-10 */}
          {slugInput !== organization?.slug && slugInput && slugAvailable !== false && !isCheckingSlug && (
            <Button 
              onClick={handleSaveSlug} 
              disabled={isSavingSlug}
              className="w-full sm:w-auto h-10"
            >
              {isSavingSlug ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar URL Pública
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ✅ AJUSTADO: Card "Dominios Personalizados" con responsive mobile-first */}
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          {/* ✅ AJUSTADO: Header con flex-col en mobile */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* ✅ AJUSTADO: Typography más compacta */}
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Dominios Personalizados
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Conecta tu propio dominio para una experiencia white-label
              </CardDescription>
            </div>
            {/* ✅ AJUSTADO: Botones con h-9, texto visible, flex-wrap */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRunVercelDiagnosis}
                disabled={diagnoseVercel.isPending}
                className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
              >
                {diagnoseVercel.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-1.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                )}
                <span>Diagnosticar</span>
              </Button>
              {canHaveCustomDomains ? (
                <Button onClick={() => setShowAddDialog(true)} size="sm" className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  <span>Agregar Dominio</span>
                </Button>
              ) : (
                <Button onClick={() => setShowUpgradeModal(true)} size="sm" variant="outline" className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm">
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  <span>Agregar Dominio</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 space-y-3 sm:space-y-4">
          {domains.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Globe className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-xs sm:text-sm">No tienes dominios personalizados configurados</p>
              <p className="text-[11px] sm:text-xs mt-1">
                Agrega un dominio para que tus rifas aparezcan en tu propia URL
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => (
                /* ✅ AJUSTADO: Domain row con layout de 2 filas SIEMPRE */
                <div
                  key={domain.id}
                  className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg bg-card"
                >
                  {/* Fila 1: Status + Domain Info */}
                  <div className="flex items-start gap-3">
                    {/* DNS Status Indicator */}
                    <div className="shrink-0">
                      {domain.verified ? (
                        <div className="relative group">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Wifi className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] sm:text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            DNS Online
                          </div>
                        </div>
                      ) : (
                        <div className="relative group">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <WifiOff className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] sm:text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            DNS Pendiente
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      {/* ✅ AJUSTADO: Domain name con break-all */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-sm sm:text-base font-medium break-all" style={{ overflowWrap: 'anywhere' }}>{domain.domain}</span>
                        {domain.is_primary && (
                          <Badge variant="default" className="text-[10px] sm:text-xs px-1.5 py-0.5 leading-tight shrink-0">
                            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      {/* ✅ AJUSTADO: Badges con tamaño responsive */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {domain.verified ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-[10px] sm:text-xs px-1.5 py-0.5 leading-tight">
                            <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Verificado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-[10px] sm:text-xs px-1.5 py-0.5 leading-tight">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Pendiente
                          </Badge>
                        )}
                        {domain.verified && domain.ssl_status === "active" && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 text-[10px] sm:text-xs px-1.5 py-0.5 leading-tight">
                            <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            SSL
                          </Badge>
                        )}
                        {domain.verified && hasTrackingConfigured && (
                          <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 text-[10px] sm:text-xs px-1.5 py-0.5 leading-tight">
                            <BarChart3 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            Tracking
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* ✅ AJUSTADO: Fila 2: Actions - SIEMPRE separadas con border-t */}
                  <div className="flex flex-wrap gap-2 sm:justify-end border-t pt-3 sm:border-t-0 sm:pt-0">
                    {!domain.verified && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDnsDialog(domain)}
                          className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                          <span>Ver DNS</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyDomain(domain.id)}
                          disabled={verifyDomain.isPending}
                          className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 ${verifyDomain.isPending ? 'animate-spin' : ''}`} />
                          <span>Verificar</span>
                        </Button>
                      </>
                    )}
                    {domain.verified && !domain.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryDomain.mutate(domain.id)}
                        disabled={setPrimaryDomain.isPending}
                        className="h-9 px-2 sm:px-3 min-w-[44px] flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        <span>Hacer Principal</span>
                      </Button>
                    )}
                    {/* ✅ AJUSTADO: Delete button cuadrado */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(domain)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Tracking Settings - Only for Pro+ with verified domains */}
      {canHaveCustomDomains && (
        <TrackingSettings hasVerifiedDomain={domains?.some(d => d.verified) || false} />
      )}

      {/* ✅ AJUSTADO: Add Domain Dialog con responsive */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Agregar Dominio Personalizado</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Ingresa el dominio que deseas conectar a tu organización
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Dominio</label>
              <Input
                placeholder="ejemplo.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                className="h-10"
              />
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                No incluyas http:// o www. Solo el dominio base.
              </p>
              <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-400">
                    <strong>Tip:</strong> El sistema detecta automáticamente si acceden con o sin "www". Solo necesitas agregar una versión.
                  </p>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                ¿No tienes dominio?{" "}
                <a 
                  href="https://www.namecheap.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Namecheap
                </a>
                {", "}
                <a 
                  href="https://domains.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Domains
                </a>
                {" o "}
                <a 
                  href="https://www.godaddy.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GoDaddy
                </a>
              </p>
            </div>
          </div>
          {/* ✅ AJUSTADO: Footer con botones h-9 */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="h-9 min-w-[44px] order-last sm:order-first">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddDomain} 
              disabled={!newDomain.trim() || addDomain.isPending}
              className="h-9 min-w-[44px]"
            >
              {addDomain.isPending ? "Agregando..." : "Agregar Dominio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ AJUSTADO: DNS Instructions Dialog con responsive */}
      <Dialog open={!!showDnsDialog} onOpenChange={() => setShowDnsDialog(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg break-all" style={{ overflowWrap: 'anywhere' }}>
              DNS para {showDnsDialog?.domain}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Agrega estos registros en tu proveedor de DNS (apuntando a Vercel)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-medium text-xs sm:text-sm">1. Registro A (para dominio raíz)</h4>
              <div className="bg-muted p-2 sm:p-3 rounded-lg space-y-2 text-xs sm:text-sm font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span>@</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Valor:</span>
                  <div className="flex items-center gap-2">
                    <span>76.76.21.21</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyRecord("76.76.21.21")}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-medium text-xs sm:text-sm">2. Registro A para www (opcional)</h4>
              <div className="bg-muted p-2 sm:p-3 rounded-lg space-y-2 text-xs sm:text-sm font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span>www</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Valor:</span>
                  <div className="flex items-center gap-2">
                    <span>76.76.21.21</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyRecord("76.76.21.21")}
                      className="h-9 w-9 p-0 shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                Los cambios DNS pueden tardar hasta 48 horas en propagarse. 
                Una vez configurados, haz clic en "Verificar" para confirmar.
              </AlertDescription>
            </Alert>
          </div>
          {/* ✅ AJUSTADO: Footer con botones h-9 */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDnsDialog(null)} className="h-9 min-w-[44px] order-last sm:order-first">
              Cerrar
            </Button>
            <Button asChild className="h-9 min-w-[44px]">
              <a 
                href="https://docs.lovable.dev/features/custom-domain" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                <span>Ver Documentación</span>
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DNS Diagnostic Modal */}
      <DNSDiagnosticModal
        data={diagnosticModal}
        open={!!diagnosticModal}
        onOpenChange={(open) => !open && setDiagnosticModal(null)}
      />

      {/* Vercel Access Diagnostic Modal */}
      <VercelDiagnosticModal
        data={vercelDiagnosisData}
        open={vercelDiagnosisModal}
        onOpenChange={setVercelDiagnosisModal}
        isPending={diagnoseVercel.isPending}
      />

      {/* ✅ AJUSTADO: Delete Confirmation con responsive */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {deleteConfirm?.is_primary && (
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
              )}
              ¿Eliminar dominio{deleteConfirm?.is_primary ? ' principal' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-xs sm:text-sm">
              <span className="block break-words">
                Esta acción no se puede deshacer. El dominio <strong className="break-all" style={{ overflowWrap: 'anywhere' }}>{deleteConfirm?.domain}</strong> dejará 
                de estar conectado a tu organización.
              </span>
              
              {deleteConfirm?.is_primary && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-[11px] sm:text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Advertencia:</strong> Este es tu dominio principal. Al eliminarlo:
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Los enlaces compartidos dejarán de funcionar</li>
                        <li className="break-all" style={{ overflowWrap: 'anywhere' }}>Tus clientes no podrán acceder desde {deleteConfirm?.domain}</li>
                        <li>Deberás configurar otro dominio como principal</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* ✅ AJUSTADO: Footer con botones h-9 */}
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="h-9 min-w-[44px] order-last sm:order-first">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 min-w-[44px] bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  removeDomain.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              {deleteConfirm?.is_primary ? 'Eliminar Principal' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentTier={tier}
        feature="Dominios Personalizados"
        reason="Los dominios personalizados están disponibles en Plan Pro y superiores. Actualiza tu plan para conectar tu propio dominio."
      />
    </div>
  );
}
