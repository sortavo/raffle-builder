import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Ticket, Loader2, ArrowLeft, ArrowRight, Check, Building2, CreditCard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRIPE_PLANS, getPriceId, type PlanKey, type BillingPeriod } from "@/lib/stripe-config";
import { z } from "zod";

const businessInfoSchema = z.object({
  businessName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
});

const steps = [
  { id: 1, name: "Negocio", icon: Building2 },
  { id: 2, name: "Pagos", icon: CreditCard },
  { id: 3, name: "Plan", icon: Sparkles },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, organization, isLoading } = useAuth();
  
  const initialStep = parseInt(searchParams.get("step") || "1");
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Business Info
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Step 2: Payment Methods
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [clabeNumber, setClabeNumber] = useState("");
  
  // Step 3: Plan Selection
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("pro");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (organization) {
      setBusinessName(organization.name || "");
    }
  }, [organization]);

  const validateStep1 = () => {
    try {
      businessInfoSchema.parse({ businessName, phone });
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        e.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleStep1Submit = async () => {
    if (!validateStep1() || !organization) return;
    
    setIsSubmitting(true);
    const { error } = await supabase
      .from("organizations")
      .update({ name: businessName, phone })
      .eq("id", organization.id);
    setIsSubmitting(false);

    if (error) {
      toast.error("Error al guardar información");
      return;
    }
    
    setCurrentStep(2);
  };

  const handleStep2Submit = async () => {
    // Payment methods are optional, just save if provided
    if (bankName || accountNumber) {
      // In a real app, you'd save this to a payment_methods table
      // For now, we'll just proceed
    }
    setCurrentStep(3);
  };

  const handlePlanSelect = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    const priceId = getPriceId(selectedPlan, billingPeriod);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipTrial = async () => {
    if (!organization) return;
    
    setIsSubmitting(true);
    const { error } = await supabase
      .from("organizations")
      .update({ 
        onboarding_completed: true,
        subscription_status: "trial",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", organization.id);
    setIsSubmitting(false);

    if (error) {
      toast.error("Error al continuar");
      return;
    }

    toast.success("¡Bienvenido a Sortavo!");
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            <span className="text-xl font-extrabold text-foreground">SORTAVO</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center justify-center gap-4">
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 w-8 sm:w-16",
                      currentStep > step.id ? "bg-success" : "bg-muted"
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Información de tu negocio</CardTitle>
              <CardDescription>
                Cuéntanos sobre tu organización para personalizar tu experiencia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre del negocio</Label>
                <Input
                  id="businessName"
                  placeholder="Mi Empresa S.A. de C.V."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={errors.businessName ? "border-destructive" : ""}
                />
                {errors.businessName && (
                  <p className="text-sm text-destructive">{errors.businessName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono de contacto</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleStep1Submit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Payment Methods */}
        {currentStep === 2 && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Métodos de pago</CardTitle>
              <CardDescription>
                Configura cómo recibirás los pagos de tus compradores (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bankName">Banco</Label>
                <Input
                  id="bankName"
                  placeholder="BBVA, Banorte, Santander..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountHolder">Titular de la cuenta</Label>
                <Input
                  id="accountHolder"
                  placeholder="Juan Pérez García"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Número de cuenta</Label>
                  <Input
                    id="accountNumber"
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clabeNumber">CLABE interbancaria</Label>
                  <Input
                    id="clabeNumber"
                    placeholder="012345678901234567"
                    value={clabeNumber}
                    onChange={(e) => setClabeNumber(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Esta información se mostrará a tus compradores para que realicen transferencias.
                Puedes configurarla más tarde desde ajustes.
              </p>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Atrás
                </Button>
                <Button onClick={handleStep2Submit}>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Plan Selection */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Elige tu plan</h1>
              <p className="text-muted-foreground">
                Selecciona el plan que mejor se adapte a tus necesidades
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  billingPeriod === "annual"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Anual
                <span className="ml-2 rounded-full bg-success px-2 py-0.5 text-xs text-success-foreground">
                  -16%
                </span>
              </button>
            </div>

            {/* Plan Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {(Object.entries(STRIPE_PLANS) as [PlanKey, typeof STRIPE_PLANS.basic & { popular?: boolean }][]).map(
                ([key, plan]) => (
                  <Card
                    key={key}
                    className={cn(
                      "relative cursor-pointer transition-all hover:shadow-lg",
                      selectedPlan === key && "ring-2 ring-primary",
                      "popular" in plan && plan.popular && "border-primary"
                    )}
                    onClick={() => setSelectedPlan(key)}
                  >
                    {"popular" in plan && plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        Más popular
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          ${billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice}
                        </span>
                        <span className="text-muted-foreground">
                          USD/{billingPeriod === "annual" ? "año" : "mes"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 shrink-0 text-success" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="ghost" onClick={handleSkipTrial} disabled={isSubmitting}>
                  Continuar con prueba gratuita
                </Button>
                <Button onClick={handlePlanSelect} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Suscribirme a {STRIPE_PLANS[selectedPlan].name}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
