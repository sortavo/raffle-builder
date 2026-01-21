/**
 * MT8: Per-Tenant Rate Limiter
 *
 * Extends the persistent rate limiter to support organization-level limits.
 * This ensures one tenant's heavy usage doesn't affect other tenants.
 *
 * Features:
 * - Per-organization rate limits (prevents noisy neighbor problem)
 * - Per-IP limits within organization (prevents single user abuse)
 * - Tier-based limits (higher tiers get more capacity)
 * - Combined with global limits for DDoS protection
 */

import { checkRateLimit, RateLimitResult, getRateLimitHeaders, rateLimitResponse } from './persistent-rate-limiter.ts';

export interface TenantRateLimitConfig {
  /** Rate limit config per organization */
  orgLimit: {
    windowMs: number;
    maxRequests: number;
  };
  /** Rate limit config per user within org (optional) */
  userLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  /** Key prefix for Redis keys */
  keyPrefix: string;
}

export interface TenantRateLimitResult {
  allowed: boolean;
  blockedBy: 'org' | 'user' | null;
  orgResult: RateLimitResult;
  userResult?: RateLimitResult;
}

// Tier-based rate limit multipliers
const TIER_MULTIPLIERS: Record<string, number> = {
  basic: 1,
  pro: 2,
  premium: 3,
  enterprise: 5,
};

// Predefined tenant rate limit configurations
export const TENANT_RATE_LIMITS = {
  // Subscription operations: 20/hour per org, 10/hour per user
  SUBSCRIPTION: {
    keyPrefix: 'trl:sub',
    orgLimit: { windowMs: 3600000, maxRequests: 20 },
    userLimit: { windowMs: 3600000, maxRequests: 10 },
  },
  // Billing operations: 30/hour per org, 15/hour per user
  BILLING: {
    keyPrefix: 'trl:billing',
    orgLimit: { windowMs: 3600000, maxRequests: 30 },
    userLimit: { windowMs: 3600000, maxRequests: 15 },
  },
  // General API: 1000/minute per org, 100/minute per user
  API_GENERAL: {
    keyPrefix: 'trl:api',
    orgLimit: { windowMs: 60000, maxRequests: 1000 },
    userLimit: { windowMs: 60000, maxRequests: 100 },
  },
  // Ticket operations: 500/minute per org, 50/minute per user
  TICKETS: {
    keyPrefix: 'trl:tickets',
    orgLimit: { windowMs: 60000, maxRequests: 500 },
    userLimit: { windowMs: 60000, maxRequests: 50 },
  },
} as const;

/**
 * Check tenant-aware rate limit
 *
 * @param redisUrl - Redis URL
 * @param redisToken - Redis token
 * @param organizationId - Organization ID for tenant-level limits
 * @param userId - User ID for user-level limits within org (optional)
 * @param config - Rate limit configuration
 * @param subscriptionTier - Subscription tier for limit multiplier (optional)
 */
export async function checkTenantRateLimit(
  redisUrl: string,
  redisToken: string,
  organizationId: string,
  userId: string | null,
  config: TenantRateLimitConfig,
  subscriptionTier?: string
): Promise<TenantRateLimitResult> {
  // Apply tier multiplier to limits
  const tierMultiplier = subscriptionTier ? (TIER_MULTIPLIERS[subscriptionTier] || 1) : 1;

  // Check organization-level limit
  const orgConfig = {
    keyPrefix: `${config.keyPrefix}:org`,
    windowMs: config.orgLimit.windowMs,
    maxRequests: Math.ceil(config.orgLimit.maxRequests * tierMultiplier),
  };

  const orgResult = await checkRateLimit(redisUrl, redisToken, organizationId, orgConfig);

  // If org limit exceeded, return immediately
  if (!orgResult.allowed) {
    return {
      allowed: false,
      blockedBy: 'org',
      orgResult,
    };
  }

  // Check user-level limit if configured and userId provided
  if (config.userLimit && userId) {
    const userConfig = {
      keyPrefix: `${config.keyPrefix}:user`,
      windowMs: config.userLimit.windowMs,
      maxRequests: Math.ceil(config.userLimit.maxRequests * tierMultiplier),
    };

    // User key includes org to separate users across orgs
    const userKey = `${organizationId}:${userId}`;
    const userResult = await checkRateLimit(redisUrl, redisToken, userKey, userConfig);

    if (!userResult.allowed) {
      return {
        allowed: false,
        blockedBy: 'user',
        orgResult,
        userResult,
      };
    }

    return {
      allowed: true,
      blockedBy: null,
      orgResult,
      userResult,
    };
  }

  return {
    allowed: true,
    blockedBy: null,
    orgResult,
  };
}

/**
 * Generate rate limit headers for tenant-aware responses
 */
export function getTenantRateLimitHeaders(result: TenantRateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {};

  // Add org-level headers
  headers['X-RateLimit-Org-Remaining'] = result.orgResult.remaining.toString();
  headers['X-RateLimit-Org-Reset'] = Math.ceil(result.orgResult.resetAt / 1000).toString();

  // Add user-level headers if available
  if (result.userResult) {
    headers['X-RateLimit-User-Remaining'] = result.userResult.remaining.toString();
    headers['X-RateLimit-User-Reset'] = Math.ceil(result.userResult.resetAt / 1000).toString();
  }

  // Add retry-after if blocked
  if (!result.allowed) {
    const blockedResult = result.blockedBy === 'org' ? result.orgResult : result.userResult;
    if (blockedResult?.retryAfter) {
      headers['Retry-After'] = blockedResult.retryAfter.toString();
    }
  }

  return headers;
}

/**
 * Create a tenant-aware rate limit error response
 */
export function tenantRateLimitResponse(
  result: TenantRateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const blockedResult = result.blockedBy === 'org' ? result.orgResult : result.userResult;
  const message = result.blockedBy === 'org'
    ? 'Tu organización ha excedido el límite de solicitudes. Intenta más tarde.'
    : 'Has excedido tu límite personal de solicitudes. Intenta más tarde.';

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message,
      blockedBy: result.blockedBy,
      retryAfter: blockedResult?.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getTenantRateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    }
  );
}

// Re-export for convenience
export { getRateLimitHeaders, rateLimitResponse };
