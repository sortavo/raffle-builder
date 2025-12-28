import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { StepStatus, ValidationError } from '@/hooks/useWizardValidation';

interface WizardProgressProps {
  currentStep: number;
  steps: { title: string; description: string }[];
  stepStatuses?: StepStatus[];
  stepErrors?: ValidationError[][];
}

export const WizardProgress = ({ currentStep, steps, stepStatuses, stepErrors }: WizardProgressProps) => {
  const getStepStatus = (index: number): 'complete' | 'incomplete' | 'current' => {
    if (stepStatuses) return stepStatuses[index] as 'complete' | 'incomplete' | 'current';
    const stepNumber = index + 1;
    if (stepNumber < currentStep) return 'complete';
    if (stepNumber === currentStep) return 'current';
    return 'incomplete';
  };

  const getStepErrors = (index: number): ValidationError[] => {
    if (stepErrors) return stepErrors[index] || [];
    return [];
  };

  return (
    <TooltipProvider>
      <div className="w-full py-2 md:py-4">
        {/* Mobile: Compact horizontal stepper with current step indicator */}
        <div className="md:hidden">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            {steps.map((_, index) => {
              const status = getStepStatus(index);
              const errors = getStepErrors(index);
              const isCurrent = status === 'current';
              const hasErrors = errors.length > 0 && !isCurrent;

              return (
                <div
                  key={index}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                    status === 'complete' && !hasErrors && 'bg-success text-success-foreground',
                    status === 'complete' && hasErrors && 'bg-warning text-warning-foreground',
                    status === 'current' && 'bg-primary text-primary-foreground ring-2 ring-primary/30 scale-110',
                    status === 'incomplete' && !hasErrors && 'bg-muted text-muted-foreground',
                    status === 'incomplete' && hasErrors && 'bg-warning/20 text-warning border border-warning'
                  )}
                >
                  {status === 'complete' && !hasErrors ? (
                    <Check className="w-4 h-4" />
                  ) : hasErrors ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm font-medium text-foreground">
            {steps[currentStep - 1].title}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Paso {currentStep} de {steps.length}
          </p>
        </div>

        {/* Desktop: Full horizontal stepper */}
        <div className="hidden md:flex items-center justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const status = getStepStatus(index);
            const errors = getStepErrors(index);
            const isLast = index === steps.length - 1;
            const isCurrent = status === 'current';
            const hasErrors = errors.length > 0 && !isCurrent;

            return (
              <div key={index} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all cursor-default',
                          status === 'complete' && !hasErrors && 'bg-success text-success-foreground',
                          status === 'complete' && hasErrors && 'bg-warning text-warning-foreground',
                          status === 'current' && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                          status === 'incomplete' && !hasErrors && 'bg-muted text-muted-foreground',
                          status === 'incomplete' && hasErrors && 'bg-warning/20 text-warning border-2 border-warning'
                        )}
                      >
                        {status === 'complete' && !hasErrors ? (
                          <Check className="w-5 h-5" />
                        ) : hasErrors ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          stepNumber
                        )}
                      </div>
                    </TooltipTrigger>
                    {hasErrors && !isCurrent && (
                      <TooltipContent side="bottom" className="max-w-[200px]">
                        <p className="font-medium text-warning mb-1">Campos pendientes:</p>
                        <ul className="text-xs space-y-0.5">
                          {errors.slice(0, 3).map((error, i) => (
                            <li key={i}>• {error.message}</li>
                          ))}
                          {errors.length > 3 && (
                            <li className="text-muted-foreground">+{errors.length - 3} más</li>
                          )}
                        </ul>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <div className="mt-2 text-center">
                    <p className={cn(
                      'text-sm font-medium',
                      status === 'current' && 'text-foreground',
                      status === 'complete' && !hasErrors && 'text-success',
                      status === 'complete' && hasErrors && 'text-warning',
                      status === 'incomplete' && !hasErrors && 'text-muted-foreground',
                      status === 'incomplete' && hasErrors && 'text-warning'
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-[120px]">
                      {step.description}
                    </p>
                  </div>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'flex-1 h-1 mx-4 rounded',
                      status === 'complete' && !hasErrors && 'bg-success',
                      status === 'complete' && hasErrors && 'bg-warning',
                      status !== 'complete' && 'bg-muted'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
