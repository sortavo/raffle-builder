import { useState, useEffect } from "react";
import { Shield, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { useMFA } from "@/hooks/useMFA";
import { toast } from "sonner";

interface MFAVerificationProps {
  onComplete: () => void;
}

export function MFAVerification({ onComplete }: MFAVerificationProps) {
  const { verify, error, clearError } = useMFA();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    
    setIsLoading(true);
    clearError();
    
    const success = await verify(code);
    
    if (success) {
      toast.success("Verificación exitosa");
      onComplete();
    } else {
      setCode("");
    }
    
    setIsLoading(false);
  };

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6 && !isLoading) {
      handleVerify();
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-xl shadow-orange-500/25 w-fit">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              Verificación de Seguridad
            </CardTitle>
            <CardDescription className="mt-2">
              Ingresa el código de tu aplicación autenticadora para continuar al panel de Super Admin
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  clearError();
                }}
                disabled={isLoading}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p className="text-sm text-destructive animate-shake">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Abre tu aplicación autenticadora (Google Authenticator, Authy, etc.) e ingresa el código de 6 dígitos
            </p>
          </div>

          <Button 
            onClick={handleVerify}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
            disabled={code.length !== 6 || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Verificar y continuar
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              ¿Problemas con el código?{" "}
              <a href="mailto:soporte@sortavo.com" className="text-primary hover:underline">
                Contactar soporte
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
