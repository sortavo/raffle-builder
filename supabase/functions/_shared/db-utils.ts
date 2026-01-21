/**
 * Database Utilities for Supabase Edge Functions
 * 
 * Provides resilient database operations with:
 * - Configurable timeout (15s default)
 * - Deadlock retry with exponential backoff + jitter
 * - PostgreSQL error code handling
 */

const DB_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Custom error for database timeout
 */
export class DatabaseTimeoutError extends Error {
  constructor(operation: string) {
    super(`Database operation timed out: ${operation}`);
    this.name = 'DatabaseTimeoutError';
  }
}

/**
 * Wrap a database operation with a timeout
 * 
 * @param operation - Async function to execute
 * @param operationName - Name for error messages
 * @param timeoutMs - Timeout in milliseconds (default: 15000)
 * @returns Result of the operation
 * 
 * @example
 * const { data, error } = await withDbTimeout(
 *   () => supabase.from("organizations").select("*").eq("id", orgId).single(),
 *   'organizations.select'
 * );
 */
export async function withDbTimeout<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs: number = DB_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DatabaseTimeoutError(operationName)), timeoutMs)
    ),
  ]);
}

/**
 * Supabase query result type for retry operations
 */
interface SupabaseResult<T> {
  data: T | null;
  error: { code?: string; message: string } | null;
}

/**
 * Retry database operations that fail due to deadlocks (PostgreSQL error 40P01)
 * Uses exponential backoff with jitter to prevent thundering herd
 * 
 * @param operation - Async function that returns a Supabase result
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of the operation
 * 
 * @example
 * const { data, error } = await withDeadlockRetry(
 *   () => supabase.from("organizations").update(payload).eq("id", orgId)
 * );
 */
export async function withDeadlockRetry<T>(
  operation: () => Promise<SupabaseResult<T>>,
  maxRetries: number = 3
): Promise<SupabaseResult<T>> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await operation();

    // Check for deadlock error (PostgreSQL error code 40P01)
    if (result.error?.code === '40P01') {
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
        const jitter = Math.random() * 100; // 0-100ms random jitter
        const delayMs = baseDelay + jitter;
        
        console.warn(`[DB-UTILS] Deadlock detected (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delayMs)}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      console.error(`[DB-UTILS] Deadlock persists after ${maxRetries} attempts`);
    }

    return result;
  }

  return { data: null, error: { message: 'Max retries exceeded after deadlock' } };
}

/**
 * Combine timeout and deadlock retry for critical write operations
 * 
 * @param operation - Async function that returns a Supabase result
 * @param operationName - Name for timeout error messages
 * @param options - Configuration options
 * @returns Result of the operation
 */
export async function withDbResilience<T>(
  operation: () => Promise<SupabaseResult<T>>,
  operationName: string,
  options?: {
    timeoutMs?: number;
    maxRetries?: number;
  }
): Promise<SupabaseResult<T>> {
  const { timeoutMs = DB_TIMEOUT_MS, maxRetries = 3 } = options || {};

  return withDeadlockRetry(
    () => withDbTimeout(operation, operationName, timeoutMs),
    maxRetries
  );
}
