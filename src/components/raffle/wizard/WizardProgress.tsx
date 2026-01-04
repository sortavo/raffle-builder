import { Check, AlertCircle, FileText, Trophy, Ticket, Calendar, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { StepStatus, ValidationError } from '@/hooks/useWizardValidation';

interface WizardProgressProps {
  currentStep: number;
  steps: { title: string; description: string }[];
  stepStatuses?: StepStatus[];
  stepErrors?: ValidationError[][];
}

// Icon mapping for each step
const STEP_ICONS: Record<number, React.ElementType> = {
  1: FileText,   // Información Básica
  2: Trophy,     // Premio
  3: Ticket,     // Boletos
  4: Calendar,   // Sorteo
  5: Palette     // Diseño
};

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
        {/* Mobile: Compact icon stepper */}
        <div className="md:hidden">
          <div className="flex items-center justify-center gap-1 mb-2">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const errors = getStepErrors(index);
              const isCurrent = status === 'current';
              const hasErrors = errors.length > 0 && !isCurrent;
              const isLast = index === steps.length - 1;
              const StepIcon = STEP_ICONS[index + 1] || FileText;

              return (
                <div key={index} className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300',
                          'hover:-translate-y-0.5',
                          status === 'complete' && !hasErrors && 'bg-success text-success-foreground',
                          status === 'complete' && hasErrors && 'bg-warning text-warning-foreground',
                          status === 'current' && 'bg-primary text-primary-foreground',
                          status === 'incomplete' && !hasErrors && 'bg-muted text-muted-foreground',
                          status === 'incomplete' && hasErrors && 'bg-warning/20 text-warning border border-warning/40'
                        )}
                      >
                        {/* Ping animation for current step */}
                        {status === 'current' && (
                          <span className="absolute inset-0 rounded-lg animate-ping bg-primary/30" />
                        )}
                        
                        {status === 'complete' && !hasErrors ? (
                          <Check className="w-3 h-3 animate-bounce" />
                        ) : hasErrors ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          <StepIcon className="w-3 h-3 relative z-10" />
                        )}
                        
                        {/* Error badge */}
                        {hasErrors && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 p-0 text-[8px] flex items-center justify-center animate-pulse"
                          >
                            {errors.length}
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <div className="space-y-1">
                        <p className="font-semibold text-xs">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                        {hasErrors && (
                          <div className="pt-1 border-t border-border/50">
                            <ul className="text-xs space-y-0.5">
                              {errors.slice(0, 2).map((error, i) => (
                                <li key={i} className="text-destructive">• {error.message}</li>
                              ))}
                              {errors.length > 2 && (
                                <li className="text-muted-foreground">+{errors.length - 2} más</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  {!isLast && (
                    <div className={cn(
                      'w-3 h-px mx-0.5 rounded-full transition-all duration-500',
                      status === 'complete' ? 'bg-gradient-to-r from-success to-primary' : 'bg-border'
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

        {/* Desktop: Compact horizontal stepper with inline titles */}
        <div className="hidden md:flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const errors = getStepErrors(index);
            const isLast = index === steps.length - 1;
            const isCurrent = status === 'current';
            const hasErrors = errors.length > 0 && !isCurrent;
            const StepIcon = STEP_ICONS[index + 1] || FileText;

            return (
              <div key={index} className="flex items-center flex-1">
                <div className="flex items-center gap-2.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300',
                          'hover:-translate-y-0.5 cursor-default',
                          status === 'complete' && !hasErrors && 'bg-success text-success-foreground ring-2 ring-success/20 ring-offset-1 ring-offset-background',
                          status === 'complete' && hasErrors && 'bg-warning text-warning-foreground',
                          status === 'current' && 'bg-primary text-primary-foreground',
                          status === 'incomplete' && !hasErrors && 'bg-muted text-muted-foreground',
                          status === 'incomplete' && hasErrors && 'bg-warning/20 text-warning border border-warning/40'
                        )}
                      >
                        {/* Ping animation for current step */}
                        {status === 'current' && (
                          <span className="absolute inset-0 rounded-lg animate-ping bg-primary/30" />
                        )}
                        
                        {status === 'complete' && !hasErrors ? (
                          <Check className="w-4 h-4 animate-bounce" />
                        ) : hasErrors ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <StepIcon className="w-4 h-4 relative z-10" />
                        )}
                        
                        {/* Error badge */}
                        {hasErrors && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 p-0 text-[10px] flex items-center justify-center animate-pulse"
                          >
                            {errors.length}
                          </Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px]">
                      <div className="space-y-1.5">
                        <p className="font-semibold text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                        {hasErrors && (
                          <div className="pt-1.5 border-t border-border/50">
                            <p className="font-medium text-destructive text-xs mb-1">
                              {errors.length} pendiente{errors.length > 1 ? 's' : ''}
                            </p>
                            <ul className="text-xs space-y-0.5">
                              {errors.slice(0, 3).map((error, i) => (
                                <li key={i} className="text-destructive/80">• {error.message}</li>
                              ))}
                              {errors.length > 3 && (
                                <li className="text-muted-foreground">+{errors.length - 3} más</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Inline title */}
                  <span className={cn(
                    'text-sm font-semibold transition-colors whitespace-nowrap',
                    status === 'current' && 'text-foreground',
                    status === 'complete' && !hasErrors && 'text-success',
                    status === 'complete' && hasErrors && 'text-warning',
                    status === 'incomplete' && !hasErrors && 'text-muted-foreground',
                    status === 'incomplete' && hasErrors && 'text-warning'
                  )}>
                    {step.title}
                  </span>
                </div>
                
                {/* Connector */}
                {!isLast && (
                  <div className="flex-1 mx-3 h-px bg-border rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        status === 'complete' && 'bg-gradient-to-r from-success to-primary w-full',
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
