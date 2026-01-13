import { useState } from "react";
import { Shield, Smartphone, Copy, Check, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { useMFA } from "@/hooks/useMFA";
import { toast } from "sonner";

interface MFAEnrollmentProps {
  onComplete: () => void;
}

export function MFAEnrollment({ onComplete }: MFAEnrollmentProps) {
  const { enroll, verifyEnrollment, error, clearError } = useMFA();
  const [step, setStep] = useState<"intro" | "scan" | "verify">("intro");
  const [enrollmentData, setEnrollmentData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartEnrollment = async () => {
    setIsLoading(true);
    clearError();
    
    const result = await enroll("Sortavo Admin");
    
    if (result) {
      setEnrollmentData(result);
      setStep("scan");
    } else {
      toast.error("Error al iniciar la configuración MFA");
    }
    
    setIsLoading(false);
  };

  const handleVerify = async () => {
    if (!enrollmentData || code.length !== 6) return;
    
    setIsLoading(true);
    clearError();
    
    const success = await verifyEnrollment(enrollmentData.factorId, code);
    
    if (success) {
      toast.success("Autenticación de dos factores activada correctamente");
      onComplete();
    } else {
      setCode("");
    }
    
    setIsLoading(false);
  };

  const copySecret = async () => {
    if (!enrollmentData) return;
    
    await navigator.clipboard.writeText(enrollmentData.secret);
    setCopied(true);
    toast.success("Código secreto copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl shadow-primary/10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent shadow-xl shadow-primary/25 w-fit">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Configurar Autenticación de Dos Factores
            </CardTitle>
            <CardDescription className="mt-2">
              La autenticación de dos factores es obligatoria para acceder al panel de Super Admin
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "intro" && (
            <>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Necesitarás una app autenticadora
                </h3>
                <p className="text-sm text-muted-foreground">
                  Descarga una de estas aplicaciones en tu teléfono:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>Google Authenticator</li>
                  <li>Authy</li>
                  <li>1Password</li>
                  <li>Microsoft Authenticator</li>
                </ul>
              </div>

              <Button 
                onClick={handleStartEnrollment} 
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Comenzar configuración
              </Button>
            </>
          )}

          {step === "scan" && enrollmentData && (
            <>
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Escanea este código QR con tu aplicación autenticadora
                </p>
                
                <div 
                  className="mx-auto bg-white p-4 rounded-xl w-fit shadow-lg"
                  dangerouslySetInnerHTML={{ __html: enrollmentData.qrCode }}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">o ingresa manualmente</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                  <code className="flex-1 text-xs font-mono break-all text-foreground">
                    {enrollmentData.secret}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copySecret}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={() => setStep("verify")}
                className="w-full"
              >
                Continuar
              </Button>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ingresa el código de 6 dígitos de tu aplicación autenticadora
                </p>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(value);
                      clearError();
                    }}
                    disabled={isLoading}
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
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="space-y-2">
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
                  Activar MFA
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={() => setStep("scan")}
                  className="w-full"
                  disabled={isLoading}
                >
                  Volver a escanear
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
