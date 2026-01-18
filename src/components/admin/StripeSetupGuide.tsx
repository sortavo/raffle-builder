import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  RefreshCw,
  Copy,
  CreditCard,
  Settings,
  Key
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StripeSetupGuideProps {
  onSetupComplete?: () => void;
}

interface CheckResult {
  connected: boolean;
  mode: 'test' | 'live' | null;
  hasProducts: boolean;
  productCount: number;
  error?: string;
}

export function StripeSetupGuide({ onSetupComplete }: StripeSetupGuideProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const checkStripeConnection = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('health-check', {
        body: { checkStripe: true }
      });

      if (error) {
        setResult({
          connected: false,
          mode: null,
          hasProducts: false,
          productCount: 0,
          error: error.message,
        });
      } else {
        setResult({
          connected: data.stripe?.connected || false,
          mode: data.stripe?.mode || null,
          hasProducts: data.stripe?.productCount > 0,
          productCount: data.stripe?.productCount || 0,
        });

        if (data.stripe?.connected && data.stripe?.productCount > 0) {
          toast.success("Stripe configurado correctamente");
          onSetupComplete?.();
        }
      }
    } catch (err) {
      setResult({
        connected: false,
        mode: null,
        hasProducts: false,
        productCount: 0,
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const steps = [
    {
      number: 1,
      title: "Crear cuenta de Stripe",
      description: "Si no tienes cuenta, crea una en stripe.com",
      link: "https://dashboard.stripe.com/register",
      completed: result?.connected,
    },
    {
      number: 2,
      title: "Crear productos en Stripe",
      description: "Crea 4 productos: Basic, Pro, Premium, Enterprise",
      link: "https://dashboard.stripe.com/products",
      completed: result?.hasProducts,
      details: [
        "Basic - $49/mes o $490/año",
        "Pro - $149/mes o $1,490/año", 
        "Premium - $299/mes o $2,990/año",
        "Enterprise - $499/mes o $4,990/año",
      ],
    },
    {
      number: 3,
      title: "Configurar precios recurrentes",
      description: "Cada producto necesita 2 precios: mensual y anual",
      link: "https://dashboard.stripe.com/products",
      completed: result?.productCount >= 4,
    },
    {
      number: 4,
      title: "Agregar API Keys",
      description: "Copia las keys de Stripe a Supabase Edge Functions",
      link: "https://supabase.com/dashboard/project/xnwqrgumstikdmsxtame/settings/functions",
      secrets: [
        { name: "STRIPE_SECRET_KEY", description: "sk_live_... o sk_test_..." },
        { name: "STRIPE_WEBHOOK_SECRET", description: "whsec_..." },
      ],
    },
    {
      number: 5,
      title: "Configurar Webhook",
      description: "Agrega el endpoint de webhook en Stripe",
      link: "https://dashboard.stripe.com/webhooks",
      details: [
        "URL: https://xnwqrgumstikdmsxtame.supabase.co/functions/v1/stripe-webhook",
        "Eventos: checkout.session.completed, customer.subscription.*, invoice.*",
      ],
    },
    {
      number: 6,
      title: "Actualizar IDs en código",
      description: "Actualiza src/lib/stripe-config.ts con los nuevos IDs",
      completed: result?.hasProducts,
    },
  ];

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-amber-800 dark:text-amber-200">
            Configuración de Stripe
          </CardTitle>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          Sigue estos pasos para configurar Stripe en tu proyecto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {result?.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de conexión</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        {result?.connected && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">
              Stripe conectado
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Modo: <Badge variant="outline">{result.mode?.toUpperCase()}</Badge>
              {" • "}
              Productos: {result.productCount}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`p-4 rounded-lg border ${
                step.completed
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.number}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {step.description}
                  </p>

                  {step.details && (
                    <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span>{detail}</span>
                          {detail.includes("URL:") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => copyToClipboard(
                                "https://xnwqrgumstikdmsxtame.supabase.co/functions/v1/stripe-webhook",
                                "URL"
                              )}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {step.secrets && (
                    <div className="mt-2 space-y-1">
                      {step.secrets.map((secret) => (
                        <div
                          key={secret.name}
                          className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
                        >
                          <Key className="h-3 w-3 text-gray-500" />
                          <code className="text-xs">{secret.name}</code>
                          <span className="text-gray-500">—</span>
                          <span className="text-gray-600 dark:text-gray-400 text-xs">
                            {secret.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                    >
                      Abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={checkStripeConnection}
            disabled={checking}
            className="flex-1"
          >
            {checking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Verificar configuración
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe Dashboard
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
