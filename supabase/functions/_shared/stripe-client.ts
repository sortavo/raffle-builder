/**
 * Stripe Client with Circuit Breaker Protection
 * 
 * Provides resilient Stripe API calls with:
 * - Circuit breaker pattern to prevent cascade failures
 * - Configurable timeout (10s default)
 * - Fallback detection for graceful degradation
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { withCircuitBreaker, getCircuitStatus } from "./circuit-breaker.ts";
import { STRIPE_API_VERSION } from "./stripe-config.ts";

const STRIPE_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Create a Stripe client instance
 */
export function createStripeClient(): Stripe {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Helper to add timeout to a promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number, operationName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Stripe timeout: ${operationName} (${ms}ms)`)), ms)
    ),
  ]);
}

/**
 * Execute a Stripe operation with circuit breaker protection and timeout
 * 
 * @param operation - Function that takes a Stripe client and returns a Promise
 * @param operationName - Name of the operation for logging/errors
 * @returns Result of the Stripe operation
 * 
 * @example
 * const customers = await stripeOperation(
 *   (stripe) => stripe.customers.list({ email: "user@example.com", limit: 1 }),
 *   'customers.list'
 * );
 */
export async function stripeOperation<T>(
  operation: (stripe: Stripe) => Promise<T>,
  operationName: string
): Promise<T> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  const stripe = createStripeClient();

  // If no Redis configured, execute with timeout only (no circuit breaker)
  if (!redisUrl || !redisToken) {
    console.log(`[STRIPE-CLIENT] No Redis, executing ${operationName} with timeout only`);
    return withTimeout(operation(stripe), STRIPE_TIMEOUT_MS, operationName);
  }

  // Execute with circuit breaker + timeout
  return await withCircuitBreaker(
    redisUrl,
    redisToken,
    'stripe-api',
    () => withTimeout(operation(stripe), STRIPE_TIMEOUT_MS, operationName),
    {
      failureThreshold: 5,    // Open circuit after 5 failures
      successThreshold: 2,    // Close circuit after 2 successes in half-open
      timeout: 60000,         // Circuit stays open for 60s
      resetTimeout: 30000,    // Reset failure count after 30s of success
    }
  );
}

/**
 * Check if the Stripe circuit breaker is currently open
 * Useful for graceful degradation - return cached data instead of failing
 * 
 * @returns true if circuit is open (Stripe unavailable), false otherwise
 */
export async function isStripeCircuitOpen(): Promise<boolean> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  
  if (!redisUrl || !redisToken) {
    return false; // Can't check, assume available
  }

  try {
    const status = await getCircuitStatus(redisUrl, redisToken, 'stripe-api');
    return status.state === 'open';
  } catch (error) {
    console.warn('[STRIPE-CLIENT] Failed to check circuit status:', error);
    return false; // On error, assume available
  }
}
