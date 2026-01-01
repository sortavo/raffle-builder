import { useState } from "react";
import { useCustomDomains, CustomDomain } from "@/hooks/useCustomDomains";
import { useAuth } from "@/hooks/useAuth";
import { getSubscriptionLimits, SubscriptionTier } from "@/lib/subscription-limits";
import { UpgradePlanModal } from "@/components/raffle/UpgradePlanModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Lock
} from "lucide-react";
import { toast } from "sonner";

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
                          onClick={() => verifyDomain.mutate(domain.id)}
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
              Agrega estos registros en tu proveedor de DNS
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
                    <span>185.158.133.1</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyRecord("185.158.133.1")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">2. Registro TXT (verificación)</h4>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>TXT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span>_sortavo</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Valor:</span>
                  <div className="flex items-center gap-2">
                    <span className="break-all text-xs">
                      sortavo_verify={showDnsDialog?.verification_token}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyToken(`sortavo_verify=${showDnsDialog?.verification_token}`)}
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
