import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Calendar, XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  currentPeriodEnd: Date | null;
  onConfirm: (immediate: boolean) => Promise<void>;
}

const PLAN_BENEFITS: Record<string, string[]> = {
  basic: ["2 rifas activas", "2,000 boletos por rifa", "1 plantilla"],
  pro: ["7 rifas activas", "30,000 boletos por rifa", "6 plantillas", "Sin marca de agua"],
  premium: ["15 rifas activas", "100,000 boletos por rifa", "Todas las plantillas", "Bot de Telegram", "CSS personalizado"],
  enterprise: ["Rifas ilimitadas", "10M boletos por rifa", "API Access", "Soporte prioritario"],
};

export function CancelSubscriptionModal({
  open,
  onOpenChange,
  currentPlan,
  currentPeriodEnd,
  onConfirm,
}: CancelSubscriptionModalProps) {
  const [cancelType, setCancelType] = useState<"period_end" | "immediate">("period_end");
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const benefits = PLAN_BENEFITS[currentPlan.toLowerCase()] || PLAN_BENEFITS.basic;
  const isConfirmValid = confirmText.toUpperCase() === "CANCELAR";

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsLoading(true);
    try {
      await onConfirm(cancelType === "immediate");
      onOpenChange(false);
      setConfirmText("");
      setCancelType("period_end");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setConfirmText("");
      setCancelType("period_end");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Suscripción
          </DialogTitle>
          <DialogDescription>
            ¿Estás seguro que deseas cancelar tu plan {currentPlan}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits you'll lose */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive mb-2">
              Perderás acceso a:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Cancellation type */}
          <div className="space-y-3">
            <Label>¿Cuándo deseas cancelar?</Label>
            <RadioGroup
              value={cancelType}
              onValueChange={(v) => setCancelType(v as "period_end" | "immediate")}
            >
              <div className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                   onClick={() => setCancelType("period_end")}>
                <RadioGroupItem value="period_end" id="period_end" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="period_end" className="font-medium cursor-pointer">
                    Al final del período (recomendado)
                  </Label>
                  {currentPeriodEnd && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Mantén acceso hasta el {format(currentPeriodEnd, "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border border-destructive/30 p-3 cursor-pointer hover:bg-destructive/5"
                   onClick={() => setCancelType("immediate")}>
                <RadioGroupItem value="immediate" id="immediate" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="immediate" className="font-medium cursor-pointer text-destructive">
                    Cancelar inmediatamente
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Perderás el acceso ahora mismo. No hay reembolso.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {cancelType === "immediate" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La cancelación inmediata es irreversible y no incluye reembolso del tiempo restante.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Escribe <span className="font-mono font-bold">CANCELAR</span> para confirmar
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Escribe CANCELAR"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Mantener Suscripción
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Confirmar Cancelación"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
