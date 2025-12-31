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
      <div className="w-full">
        {/* Mobile: Clean compact stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const errors = getStepErrors(index);
              const isCurrent = status === 'current';
              const hasErrors = errors.length > 0 && !isCurrent;
              const isLast = index === steps.length - 1;

              return (
                <div key={index} className="flex items-center">
                  <div
                    className={cn(
                      'relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all',
                      status === 'complete' && !hasErrors && 'bg-success text-success-foreground',
                      status === 'complete' && hasErrors && 'bg-warning text-warning-foreground',
                      status === 'current' && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background',
                      status === 'incomplete' && !hasErrors && 'bg-muted text-muted-foreground',
                      status === 'incomplete' && hasErrors && 'bg-warning/20 text-warning border border-warning/40'
                    )}
                  >
                    {status === 'complete' && !hasErrors ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : hasErrors ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {!isLast && (
                    <div className={cn(
                      'w-4 h-0.5 mx-0.5 rounded-full',
                      status === 'complete' ? 'bg-success' : 'bg-border'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm font-medium text-foreground">
            {steps[currentStep - 1].title}
          </p>
          <p className="text-center text-xs text-muted-foreground mt-0.5">
            {steps[currentStep - 1].description}
          </p>
        </div>

        {/* Desktop: Clean horizontal stepper */}
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
                          'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold transition-all cursor-default',
                          status === 'complete' && !hasErrors && 'bg-success text-success-foreground',
                          status === 'complete' && hasErrors && 'bg-warning text-warning-foreground',
                          status === 'current' && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
                          status === 'incomplete' && !hasErrors && 'bg-muted text-muted-foreground',
                          status === 'incomplete' && hasErrors && 'bg-warning/20 text-warning border border-warning/40'
                        )}
                      >
                        {status === 'complete' && !hasErrors ? (
                          <Check className="w-4 h-4" />
                        ) : hasErrors ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          stepNumber
                        )}
                      </div>
                    </TooltipTrigger>
                    {hasErrors && !isCurrent && (
                      <TooltipContent side="bottom" className="max-w-[200px]">
                        <p className="font-medium text-warning text-xs mb-1">Pendientes:</p>
                        <ul className="text-xs space-y-0.5 text-muted-foreground">
                          {errors.slice(0, 3).map((error, i) => (
                            <li key={i}>• {error.message}</li>
                          ))}
                          {errors.length > 3 && (
                            <li className="text-muted-foreground/70">+{errors.length - 3} más</li>
                          )}
                        </ul>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <div className="mt-2 text-center">
                    <p className={cn(
                      'text-sm font-medium transition-colors',
                      status === 'current' && 'text-foreground',
                      status === 'complete' && 'text-success',
                      status === 'incomplete' && 'text-muted-foreground',
                      hasErrors && 'text-warning'
                    )}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {!isLast && (
                  <div className="flex-1 mx-3 h-0.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        status === 'complete' && 'bg-success w-full',
                        status === 'current' && 'bg-primary/50 w-1/2',
                        status === 'incomplete' && 'w-0'
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
