import { useState } from "react";
import { useMFA } from "@/hooks/useMFA";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, ShieldAlert, Smartphone, Copy, Check, Loader2, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

export function SecuritySettings() {
  const { 
    isEnrolled, 
    isLoading, 
    factors, 
    currentLevel,
    enroll, 
    verifyEnrollment, 
    unenroll,
    checkMFAStatus 
  } = useMFA();

  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [unenrollCode, setUnenrollCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [step, setStep] = useState<"intro" | "scan" | "verify">("intro");

  const activeFactor = factors.find(f => f.status === "verified");

  const handleStartEnrollment = async () => {
    setIsProcessing(true);
    try {
      const result = await enroll("Sortavo Admin");
      if (result) {
        setEnrollmentData({
          factorId: result.factorId,
          qr: result.qrCode,
          secret: result.secret
        });
        setStep("scan");
      }
    } catch (error) {
      toast.error("Error al iniciar configuración MFA");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!enrollmentData || verifyCode.length !== 6) return;
    
    setIsProcessing(true);
    try {
      const success = await verifyEnrollment(enrollmentData.factorId, verifyCode);
      if (success) {
        toast.success("MFA configurado correctamente");
        setShowEnrollDialog(false);
        resetEnrollmentState();
        await checkMFAStatus();
      }
    } catch (error) {
      toast.error("Código inválido. Inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnenroll = async () => {
    if (!activeFactor) return;
    
    setIsProcessing(true);
    try {
      const success = await unenroll(activeFactor.id);
      if (success) {
        toast.success("MFA desactivado correctamente");
        setShowUnenrollDialog(false);
        setUnenrollCode("");
        await checkMFAStatus();
      }
    } catch (error) {
      toast.error("Error al desactivar MFA");
    } finally {
      setIsProcessing(false);
    }
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setSecretCopied(true);
      toast.success("Código copiado al portapapeles");
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const resetEnrollmentState = () => {
    setEnrollmentData(null);
    setVerifyCode("");
    setStep("intro");
    setSecretCopied(false);
  };

  const handleCloseEnrollDialog = () => {
    setShowEnrollDialog(false);
    resetEnrollmentState();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Seguridad de la Cuenta
          </CardTitle>
          <CardDescription>
            Gestiona la autenticación de dos factores (MFA) para proteger tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MFA Status Card */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${isEnrolled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                  {isEnrolled ? (
                    <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">Autenticación de Dos Factores (2FA)</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isEnrolled 
                      ? "Tu cuenta está protegida con autenticación de dos factores"
                      : "Agrega una capa extra de seguridad a tu cuenta"
                    }
                  </p>
                </div>
              </div>
              <Badge variant={isEnrolled ? "default" : "secondary"}>
                {isEnrolled ? "Activado" : "No configurado"}
              </Badge>
            </div>

            {isEnrolled && activeFactor && (
              <div className="pl-11 space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Método: </span>
                  <span className="font-medium">Aplicación autenticadora (TOTP)</span>
                </div>
                {activeFactor.friendly_name && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Nombre: </span>
                    <span className="font-medium">{activeFactor.friendly_name}</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-muted-foreground">Nivel actual: </span>
                  <Badge variant="outline" className="ml-1">
                    {currentLevel === "aal2" ? "Verificado (AAL2)" : "Sesión básica (AAL1)"}
                  </Badge>
                </div>
              </div>
            )}

            <div className="pl-11">
              {isEnrolled ? (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowUnenrollDialog(true)}
                >
                  Desactivar MFA
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => setShowEnrollDialog(true)}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Configurar MFA
                </Button>
              )}
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              La autenticación de dos factores es <strong>obligatoria</strong> para acceder al panel de Super Admin. 
              Si desactivas MFA, perderás el acceso hasta que lo configures nuevamente.
            </AlertDescription>
          </Alert>

          {/* Authenticator Apps Info */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium mb-2">Aplicaciones autenticadoras compatibles</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Google Authenticator</li>
              <li>• Microsoft Authenticator</li>
              <li>• Authy</li>
              <li>• 1Password</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={handleCloseEnrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Configurar Autenticación 2FA
            </DialogTitle>
            <DialogDescription>
              {step === "intro" && "Protege tu cuenta con autenticación de dos factores"}
              {step === "scan" && "Escanea el código QR con tu aplicación autenticadora"}
              {step === "verify" && "Ingresa el código de verificación"}
            </DialogDescription>
          </DialogHeader>

          {step === "intro" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm">Para configurar 2FA necesitarás:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Una aplicación autenticadora en tu teléfono</li>
                  <li>2. Escanear un código QR</li>
                  <li>3. Verificar con un código de 6 dígitos</li>
                </ul>
              </div>
              <Button 
                className="w-full" 
                onClick={handleStartEnrollment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  "Comenzar configuración"
                )}
              </Button>
            </div>
          )}

          {step === "scan" && enrollmentData && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={enrollmentData.qr} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  ¿No puedes escanear? Ingresa este código manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                    {enrollmentData.secret}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={copySecret}
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => setStep("verify")}
              >
                Ya escaneé el código
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Ingresa el código de 6 dígitos de tu aplicación autenticadora
              </p>
              
              <div className="flex justify-center">
                <InputOTP 
                  maxLength={6} 
                  value={verifyCode}
                  onChange={setVerifyCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                className="w-full" 
                onClick={handleVerifyEnrollment}
                disabled={verifyCode.length !== 6 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar y activar"
                )}
              </Button>

              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setStep("scan")}
              >
                Volver al código QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unenroll Confirmation Dialog */}
      <Dialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Desactivar Autenticación 2FA
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará la protección adicional de tu cuenta
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Advertencia:</strong> Si desactivas MFA, perderás acceso al panel de Super Admin hasta que lo configures nuevamente.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowUnenrollDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={handleUnenroll}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desactivando...
                </>
              ) : (
                "Confirmar desactivación"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
