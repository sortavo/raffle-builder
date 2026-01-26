import { useState } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bug, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function BuggyComponent(): JSX.Element {
  throw new Error("🐛 Error de prueba: Este error fue lanzado intencionalmente para probar Sentry");
}

export default function SentryTest() {
  const [showBuggyComponent, setShowBuggyComponent] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const handleCaptureException = () => {
    try {
      throw new Error("🧪 Error capturado manualmente con Sentry.captureException()");
    } catch (error) {
      Sentry.captureException(error);
      toast.success("Error enviado a Sentry via captureException()");
      setMessageSent(true);
    }
  };

  const handleCaptureMessage = () => {
    Sentry.captureMessage("📨 Mensaje de prueba enviado desde SentryTest", "info");
    toast.success("Mensaje enviado a Sentry via captureMessage()");
    setMessageSent(true);
  };

  const handleTriggerUnhandledError = () => {
    setShowBuggyComponent(true);
  };

  if (showBuggyComponent) {
    return <BuggyComponent />;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">🔬 Sentry Test Page</h1>
          <p className="text-muted-foreground">
            Usa estos botones para verificar que Sentry está capturando errores correctamente
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Capturar Mensaje
            </CardTitle>
            <CardDescription>
              Envía un mensaje informativo a Sentry sin lanzar un error
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCaptureMessage} variant="outline" className="w-full">
              Enviar mensaje a Sentry
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Capturar Excepción
            </CardTitle>
            <CardDescription>
              Captura una excepción manejada con try/catch y la envía a Sentry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCaptureException} variant="secondary" className="w-full">
              Capturar excepción manejada
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error No Manejado (Error Boundary)
            </CardTitle>
            <CardDescription>
              Lanza un error no manejado que será capturado por el ErrorBoundary de Sentry.
              <strong className="text-destructive"> ¡Esto mostrará la pantalla de error!</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTriggerUnhandledError} variant="destructive" className="w-full">
              Lanzar error no manejado
            </Button>
          </CardContent>
        </Card>

        {messageSent && (
          <Card className="border-green-500 bg-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    ¡Evento enviado a Sentry!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Revisa tu dashboard de Sentry para ver el evento capturado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Proyecto Sentry: sortavo</p>
          <p>Ambiente: {import.meta.env.PROD ? "production" : "development"}</p>
        </div>
      </div>
    </div>
  );
}
