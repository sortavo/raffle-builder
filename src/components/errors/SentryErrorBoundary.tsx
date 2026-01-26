import * as Sentry from "@sentry/react";
import { ErrorFallback } from "./ErrorFallback";
import { ReactNode } from "react";

interface SentryErrorBoundaryProps {
  children: ReactNode;
}

export function SentryErrorBoundary({ children }: SentryErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorFallback error={error as Error} resetError={resetError} />
      )}
      showDialog
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
