/**
 * Custom error types for edge functions
 * Used to distinguish between retryable and non-retryable errors
 */

/**
 * Critical error that should trigger retries (e.g., from Stripe webhooks)
 * Use for transient failures like database issues
 */
export class CriticalError extends Error {
  constructor(message: string, public readonly shouldRetry: boolean = true) {
    super(message);
    this.name = 'CriticalError';
  }
}

/**
 * Non-retryable error for validation failures or permanent errors
 * Use for client errors that won't succeed on retry
 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * Type guard for CriticalError
 */
export function isCriticalError(error: unknown): error is CriticalError {
  return error instanceof CriticalError;
}

/**
 * Type guard for NonRetryableError
 */
export function isNonRetryableError(error: unknown): error is NonRetryableError {
  return error instanceof NonRetryableError;
}

/**
 * Convert any error to a standard Error object
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}
