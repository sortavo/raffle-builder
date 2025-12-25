import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  steps: { title: string; description: string }[];
}

export const WizardProgress = ({ currentStep, steps }: WizardProgressProps) => {
  return (
    <div className="w-full py-2 sm:py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 sm:ring-4 ring-primary/20',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : stepNumber}
                </div>
                <div className="mt-1 sm:mt-2 text-center hidden sm:block">
                  <p className={cn(
                    'text-sm font-medium',
                    (isCurrent || isCompleted) ? 'text-foreground' : 'text-muted-foreground'
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
                    'flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4 rounded',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
