import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STRIPE_PLANS, getPriceId, type PlanKey, type BillingPeriod } from "@/lib/stripe-config";
import { 
  CreditCard, 
  Check, 
  Rocket, 
  Zap, 
  Crown, 
  Loader2, 
  ExternalLink,
  Calendar,
  Gift,
  Users,
  FileText,
  Building2,
  Phone
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Subscription() {
  const { organization } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const currentTier = organization?.subscription_tier || "basic";
  const currentStatus = organization?.subscription_status || "trial";
  const trialEndsAt = organization?.trial_ends_at;

  const planIcons: Record<string, typeof Rocket> = {
    basic: Rocket,
    pro: Zap,
    premium: Crown,
    enterprise: Building2,
  };

  const handleUpgrade = async (planKey: PlanKey, period: BillingPeriod) => {
    setIsLoading(true);
    try {
      const priceId = getPriceId(planKey, period);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Error al procesar. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Error al abrir el portal. Intenta de nuevo.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
      case "trial":
        return <Badge variant="secondary">Prueba Gratuita</Badge>;
      case "past_due":
        return <Badge variant="destructive">Pago Pendiente</Badge>;
      case "canceled":
        return <Badge variant="outline">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{currentStatus}</Badge>;
    }
  };

  // Usage stats
  const limits = STRIPE_PLANS[currentTier as PlanKey]?.limits || STRIPE_PLANS.basic.limits;

  return (
    <DashboardLayout breadcrumbs={[{ label: "Suscripción" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suscripción</h1>
          <p className="text-muted-foreground">
            Administra tu plan y facturación
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Plan Actual
                </CardTitle>
                <CardDescription>
                  Tu plan actual y estado de suscripción
                </CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              {(() => {
                const Icon = planIcons[currentTier] || Rocket;
                return (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                );
              })()}
              <div>
                <h3 className="text-xl font-bold">
                  {STRIPE_PLANS[currentTier as PlanKey]?.name || "Basic"}
                </h3>
                {currentStatus === "trial" && trialEndsAt && (
                  <p className="text-sm text-muted-foreground">
                    Tu prueba gratuita termina el{" "}
                    {format(new Date(trialEndsAt), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                )}
                {currentStatus === "active" && (
                  <p className="text-sm text-muted-foreground">
                    Facturación {organization?.subscription_period === "annual" ? "anual" : "mensual"}
                  </p>
                )}
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Gift className="h-4 w-4 text-muted-foreground" />
                    Sorteos Activos
                  </span>
                  <span className="font-medium">
                    0 / {limits.maxActiveRaffles === 999 ? "∞" : limits.maxActiveRaffles}
                  </span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Boletos por Sorteo
                  </span>
                  <span className="font-medium">
                    Hasta {limits.maxTicketsPerRaffle.toLocaleString()}
                  </span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Plantillas
                  </span>
                  <span className="font-medium">
                    {limits.templatesAvailable} disponibles
                  </span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </div>
          </CardContent>
          {currentStatus === "active" && (
            <CardFooter>
              <Button variant="outline" onClick={handleManageSubscription} disabled={isPortalLoading}>
                {isPortalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Gestionar Suscripción
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Available Plans */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {currentStatus === "trial" ? "Elige tu plan" : "Cambiar de plan"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(Object.entries(STRIPE_PLANS) as [PlanKey, typeof STRIPE_PLANS.basic & { popular?: boolean }][]).map(
              ([key, plan]) => {
                const Icon = planIcons[key] || Rocket;
                const isCurrentPlan = key === currentTier && currentStatus === "active";
                const isEnterprise = key === "enterprise";

                return (
                  <Card
                    key={key}
                    className={cn(
                      "relative",
                      "popular" in plan && plan.popular && "border-primary",
                      isCurrentPlan && "ring-2 ring-primary"
                    )}
                  >
                    {"popular" in plan && plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        Más popular
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 right-4 rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                        Tu plan
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-5 w-5", isEnterprise ? "text-purple-600" : "text-primary")} />
                        <CardTitle>{plan.name}</CardTitle>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${plan.monthlyPrice}</span>
                        <span className="text-muted-foreground">USD/mes</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        o ${plan.annualPrice} USD/año (ahorra 16%)
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 shrink-0 text-green-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                      {isCurrentPlan ? (
                        <Button disabled className="w-full" variant="outline">
                          Plan Actual
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleUpgrade(key, "monthly")}
                            disabled={isLoading}
                            className="w-full"
                            variant={
                              "popular" in plan && plan.popular ? "default" : "outline"
                            }
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Elegir Mensual
                          </Button>
                          <Button
                            onClick={() => handleUpgrade(key, "annual")}
                            disabled={isLoading}
                            variant="ghost"
                            className="w-full text-sm"
                          >
                            Elegir Anual (-16%)
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                );
              }
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
