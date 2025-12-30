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
        {/* Mobile: Premium compact stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-center gap-2 mb-3">
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
                      'relative w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300',
                      status === 'complete' && !hasErrors && 'bg-gradient-to-br from-success to-success/80 text-success-foreground shadow-md shadow-success/25',
                      status === 'complete' && hasErrors && 'bg-gradient-to-br from-warning to-warning/80 text-warning-foreground shadow-md shadow-warning/25',
                      status === 'current' && 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-lg shadow-primary/30 scale-110',
                      status === 'incomplete' && !hasErrors && 'bg-muted/80 text-muted-foreground border border-border/50',
                      status === 'incomplete' && hasErrors && 'bg-warning/10 text-warning border-2 border-warning/50'
                    )}
                  >
                    {status === 'complete' && !hasErrors ? (
                      <Check className="w-4 h-4" />
                    ) : hasErrors ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                    {isCurrent && (
                      <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-sm animate-pulse" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={cn(
                      'w-4 h-0.5 mx-1 rounded-full transition-colors',
                      status === 'complete' ? 'bg-gradient-to-r from-success to-success/50' : 'bg-border/50'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-sm font-semibold text-foreground">
            {steps[currentStep - 1].title}
          </p>
        </div>

        {/* Desktop: Premium horizontal stepper */}
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
                      <div className="relative">
                        <div
                          className={cn(
                            'relative w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 cursor-default',
                            status === 'complete' && !hasErrors && 'bg-gradient-to-br from-success to-success/80 text-success-foreground shadow-lg shadow-success/25',
                            status === 'complete' && hasErrors && 'bg-gradient-to-br from-warning to-warning/80 text-warning-foreground shadow-lg shadow-warning/25',
                            status === 'current' && 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-4 ring-primary/20 shadow-xl shadow-primary/30',
                            status === 'incomplete' && !hasErrors && 'bg-muted/80 text-muted-foreground border border-border/50',
                            status === 'incomplete' && hasErrors && 'bg-warning/10 text-warning border-2 border-warning/50'
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
                        {isCurrent && (
                          <div className="absolute -inset-1.5 bg-primary/15 rounded-2xl blur-md animate-pulse" />
                        )}
                      </div>
                    </TooltipTrigger>
                    {hasErrors && !isCurrent && (
                      <TooltipContent side="bottom" className="max-w-[220px] bg-card border-border/50 shadow-xl">
                        <p className="font-semibold text-warning mb-1.5">Campos pendientes:</p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {errors.slice(0, 3).map((error, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-warning">•</span>
                              {error.message}
                            </li>
                          ))}
                          {errors.length > 3 && (
                            <li className="text-muted-foreground/70 italic">+{errors.length - 3} más...</li>
                          )}
                        </ul>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <div className="mt-3 text-center">
                    <p className={cn(
                      'text-sm font-semibold transition-colors',
                      status === 'current' && 'text-foreground',
                      status === 'complete' && !hasErrors && 'text-success',
                      status === 'complete' && hasErrors && 'text-warning',
                      status === 'incomplete' && !hasErrors && 'text-muted-foreground',
                      status === 'incomplete' && hasErrors && 'text-warning'
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5 max-w-[100px]">
                      {step.description}
                    </p>
                  </div>
                </div>
                {!isLast && (
                  <div className="flex-1 mx-4 relative h-1">
                    <div className="absolute inset-0 bg-muted/50 rounded-full" />
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                        status === 'complete' && !hasErrors && 'bg-gradient-to-r from-success to-success/70 w-full',
                        status === 'complete' && hasErrors && 'bg-gradient-to-r from-warning to-warning/70 w-full',
                        status === 'current' && 'bg-gradient-to-r from-primary/50 to-transparent w-1/2',
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
