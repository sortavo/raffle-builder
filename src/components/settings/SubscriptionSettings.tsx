import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  CreditCard, 
  Zap, 
  Crown, 
  Rocket,
  Check,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Building2
} from "lucide-react";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripe-config";
import { getSubscriptionLimits } from "@/lib/subscription-limits";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const PLAN_ICONS = {
  basic: Rocket,
  pro: Zap,
  premium: Crown,
  enterprise: Building2,
};

export function SubscriptionSettings() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const currentTier = (organization?.subscription_tier || "basic") as PlanKey;
  const currentPlan = STRIPE_PLANS[currentTier];
  const limits = getSubscriptionLimits(currentTier as any);
  const PlanIcon = PLAN_ICONS[currentTier] || Rocket;

  const statusLabels = {
    active: { label: "Activa", color: "bg-success/10 text-success" },
    trial: { label: "Prueba", color: "bg-warning/10 text-warning" },
    past_due: { label: "Pago pendiente", color: "bg-destructive/10 text-destructive" },
    canceled: { label: "Cancelada", color: "bg-muted text-muted-foreground" },
  };

  const status = statusLabels[organization?.subscription_status || "trial"];

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No se pudo obtener el enlace del portal");
      }
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // Mock usage data - in real app, fetch from database
  const usageData = {
    activeRaffles: 0,
    maxRaffles: limits.maxActiveRaffles,
    ticketsThisMonth: 0,
    maxTickets: limits.maxTicketsPerRaffle,
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 shadow-sm">
                <PlanIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Plan {currentPlan?.name}
                  <Badge className={status.color}>{status.label}</Badge>
                </CardTitle>
                <CardDescription>
                  {organization?.subscription_period === "annual" 
                    ? "Facturación anual" 
                    : "Facturación mensual"}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${organization?.subscription_period === "annual" 
                  ? currentPlan?.annualPrice 
                  : currentPlan?.monthlyPrice}{" "}
                <span className="text-base font-medium text-muted-foreground">USD</span>
              </div>
              <div className="text-sm text-muted-foreground">
                /{organization?.subscription_period === "annual" ? "año" : "mes"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization?.subscription_status === "past_due" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                Tu pago está pendiente. Actualiza tu método de pago para evitar la suspensión.
              </span>
            </div>
          )}

          {organization?.trial_ends_at && organization.subscription_status === "trial" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                Tu prueba termina el{" "}
                {format(new Date(organization.trial_ends_at), "d 'de' MMMM, yyyy", { locale: es })}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleManageSubscription} disabled={isLoadingPortal}>
              {isLoadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CreditCard className="mr-2 h-4 w-4" />
              Gestionar Suscripción
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            {currentTier !== "premium" && (
              <Button variant="outline" onClick={() => navigate("/pricing")}>
                <Zap className="mr-2 h-4 w-4" />
                Cambiar Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Uso Actual</CardTitle>
          <CardDescription>
            Tu consumo en el período actual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Sorteos Activos</span>
              <span className="font-medium">
                {usageData.activeRaffles} / {usageData.maxRaffles === -1 ? "∞" : usageData.maxRaffles}
              </span>
            </div>
            <Progress 
              value={usageData.maxRaffles === -1 ? 0 : (usageData.activeRaffles / usageData.maxRaffles) * 100} 
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Boletos Máximos por Sorteo</span>
              <span className="font-medium">
                {usageData.maxTickets.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Plantillas Disponibles</span>
              <span className="font-medium">
                {limits.templatesAvailable}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Características del Plan</CardTitle>
          <CardDescription>
            Lo que incluye tu plan {currentPlan?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {currentPlan?.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {currentTier !== "premium" && (
            <div className="mt-6 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
              <h4 className="font-medium mb-2">
                ¿Necesitas más?
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Actualiza a un plan superior para desbloquear más características.
              </p>
              <Button variant="outline" onClick={() => navigate("/pricing")}>
                Ver todos los planes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History Placeholder */}
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Historial de Facturación</CardTitle>
          <CardDescription>
            Tus facturas y recibos de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay facturas aún</p>
            <p className="text-sm">
              Tus facturas aparecerán aquí después de tu primer pago
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
