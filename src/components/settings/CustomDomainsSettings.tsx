import { useState } from "react";
import { useCustomDomains, CustomDomain, DNSDiagnostic } from "@/hooks/useCustomDomains";
import { useAuth } from "@/hooks/useAuth";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";
import { UpgradePlanModal } from "@/components/raffle/UpgradePlanModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  XCircle
} from "lucide-react";
import { toast } from "sonner";

const VERCEL_IPS = ['76.76.21.21', '76.76.21.164', '76.76.21.241'];

interface DiagnosticModalState {
  domain: string;
  diagnostic: DNSDiagnostic;
}

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {diagnostic.pointsToVercel ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Diagnóstico DNS - {domain}
          </DialogTitle>
          <DialogDescription>
            Información técnica sobre la configuración DNS actual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant={diagnostic.pointsToVercel ? "default" : "destructive"}>
            <AlertTitle className="flex items-center gap-2">
              {diagnostic.pointsToVercel ? '✅ Configurado Correctamente' : '❌ Configuración Incorrecta'}
            </AlertTitle>
            <AlertDescription>
              {diagnostic.pointsToVercel 
                ? 'El dominio apunta correctamente a Vercel'
                : 'El dominio NO apunta a Vercel. Revisa la configuración DNS.'}
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">A Records Encontrados:</h4>
              {diagnostic.aRecords.length > 0 ? (
                <div className="bg-muted p-3 rounded-lg space-y-1 font-mono text-sm">
                  {diagnostic.aRecords.map((ip: string, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>{ip}</span>
                      {VERCEL_IPS.includes(ip) && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                          ✓ Vercel
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ninguno encontrado</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">CNAME Records:</h4>
              {diagnostic.cnameRecords.length > 0 ? (
                <div className="bg-muted p-3 rounded-lg space-y-1 font-mono text-sm">
                  {diagnostic.cnameRecords.map((cname: string, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="break-all">{cname}</span>
                      {cname.includes('vercel') && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs ml-2">
                          ✓ Vercel
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Ninguno encontrado</p>
              )}
            </div>

            {!diagnostic.pointsToVercel && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Configuración Correcta:</h4>
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy("76.76.21.21")}
                      >
                        <Copy className="h-3 w-3" />
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
              <AlertTitle>DNS Aún Propagando</AlertTitle>
              <AlertDescription>
                Los cambios DNS pueden tardar hasta 48 horas en propagarse completamente.
                Tiempo típico: 30 minutos - 2 horas.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            asChild
            className="text-muted-foreground sm:mr-auto"
          >
            <a href="/contact" target="_blank">
              ¿Necesitas ayuda?
            </a>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {!diagnostic.pointsToVercel && (
              <Button onClick={() => {
                navigator.clipboard.writeText("Tipo: A\nHost: @\nValor: 76.76.21.21");
                toast.success("Configuración copiada al portapapeles");
              }}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar Todo
              </Button>
            )}
          </div>
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
    verifyDomain 
  } = useCustomDomains();
  const { organization } = useAuth();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDnsDialog, setShowDnsDialog] = useState<CustomDomain | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [diagnosticModal, setDiagnosticModal] = useState<DiagnosticModalState | null>(null);

  // Determinar si el plan permite custom domains
  const tier = (organization?.subscription_tier || 'basic') as SubscriptionTier;
  const limits = getSubscriptionLimits(tier);
  const canHaveCustomDomains = limits.canHaveCustomDomains;

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    
    await addDomain.mutateAsync(newDomain);
    setNewDomain("");
    setShowAddDialog(false);
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Dominios Personalizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Dominios Personalizados
              </CardTitle>
              <CardDescription>
                Conecta tu propio dominio para una experiencia white-label
              </CardDescription>
            </div>
            {canHaveCustomDomains ? (
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Agregar Dominio
              </Button>
            ) : (
              <Button onClick={() => setShowUpgradeModal(true)} size="sm" variant="outline">
                <Lock className="h-4 w-4 mr-1" />
                Agregar Dominio
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes dominios personalizados configurados</p>
              <p className="text-sm mt-1">
                Agrega un dominio para que tus rifas aparezcan en tu propia URL
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{domain.domain}</span>
                        {domain.is_primary && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {domain.verified ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verificado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                        {domain.verified && domain.ssl_status === "active" && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            SSL Activo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!domain.verified && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDnsDialog(domain)}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          Ver DNS
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyDomain(domain.id)}
                          disabled={verifyDomain.isPending}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${verifyDomain.isPending ? 'animate-spin' : ''}`} />
                          Verificar
                        </Button>
                      </>
                    )}
                    {domain.verified && !domain.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryDomain.mutate(domain.id)}
                        disabled={setPrimaryDomain.isPending}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Hacer Principal
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(domain.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Nota:</strong> Los dominios personalizados requieren exportar tu proyecto a Vercel 
              para funcionar completamente. Dentro de Lovable, puedes usar rutas como{" "}
              <code className="bg-muted px-1 rounded">sortavo.com/tu-organizacion</code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Dominio Personalizado</DialogTitle>
            <DialogDescription>
              Ingresa el dominio que deseas conectar a tu organización
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dominio</label>
              <Input
                placeholder="ejemplo.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
              />
              <p className="text-xs text-muted-foreground">
                No incluyas http:// o www. Solo el dominio base.
              </p>
              <p className="text-xs text-muted-foreground">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddDomain} 
              disabled={!newDomain.trim() || addDomain.isPending}
            >
              {addDomain.isPending ? "Agregando..." : "Agregar Dominio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DNS Instructions Dialog */}
      <Dialog open={!!showDnsDialog} onOpenChange={() => setShowDnsDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configuración DNS para {showDnsDialog?.domain}</DialogTitle>
            <DialogDescription>
              Agrega estos registros en tu proveedor de DNS (apuntando a Vercel)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">1. Registro A (para dominio raíz)</h4>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span>@</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor:</span>
                  <div className="flex items-center gap-2">
                    <span>76.76.21.21</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyRecord("76.76.21.21")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">2. Registro A para www (opcional)</h4>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>A</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span>www</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor:</span>
                  <div className="flex items-center gap-2">
                    <span>76.76.21.21</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyRecord("76.76.21.21")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Los cambios DNS pueden tardar hasta 48 horas en propagarse. 
                Una vez configurados, haz clic en "Verificar" para confirmar.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDnsDialog(null)}>
              Cerrar
            </Button>
            <Button asChild>
              <a 
                href="https://docs.lovable.dev/features/custom-domain" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver Documentación
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar dominio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El dominio dejará de estar conectado 
              a tu organización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  removeDomain.mutate(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              Eliminar
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
    </>
  );
}
