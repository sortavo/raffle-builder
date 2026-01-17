import { forwardRef, useId } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  labelClassName?: string;
}

/**
 * Accessible form field with proper labeling and error announcements.
 * WCAG 1.3.1: Info and Relationships
 * WCAG 3.3.1: Error Identification
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      className,
      labelClassName,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const describedBy = [
      helperText && !error ? helperId : null,
      error ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className={cn('flex items-center gap-1', labelClassName)}>
          {label}
          {required && (
            <>
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(requerido)</span>
            </>
          )}
        </Label>

        <Input
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />

        {helperText && !error && (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
