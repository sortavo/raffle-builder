import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressiveLoaderProps {
  steps: string[];
  currentStep: number;
}

export function ProgressiveLoader({ steps, currentStep }: ProgressiveLoaderProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div 
            key={index} 
            className={cn(
              "flex items-center gap-3 transition-all duration-300",
              isPending && "opacity-50"
            )}
          >
            {isComplete && (
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            {isCurrent && (
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
            )}
            {isPending && (
              <div className="h-6 w-6 rounded-full border-2 border-muted" />
            )}

            <span className={cn(
              "text-sm font-medium transition-colors",
              isComplete && "text-primary",
              isCurrent && "text-foreground",
              isPending && "text-muted-foreground"
            )}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
