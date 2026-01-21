/**
 * Persistent Rate Limiter using Redis
 * Falls back to database if Redis unavailable
 *
 * Features:
 * - Redis-first with automatic fallback
 * - Sliding window algorithm using sorted sets
 * - Per-IP and per-user limits
 * - Distributed across all Edge Function isolates
 * - Survives cold starts (state in Redis/DB, not memory)
 */

import { redisCommand } from './redis-client.ts';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

// Predefined rate limit configurations for different use cases
export const RATE_LIMIT_CONFIGS = {
  // Ticket reservations: 10 per minute per IP
  TICKET_RESERVE: { windowMs: 60000, maxRequests: 10, keyPrefix: 'rl:reserve' },
  // Checkout/payment submissions: 10 per hour per IP (prevent abuse)
  CHECKOUT: { windowMs: 3600000, maxRequests: 10, keyPrefix: 'rl:checkout' },
  // General API calls: 100 per minute per IP
  API_GENERAL: { windowMs: 60000, maxRequests: 100, keyPrefix: 'rl:api' },
  // Webhook processing: 100 per second (high throughput)
  WEBHOOK: { windowMs: 1000, maxRequests: 100, keyPrefix: 'rl:webhook' },
  // Health check: 60 per minute per IP
  HEALTH_CHECK: { windowMs: 60000, maxRequests: 60, keyPrefix: 'rl:health' },
} as const;

/**
 * Check rate limit using Redis sorted sets for sliding window algorithm.
 * Falls back to database if Redis is unavailable.
 */
export async function checkRateLimit(
  redisUrl: string,
  redisToken: string,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Step 1: Remove old entries outside the window
    const removeResult = await redisCommand(redisUrl, redisToken, [
      'ZREMRANGEBYSCORE', key, '0', windowStart.toString()
    ]);

    if (removeResult.error) {
      console.warn('[RATE-LIMITER] Redis ZREMRANGEBYSCORE failed, using fallback:', removeResult.error);
      return checkRateLimitDatabase(identifier, config);
    }

    // Step 2: Add current request with unique member
    const uniqueId = `${now}:${crypto.randomUUID().slice(0, 8)}`;
    const addResult = await redisCommand(redisUrl, redisToken, [
      'ZADD', key, now.toString(), uniqueId
    ]);

    if (addResult.error) {
      console.warn('[RATE-LIMITER] Redis ZADD failed, using fallback:', addResult.error);
      return checkRateLimitDatabase(identifier, config);
    }

    // Step 3: Count requests in window
    const countResult = await redisCommand(redisUrl, redisToken, [
      'ZCARD', key
    ]);

    if (countResult.error) {
      console.warn('[RATE-LIMITER] Redis ZCARD failed, using fallback:', countResult.error);
      return checkRateLimitDatabase(identifier, config);
    }

    // Step 4: Set expiry on the key
    const ttlSeconds = Math.ceil(config.windowMs / 1000);
    await redisCommand(redisUrl, redisToken, ['EXPIRE', key, ttlSeconds.toString()]);

    const count = countResult.result as number;
    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);

    // Get the oldest entry to calculate accurate reset time
    let resetAt = now + config.windowMs;
    const rangeResult = await redisCommand(redisUrl, redisToken, [
      'ZRANGE', key, '0', '0', 'WITHSCORES'
    ]);

    if (!rangeResult.error && Array.isArray(rangeResult.result) && rangeResult.result.length >= 2) {
      const oldestTime = parseInt(rangeResult.result[1] as string, 10);
      if (!isNaN(oldestTime)) {
        resetAt = oldestTime + config.windowMs;
      }
    }

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    };
  } catch (error) {
    console.error('[RATE-LIMITER] Redis error, using database fallback:', error);
    return checkRateLimitDatabase(identifier, config);
  }
}

/**
 * Database fallback when Redis is unavailable.
 * Uses the check_rate_limit RPC function in Supabase.
 */
async function checkRateLimitDatabase(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.4');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_key_prefix: config.keyPrefix,
      p_window_ms: config.windowMs,
      p_max_requests: config.maxRequests,
    });

    if (error) {
      // R10: Fail-closed with grace period instead of fail-open
      console.error('[RATE-LIMITER] Database fallback failed:', error);

      // Track consecutive failures in memory per identifier
      const failKey = `rate_limit_fail_${identifier}`;
      const globalContext = globalThis as unknown as Record<string, number>;
      const failures = globalContext[failKey] || 0;
      globalContext[failKey] = failures + 1;

      // Allow first 3 requests during outage (grace period), then block
      if (failures < 3) {
        console.warn(`[RATE-LIMITER] Grace request ${failures + 1}/3 during outage for ${identifier}`);
        return {
          allowed: true,
          remaining: 3 - failures - 1,
          resetAt: Date.now() + config.windowMs
        };
      }

      // After 3 grace requests, fail closed to prevent abuse
      console.warn(`[RATE-LIMITER] Failing closed after grace period for ${identifier}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + config.windowMs,
      };
    }

    // Parse the JSONB response
    const result = data as {
      allowed: boolean;
      remaining: number;
      resetAt: number;
      retryAfter: number | null;
    };

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter || undefined,
    };
  } catch (error) {
    console.error('[RATE-LIMITER] Database fallback exception:', error);
    // Fail open on complete failure
    return { 
      allowed: true, 
      remaining: 1, 
      resetAt: Date.now() + config.windowMs 
    };
  }
}

/**
 * Generate standard rate limit headers for HTTP responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.remaining.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Create a rate limit error response with proper headers.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Demasiadas solicitudes. Por favor espera un momento.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}
