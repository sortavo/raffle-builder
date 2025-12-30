import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRight, Check, Building2, Sparkles, Globe, MapPin, Gift, CreditCard, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRIPE_PLANS, getPriceId, type PlanKey, type BillingPeriod } from "@/lib/stripe-config";
import { z } from "zod";
import { SinglePhoneInput } from "@/components/ui/SinglePhoneInput";
import sortavoLogo from "@/assets/sortavo-logo.png";

// Country defaults configuration
const COUNTRY_DEFAULTS: Record<string, { currency: string; timezone: string; phoneCode: string }> = {
  MX: { currency: "MXN", timezone: "America/Mexico_City", phoneCode: "+52" },
  CO: { currency: "COP", timezone: "America/Bogota", phoneCode: "+57" },
  US: { currency: "USD", timezone: "America/New_York", phoneCode: "+1" },
  AR: { currency: "ARS", timezone: "America/Buenos_Aires", phoneCode: "+54" },
  CL: { currency: "CLP", timezone: "America/Santiago", phoneCode: "+56" },
  PE: { currency: "PEN", timezone: "America/Lima", phoneCode: "+51" },
  ES: { currency: "EUR", timezone: "Europe/Madrid", phoneCode: "+34" },
  BR: { currency: "BRL", timezone: "America/Sao_Paulo", phoneCode: "+55" },
};

const COUNTRIES = [
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
];

const CURRENCIES = [
  { code: "MXN", name: "Peso Mexicano", symbol: "$", flag: "🇲🇽" },
  { code: "COP", name: "Peso Colombiano", symbol: "$", flag: "🇨🇴" },
  { code: "USD", name: "Dólar", symbol: "$", flag: "🇺🇸" },
  { code: "ARS", name: "Peso Argentino", symbol: "$", flag: "🇦🇷" },
  { code: "CLP", name: "Peso Chileno", symbol: "$", flag: "🇨🇱" },
  { code: "PEN", name: "Sol Peruano", symbol: "S/", flag: "🇵🇪" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "BRL", name: "Real Brasileño", symbol: "R$", flag: "🇧🇷" },
];

const TIMEZONES = [
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/New_York", label: "Nueva York (GMT-5)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (GMT-8)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
];

const businessInfoSchema = z.object({
  businessName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().refine((val) => val.replace(/\D/g, "").length >= 12, "El teléfono debe tener al menos 10 dígitos"),
  country: z.string().min(1, "Selecciona un país"),
  currency: z.string().min(1, "Selecciona una moneda"),
  timezone: z.string().min(1, "Selecciona una zona horaria"),
});

const steps = [
  { id: 1, name: "Organización", icon: Building2 },
  { id: 2, name: "Plan", icon: Sparkles },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, organization, isLoading, refreshOrganization } = useAuth();
  
  const initialStep = parseInt(searchParams.get("step") || "1");
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Step 1: Organization Info
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("MX");
  const [selectedCurrency, setSelectedCurrency] = useState("MXN");
  const [selectedTimezone, setSelectedTimezone] = useState("America/Mexico_City");
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Step 2: Plan Selection
  const urlPlan = searchParams.get("plan") as PlanKey | null;
  const validPlans: PlanKey[] = ["basic", "pro", "premium"];
  const initialPlan = urlPlan && validPlans.includes(urlPlan) ? urlPlan : "pro";
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(initialPlan);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  // Ref to prevent duplicate checkout processing
  const hasProcessedCheckout = useRef(false);
  const pollTimeoutRef = useRef<number | null>(null);
  const [manualRetryCount, setManualRetryCount] = useState(0);

  // Handle successful Stripe checkout return - uses profile.organization_id for stability
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const sessionId = params.get("session_id");
    
    // Skip if already processed or no success param
    if (hasProcessedCheckout.current || success !== "true" || !sessionId) {
      return;
    }
    
    // Wait for user to be loaded before processing
    if (!user?.id) {
      return;
    }
    
    // Mark as processed immediately to prevent re-runs
    hasProcessedCheckout.current = true;
    
    // Clean URL immediately to prevent re-triggers on refresh
    window.history.replaceState({}, '', '/onboarding');
    
    setIsProcessingPayment(true);
    
    // Poll for subscription update
    let pollCount = 0;
    const maxPolls = 20; // 20 polls * 1.5s = 30 seconds max
    
    const pollSubscription = async () => {
      pollCount++;
      
      // Get orgId from profile (stable) or fetch from DB if needed
      let orgId = profile?.organization_id;
      
      if (!orgId && user?.id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();
        orgId = profileData?.organization_id;
      }
      
      if (!orgId) {
        // If still no orgId, retry after delay
        if (pollCount < maxPolls) {
          pollTimeoutRef.current = window.setTimeout(pollSubscription, 1500);
        }
        return;
      }
      
      // Refresh organization data from the database
      if (refreshOrganization) {
        await refreshOrganization();
      }
      
      // Check if subscription is now active or trial AND has stripe_subscription_id
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("subscription_status, stripe_subscription_id, onboarding_completed")
        .eq("id", orgId)
        .single();
      
      if (orgError) {
        console.error("Polling error:", orgError);
      }
      
      // Only mark as successful when we have BOTH valid status AND stripe_subscription_id
      if (orgData?.stripe_subscription_id && 
          orgData?.subscription_status && 
          ["active", "trial"].includes(orgData.subscription_status)) {
        // Mark onboarding as completed if not already
        if (!orgData.onboarding_completed) {
          await supabase
            .from("organizations")
            .update({ onboarding_completed: true })
            .eq("id", orgId);
        }
        
        setIsProcessingPayment(false);
        toast.success("¡Suscripción activada exitosamente!");
        navigate("/dashboard");
        return;
      }
      
      if (pollCount < maxPolls) {
        pollTimeoutRef.current = window.setTimeout(pollSubscription, 1500);
      } else {
        // Max polls reached - show timeout state (don't auto-redirect)
        setIsProcessingPayment(false);
        toast.info("Tu suscripción está siendo procesada. Puedes ir al dashboard.");
      }
    };
    
    // Start polling after a short delay to allow webhook to process
    pollTimeoutRef.current = window.setTimeout(pollSubscription, 2000);
    
    // Cleanup only on unmount
    return () => {
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id - stable after auth loads

  // Manual retry handler
  const handleManualRetry = async () => {
    setManualRetryCount(prev => prev + 1);
    
    let orgId = profile?.organization_id;
    
    if (!orgId && user?.id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      orgId = profileData?.organization_id;
    }
    
    if (!orgId) {
      toast.error("No se pudo obtener la organización");
      return;
    }
    
    if (refreshOrganization) {
      await refreshOrganization();
    }
    
    const { data: orgData } = await supabase
      .from("organizations")
      .select("subscription_status, stripe_subscription_id, onboarding_completed")
      .eq("id", orgId)
      .single();
    
    // Only mark as successful when we have BOTH valid status AND stripe_subscription_id
    if (orgData?.stripe_subscription_id &&
        orgData?.subscription_status && 
        ["active", "trial"].includes(orgData.subscription_status)) {
      if (!orgData.onboarding_completed) {
        await supabase
          .from("organizations")
          .update({ onboarding_completed: true })
          .eq("id", orgId);
      }
      
      toast.success("¡Suscripción activada!");
      navigate("/dashboard");
    } else {
      toast.info("Aún procesando. Intenta de nuevo en unos segundos.");
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (organization && user) {
      // Si el nombre de la org es el email del usuario, dejar vacío para que lo llene
      const isEmailAsName = organization.name === user.email;
      setBusinessName(isEmailAsName ? "" : (organization.name || ""));
      
      if (organization.country_code) {
        setSelectedCountry(organization.country_code);
      }
      if (organization.currency_code) {
        setSelectedCurrency(organization.currency_code);
      }
      if (organization.timezone) {
        setSelectedTimezone(organization.timezone);
      }
      if (organization.city) {
        setCity(organization.city);
      }
    }
  }, [organization, user]);

  // Auto-update currency and timezone when country changes
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const defaults = COUNTRY_DEFAULTS[countryCode];
    if (defaults) {
      setSelectedCurrency(defaults.currency);
      setSelectedTimezone(defaults.timezone);
      // Update phone prefix if phone is empty or only has country code
      if (!phone || phone.length <= 4) {
        setPhone(defaults.phoneCode);
      }
    }
  };

  const validateStep1 = () => {
    try {
      businessInfoSchema.parse({ 
        businessName, 
        phone, 
        country: selectedCountry,
        currency: selectedCurrency,
        timezone: selectedTimezone,
      });
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
      .update({ 
        name: businessName, 
        phone,
        country_code: selectedCountry,
        currency_code: selectedCurrency,
        timezone: selectedTimezone,
        city: city || null,
      })
      .eq("id", organization.id);
    setIsSubmitting(false);

    if (error) {
      toast.error("Error al guardar información");
      return;
    }
    
    setCurrentStep(2);
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
        // trial_ends_at will be set automatically by the trigger
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Show processing state when returning from Stripe checkout
  if (isProcessingPayment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 gap-6 px-4">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-white">Procesando tu suscripción</h2>
          <p className="text-gray-400">Esto solo tomará unos segundos...</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onClick={handleManualRetry}
            disabled={manualRetryCount > 5}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Reintentar verificación
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            Ir al dashboard
          </Button>
        </div>
        {manualRetryCount > 0 && (
          <p className="text-sm text-gray-500">
            Reintentos: {manualRetryCount}/5
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Premium Dark Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950/30" />
      
      {/* Animated Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-blob animation-delay-4000" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Header */}
      <header className="relative z-10 bg-gray-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={sortavoLogo} 
              alt="Sortavo" 
              className="h-8 w-auto"
            />
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
                      ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                      : currentStep > step.id
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-800/50 text-gray-400 border border-white/10"
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
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500" 
                        : "bg-white/10"
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Step 1: Organization Info */}
        {currentStep === 1 && (
          <Card className="backdrop-blur-xl bg-gray-900/80 border-white/10 shadow-2xl shadow-emerald-500/10">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Información de tu Organización
              </CardTitle>
              <CardDescription className="text-gray-400">
                Cuéntanos sobre tu negocio para personalizar tu experiencia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-gray-300">Nombre del negocio *</Label>
                <Input
                  id="businessName"
                  placeholder="Ej: Rifas de Juan, Mi Tienda, Sorteos MX..."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={cn(
                    "bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500",
                    errors.businessName && "border-red-500"
                  )}
                />
                {errors.businessName && (
                  <p className="text-sm text-red-400">{errors.businessName}</p>
                )}
              </div>
              
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Teléfono de contacto *</Label>
                <SinglePhoneInput
                  value={phone}
                  onChange={setPhone}
                  error={errors.phone}
                  defaultCountryCode={COUNTRY_DEFAULTS[selectedCountry]?.phoneCode || "+52"}
                />
              </div>

              {/* City (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-2 text-gray-300">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  Ciudad (opcional)
                </Label>
                <Input
                  id="city"
                  placeholder="Ciudad de México, Bogotá, Miami..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              {/* Location & Currency Section */}
              <div className="space-y-4 p-4 rounded-lg bg-gray-800/30 border border-white/5">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                  <Globe className="h-4 w-4" />
                  Ubicación y Moneda
                </div>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-gray-300">País *</Label>
                    <Select value={selectedCountry} onValueChange={handleCountryChange}>
                      <SelectTrigger className="bg-gray-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Selecciona país" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && (
                      <p className="text-sm text-red-400">{errors.country}</p>
                    )}
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-gray-300">Moneda *</Label>
                    <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                      <SelectTrigger className="bg-gray-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Selecciona moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.flag} {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.currency && (
                      <p className="text-sm text-red-400">{errors.currency}</p>
                    )}
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-gray-300">Zona horaria *</Label>
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger className="bg-gray-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Selecciona zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.timezone && (
                      <p className="text-sm text-red-400">{errors.timezone}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleStep1Submit} 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Plan Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Elige tu plan
              </h1>
              <p className="text-gray-400 mt-1">
                Selecciona el plan que mejor se adapte a tus necesidades
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 bg-gray-800/60 backdrop-blur-sm rounded-full px-6 py-3 w-fit mx-auto shadow-lg shadow-emerald-500/10 border border-white/10">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all",
                  billingPeriod === "monthly"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  billingPeriod === "annual"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Anual
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  billingPeriod === "annual" 
                    ? "bg-white/20 text-white" 
                    : "bg-emerald-500/20 text-emerald-400"
                )}>
                  -16%
                </span>
              </button>
            </div>

            {/* Plan Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              {(Object.entries(STRIPE_PLANS) as [PlanKey, typeof STRIPE_PLANS.basic & { popular?: boolean; hasTrial?: boolean }][]).map(
                ([key, plan]) => {
                  const isBasic = key === 'basic';
                  const hasTrial = plan.hasTrial || false;
                  const PlanIcon = key === 'basic' ? Sparkles : key === 'pro' ? Zap : key === 'premium' ? Crown : Building2;
                  
                  return (
                    <Card
                      key={key}
                      className={cn(
                        "relative cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl backdrop-blur-xl",
                        selectedPlan === key 
                          ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20 bg-gray-800/90" 
                          : "bg-gray-900/80 hover:bg-gray-800/90 border-white/10",
                        "popular" in plan && plan.popular && "border-emerald-500/50"
                      )}
                      onClick={() => setSelectedPlan(key)}
                    >
                      {"popular" in plan && plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-1 text-xs font-medium text-white shadow-lg">
                          Más popular
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <PlanIcon className="h-5 w-5 text-emerald-400" />
                          <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            ${billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice}
                          </span>
                          <span className="text-sm text-gray-400">
                            /{billingPeriod === "annual" ? "año" : "mes"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Trial or Payment Notice */}
                        <div className="mb-4 min-h-[40px]">
                          {hasTrial ? (
                            <div className="space-y-1">
                              <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs">
                                <Gift className="w-3 h-3 mr-1" />
                                7 DÍAS GRATIS
                              </Badge>
                              <p className="text-[10px] text-emerald-600">
                                Sin cargo hasta terminar la prueba
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <CreditCard className="w-3 h-3" />
                              <span>Pago inmediato al suscribirte</span>
                            </div>
                          )}
                        </div>
                        
                        <ul className="space-y-2 text-sm text-gray-300">
                          {plan.limits && (
                            <>
                              <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-400" />
                                <span>{plan.limits.maxActiveRaffles >= 999 ? 'Ilimitados' : plan.limits.maxActiveRaffles} sorteos activos</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-400" />
                                <span>{plan.limits.maxTicketsPerRaffle.toLocaleString()} boletos/sorteo</span>
                              </li>
                            </>
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4 pt-4">
              <Button 
                onClick={handlePlanSelect}
                disabled={isSubmitting}
                size="lg"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    {STRIPE_PLANS[selectedPlan].hasTrial 
                      ? `Empezar prueba gratis de ${STRIPE_PLANS[selectedPlan].name}`
                      : `Suscribirse a ${STRIPE_PLANS[selectedPlan].name}`
                    }
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
