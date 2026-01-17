import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FieldError {
  field: string;
  message: string;
}

interface ErrorSummaryProps {
  errors: FieldError[];
  title?: string;
  className?: string;
}

/**
 * Accessible error summary that focuses on mount.
 * Announces errors to screen readers and provides links to fields.
 * WCAG 3.3.1: Error Identification
 */
export function ErrorSummary({
  errors,
  title = 'Por favor corrige los siguientes errores:',
  className,
}: ErrorSummaryProps) {
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) {
      // Focus the summary for screen reader announcement
      summaryRef.current?.focus();
    }
  }, [errors]);

  if (errors.length === 0) return null;

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, fieldId: string) => {
    e.preventDefault();
    const element = document.getElementById(fieldId);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Alert
      ref={summaryRef}
      variant="destructive"
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className={className}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle id="error-summary-title">{title}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc list-inside space-y-1">
          {errors.map(({ field, message }) => (
            <li key={field}>
              <a
                href={`#${field}`}
                onClick={(e) => handleLinkClick(e, field)}
                className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
              >
                {message}
              </a>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
