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
import { ArrowRight, Loader2, CreditCard, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  if (!preview) return null;

  const formatCurrency = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: preview.currency.toUpperCase(),
    }).format(amount);
  };

  const isUpgrade = targetPlanPrice > currentPlanPrice;
  const amountDue = preview.amount_due;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Confirmar Cambio de Plan
          </DialogTitle>
          <DialogDescription>
            Revisa los detalles antes de confirmar el cambio
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
              <Badge className={isUpgrade ? "bg-primary" : "bg-amber-500"}>
                {isUpgrade ? "Upgrade" : "Downgrade"}
              </Badge>
              <p className="font-semibold text-lg capitalize mt-2">{preview.new_plan_name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(targetPlanPrice * 100)}/mes
              </p>
            </div>
          </div>

          <Separator />

          {/* Proration Details */}
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

          {/* Total to Pay */}
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
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Confirmar Cambio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
