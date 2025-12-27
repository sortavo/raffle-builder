import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, Loader2, ArrowLeft, ArrowRight, Check, Building2, CreditCard, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRIPE_PLANS, getPriceId, type PlanKey, type BillingPeriod } from "@/lib/stripe-config";
import { z } from "zod";
import { SinglePhoneInput } from "@/components/ui/SinglePhoneInput";

const businessInfoSchema = z.object({
  businessName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().refine((val) => val.replace(/\D/g, "").length >= 12, "El teléfono debe tener al menos 10 dígitos"),
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
  const urlPlan = searchParams.get("plan") as PlanKey | null;
  const validPlans: PlanKey[] = ["basic", "pro", "premium"];
  const initialPlan = urlPlan && validPlans.includes(urlPlan) ? urlPlan : "pro";
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(initialPlan);
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
    if (bankName || accountNumber) {
      // Save payment methods if provided
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-20 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob" />
      <div className="absolute bottom-0 -right-20 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-blob animation-delay-2000" />

      {/* Header */}
      <header className="relative z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Trophy className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SORTAVO
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 relative z-10">
        {/* Progress Steps */}
        <nav className="mb-8">
          <ol className="flex items-center justify-center gap-4">
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300",
                    currentStep === step.id
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25"
                      : currentStep > step.id
                      ? "bg-gradient-to-r from-success to-success/80 text-success-foreground shadow-lg shadow-success/25"
                      : "bg-card text-muted-foreground border border-border"
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
                      "mx-3 h-0.5 w-8 sm:w-16 rounded-full transition-colors",
                      currentStep > step.id 
                        ? "bg-gradient-to-r from-success to-success/80" 
                        : "bg-border"
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <Card className="backdrop-blur-sm bg-card/80 border-border/40 shadow-2xl shadow-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Información de tu negocio
              </CardTitle>
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
                  className={cn(
                    "bg-background/50 border-border focus:border-primary focus:ring-primary",
                    errors.businessName && "border-destructive"
                  )}
                />
                {errors.businessName && (
                  <p className="text-sm text-destructive">{errors.businessName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono de contacto</Label>
                <SinglePhoneInput
                  value={phone}
                  onChange={setPhone}
                  error={errors.phone}
                  defaultCountryCode="+52"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleStep1Submit} 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Payment Methods */}
        {currentStep === 2 && (
          <Card className="backdrop-blur-sm bg-card/80 border-border/40 shadow-2xl shadow-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Métodos de pago
              </CardTitle>
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
                  className="bg-background/50 border-border focus:border-primary focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountHolder">Titular de la cuenta</Label>
                <Input
                  id="accountHolder"
                  placeholder="Juan Pérez García"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="bg-background/50 border-border focus:border-primary focus:ring-primary"
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
                    className="bg-background/50 border-border focus:border-primary focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clabeNumber">CLABE interbancaria</Label>
                  <Input
                    id="clabeNumber"
                    placeholder="012345678901234567"
                    value={clabeNumber}
                    onChange={(e) => setClabeNumber(e.target.value)}
                    className="bg-background/50 border-border focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground bg-primary/10 p-3 rounded-lg">
                Esta información se mostrará a tus compradores para que realicen transferencias.
                Puedes configurarla más tarde desde ajustes.
              </p>

              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(1)}
                  className="border-border hover:bg-muted"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Atrás
                </Button>
                <Button 
                  onClick={handleStep2Submit}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5"
                >
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Elige tu plan
              </h1>
              <p className="text-muted-foreground mt-1">
                Selecciona el plan que mejor se adapte a tus necesidades
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 bg-card/60 backdrop-blur-sm rounded-full px-6 py-3 w-fit mx-auto shadow-lg shadow-primary/10 border border-border">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all",
                  billingPeriod === "monthly"
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  billingPeriod === "annual"
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Anual
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  billingPeriod === "annual" 
                    ? "bg-white/20 text-primary-foreground" 
                    : "bg-success/20 text-success"
                )}>
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
                      "relative cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm",
                      selectedPlan === key 
                        ? "ring-2 ring-primary shadow-lg shadow-primary/20 bg-card" 
                        : "bg-card/80 hover:bg-card",
                      "popular" in plan && plan.popular && "border-primary"
                    )}
                    onClick={() => setSelectedPlan(key)}
                  >
                    {"popular" in plan && plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1 text-xs font-medium text-primary-foreground shadow-lg">
                        Más popular
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          ${billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{billingPeriod === "annual" ? "año" : "mes"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plan.limits && (
                          <>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-success" />
                              <span>{plan.limits.maxActiveRaffles} sorteos activos</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-success" />
                              <span>{plan.limits.maxTicketsPerRaffle.toLocaleString()} boletos/sorteo</span>
                            </li>
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 pt-4">
              <Button 
                onClick={handlePlanSelect}
                disabled={isSubmitting}
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Continuar con {STRIPE_PLANS[selectedPlan].name}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              
              <button
                onClick={handleSkipTrial}
                disabled={isSubmitting}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Continuar con prueba gratuita de 14 días
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
