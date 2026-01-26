/**
 * Custom error interface with additional properties for HTTP status and context
 * This eliminates the need for `as any` casts when working with errors
 */
export interface AppError extends Error {
  status?: number;
  reason?: string;
  details?: string;
  code?: string | number;
}

/**
 * Factory function to create typed errors with additional properties
 */
export function createAppError(
  message: string,
  options?: Partial<Omit<AppError, 'name' | 'message'>>
): AppError {
  const error = new Error(message) as AppError;
  if (options) {
    Object.assign(error, options);
  }
  return error;
}

/**
 * Type guard to check if an error is an AppError with extended properties
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && ('status' in error || 'reason' in error || 'details' in error);
}

/**
 * Safely extract status from an unknown error
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (isAppError(error)) {
    return error.status;
  }
  return undefined;
}
