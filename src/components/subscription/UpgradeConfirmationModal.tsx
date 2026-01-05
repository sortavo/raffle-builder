import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Loader2, CreditCard, Calendar, AlertTriangle, Clock, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSortavoTracking } from "@/hooks/useSortavoTracking";

interface ProrationItem {
  description: string;
  amount: number;
}

interface UpgradePreview {
  amount_due: number;
  currency: string;
  proration_details: {
    credit: number;
    debit: number;
    items: ProrationItem[];
  };
  effective_date: string;
  next_billing_date: string | null;
  new_plan_name: string;
  old_plan_name: string;
  is_downgrade?: boolean;
  message?: string;
}

interface UpgradeConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: UpgradePreview | null;
  isLoading: boolean;
  onConfirm: () => void;
  targetPlanPrice: number;
  currentPlanPrice: number;
}

export function UpgradeConfirmationModal({
  open,
  onOpenChange,
  preview,
  isLoading,
  onConfirm,
  targetPlanPrice,
  currentPlanPrice,
}: UpgradeConfirmationModalProps) {
  const { trackSubscribe } = useSortavoTracking();
  
  // Track subscription conversion when confirm is clicked
  const handleConfirm = () => {
    if (preview && !preview.is_downgrade) {
      trackSubscribe(preview.new_plan_name, targetPlanPrice, preview.currency.toUpperCase());
    }
    onConfirm();
  };
  
  if (!preview) return null;

  const formatCurrency = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: preview.currency.toUpperCase(),
    }).format(amount);
  };

  const isDowngrade = preview.is_downgrade ?? targetPlanPrice < currentPlanPrice;
  const amountDue = preview.amount_due;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDowngrade ? (
              <ArrowDown className="h-5 w-5 text-amber-500" />
            ) : (
              <CreditCard className="h-5 w-5 text-primary" />
            )}
            {isDowngrade ? "Confirmar Cambio de Plan" : "Confirmar Mejora de Plan"}
          </DialogTitle>
          <DialogDescription>
            {isDowngrade 
              ? "Tu plan cambiará al final del período actual"
              : "Revisa los detalles antes de confirmar el cambio"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Change Visual */}
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                Plan Actual
              </Badge>
              <p className="font-semibold text-lg capitalize">{preview.old_plan_name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(currentPlanPrice * 100)}/mes
              </p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="text-center">
              <Badge className={isDowngrade ? "bg-amber-500" : "bg-primary"}>
                {isDowngrade ? "Downgrade" : "Upgrade"}
              </Badge>
              <p className="font-semibold text-lg capitalize mt-2">{preview.new_plan_name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(targetPlanPrice * 100)}/mes
              </p>
            </div>
          </div>

          <Separator />

          {/* Downgrade Info */}
          {isDowngrade ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    Sin cargos ni devoluciones
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {preview.message || "El cambio se aplicará al final de tu período actual."}
                  </p>
                </div>
              </div>
              
              {preview.next_billing_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pl-8">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Cambio efectivo: {format(new Date(preview.next_billing_date), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Proration Details - Only for upgrades */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Desglose del Prorrateo</h4>
                
                {preview.proration_details.items.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {preview.proration_details.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-muted-foreground line-clamp-1 pr-2">
                          {item.description}
                        </span>
                        <span className={item.amount < 0 ? "text-green-600" : ""}>
                          {item.amount < 0 ? "-" : ""}
                          {formatCurrency(Math.abs(item.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    El cambio se aplicará en tu próxima factura.
                  </p>
                )}
              </div>

              <Separator />

              {/* Total to Pay - Only for upgrades */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total a cobrar hoy</span>
                  <span className={`text-xl font-bold ${amountDue > 0 ? "text-primary" : "text-green-600"}`}>
                    {amountDue > 0 ? formatCurrency(amountDue) : formatCurrency(0)}
                  </span>
                </div>
                
                {amountDue <= 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Crédito aplicado. No se cobrará hoy.
                  </p>
                )}
                
                {preview.next_billing_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Próxima facturación: {format(new Date(preview.next_billing_date), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={isDowngrade ? "default" : "default"}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                {isDowngrade ? "Confirmar Cambio" : "Confirmar y Pagar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
