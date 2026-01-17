import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccessibleLoaderProps {
  /** Text announced to screen readers */
  loadingText?: string;
  /** Visual text shown below spinner (optional) */
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * An accessible loading indicator that announces to screen readers.
 * WCAG 4.1.2: Name, Role, Value
 */
export function AccessibleLoader({
  loadingText = 'Cargando...',
  showText = false,
  size = 'md',
  className,
}: AccessibleLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('flex flex-col items-center justify-center gap-2', className)}
    >
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size])}
        aria-hidden="true"
      />
      {showText && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          {loadingText}
        </span>
      )}
      {/* Screen reader only text */}
      <span className="sr-only">{loadingText}</span>
    </div>
  );
}
