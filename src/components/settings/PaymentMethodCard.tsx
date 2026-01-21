import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

const brandLogos: Record<string, string> = {
  visa: "💳 Visa",
  mastercard: "💳 Mastercard",
  amex: "💳 Amex",
  discover: "💳 Discover",
};

// Issue 7: Helper functions for card expiration detection
const isCardExpiringSoon = (expMonth: number, expYear: number): boolean => {
  const now = new Date();
  const expDate = new Date(expYear, expMonth - 1); // Month is 0-indexed
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return expDate <= thirtyDaysFromNow;
};

const isCardExpired = (expMonth: number, expYear: number): boolean => {
  const now = new Date();
  const expDate = new Date(expYear, expMonth); // End of expiration month
  return expDate < now;
};

export function PaymentMethodCard() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    fetchPaymentMethod();
  }, []);

  const fetchPaymentMethod = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-payment-method");
      if (error) throw error;
      setPaymentMethod(data?.payment_method || null);
    } catch (error) {
      console.error("Error fetching payment method:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCard = async () => {
    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        // L9: Visual confirmation toast before redirect
        toast.success("Abriendo portal de pagos...");
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Error al abrir el portal. Intenta de nuevo.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Método de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-20 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Método de Pago
        </CardTitle>
        <CardDescription>
          Tu tarjeta registrada para la facturación
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-muted text-2xl font-bold uppercase">
                {paymentMethod.brand.slice(0, 4)}
              </div>
              <div>
                <p className="font-medium">
                  {brandLogos[paymentMethod.brand.toLowerCase()] || `💳 ${paymentMethod.brand}`}
                </p>
                <p className="text-lg font-mono">
                  •••• •••• •••• {paymentMethod.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expira: {String(paymentMethod.exp_month).padStart(2, "0")}/{paymentMethod.exp_year}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleUpdateCard} disabled={isPortalLoading}>
              {isPortalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Actualizar Tarjeta
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              No tienes un método de pago registrado
            </p>
            <Button variant="outline" onClick={handleUpdateCard} disabled={isPortalLoading}>
              {isPortalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Agregar Tarjeta
            </Button>
          </div>
        )}
        
        {/* Issue 7: Card expiration warnings */}
        {paymentMethod && isCardExpired(paymentMethod.exp_month, paymentMethod.exp_year) && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tu tarjeta ha expirado. Por favor actualiza tu método de pago.
            </AlertDescription>
          </Alert>
        )}

        {paymentMethod && !isCardExpired(paymentMethod.exp_month, paymentMethod.exp_year) &&
         isCardExpiringSoon(paymentMethod.exp_month, paymentMethod.exp_year) && (
          <Alert className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Tu tarjeta expira pronto. Considera actualizar tu método de pago.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
