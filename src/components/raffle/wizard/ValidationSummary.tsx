import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, ArrowRight, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepValidation } from '@/hooks/useWizardValidation';

interface ValidationSummaryProps {
  stepValidations: StepValidation[];
  canPublish: boolean;
  hasPaymentMethods: boolean;
  onNavigateToStep: (step: number) => void;
}

export function ValidationSummary({ 
  stepValidations, 
  canPublish, 
  hasPaymentMethods,
  onNavigateToStep 
}: ValidationSummaryProps) {
  const stepsWithErrors = stepValidations.filter(sv => !sv.isValid && sv.step !== 5);
  const isReady = canPublish && hasPaymentMethods;

  if (isReady) {
    return (
      <Alert className="border-success/50 bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertTitle className="text-success">¡Listo para publicar!</AlertTitle>
        <AlertDescription>
          Todos los campos requeridos están completos. Tu sorteo está listo para ser publicado.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning text-base">
          <AlertTriangle className="h-5 w-5" />
          Campos requeridos pendientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stepsWithErrors.map((stepValidation) => (
          <div key={stepValidation.step} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">
                Paso {stepValidation.step}: {stepValidation.title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToStep(stepValidation.step)}
                className="h-7 text-xs text-primary hover:text-primary"
              >
                Ir al paso
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <ul className="space-y-1 ml-4">
              {stepValidation.errors.map((error, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {!hasPaymentMethods && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-destructive">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm font-medium">Métodos de pago</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-6">
              Configura al menos un método de pago antes de publicar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
