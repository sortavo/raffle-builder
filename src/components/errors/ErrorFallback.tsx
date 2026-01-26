import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground">
            Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
          </p>
        </div>

        {error && import.meta.env.DEV && (
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {resetError && (
            <Button onClick={resetError} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Intentar de nuevo
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
          >
            <Home className="w-4 h-4 mr-2" />
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
