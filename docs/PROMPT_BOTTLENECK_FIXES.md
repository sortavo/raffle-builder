# FIX CRITICAL BOTTLENECKS - Enterprise Scale Solutions

## Context
Sortavo needs to handle 30 mega raffles with 10M tickets each, or 500 raffles with 50K tickets. Current architecture has critical bottlenecks identified that need enterprise-grade fixes.

---

## 🔴 FIX #1: Persistent Rate Limiter (CRITICAL)

### Problem
In-memory rate limiter resets on cold starts, allowing bypass attacks.

### Solution
Create `supabase/functions/_shared/persistent-rate-limiter.ts`:

```typescript
/**
 * Persistent Rate Limiter using Redis
 * Falls back to database if Redis unavailable
 *
 * Features:
 * - Redis-first with automatic fallback
 * - Sliding window algorithm
 * - Per-IP and per-user limits
 * - Distributed across all Edge Function isolates
 */

import { redisCommand } from './redis-client.ts';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export const RATE_LIMIT_CONFIGS = {
  TICKET_RESERVE: { windowMs: 60000, maxRequests: 10, keyPrefix: 'rl:reserve' },
  CHECKOUT: { windowMs: 3600000, maxRequests: 10, keyPrefix: 'rl:checkout' },
  API_GENERAL: { windowMs: 60000, maxRequests: 100, keyPrefix: 'rl:api' },
  WEBHOOK: { windowMs: 1000, maxRequests: 100, keyPrefix: 'rl:webhook' },
} as const;

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
    // Use Redis sorted set for sliding window
    // ZREMRANGEBYSCORE removes old entries
    // ZADD adds current request
    // ZCARD counts requests in window

    const pipeline = [
      ['ZREMRANGEBYSCORE', key, '0', windowStart.toString()],
      ['ZADD', key, now.toString(), `${now}:${crypto.randomUUID().slice(0,8)}`],
      ['ZCARD', key],
      ['EXPIRE', key, Math.ceil(config.windowMs / 1000).toString()],
    ];

    // Execute pipeline
    const results = await Promise.all(
      pipeline.map(cmd => redisCommand(redisUrl, redisToken, cmd as string[]))
    );

    const count = results[2].result as number;
    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);

    // Get oldest entry to calculate reset time
    const oldestResult = await redisCommand(redisUrl, redisToken, [
      'ZRANGE', key, '0', '0', 'WITHSCORES'
    ]);

    const oldestTime = oldestResult.result?.[1]
      ? parseInt(oldestResult.result[1] as string)
      : now;
    const resetAt = oldestTime + config.windowMs;

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

// Database fallback when Redis is unavailable
async function checkRateLimitDatabase(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Use Supabase RPC for atomic rate limit check
  // This is slower but works without Redis
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.2');

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
    // If even database fails, allow but log
    console.error('[RATE-LIMITER] Database fallback failed:', error);
    return { allowed: true, remaining: 1, resetAt: Date.now() + config.windowMs };
  }

  return data as RateLimitResult;
}

// Headers to include in rate-limited responses
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.remaining.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}
```

### Database Migration for Fallback
```sql
-- Rate limit tracking table (fallback when Redis unavailable)
CREATE TABLE IF NOT EXISTS public.rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_entry UNIQUE (identifier, key_prefix, timestamp)
);

-- Index for fast cleanup and counting
CREATE INDEX idx_rate_limit_lookup ON rate_limit_entries(key_prefix, identifier, timestamp DESC);

-- Auto-cleanup old entries (runs every minute via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS void AS $$
  DELETE FROM rate_limit_entries
  WHERE timestamp < NOW() - INTERVAL '1 hour';
$$ LANGUAGE SQL;

-- RPC function for atomic rate limit check
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_key_prefix TEXT,
  p_window_ms INTEGER,
  p_max_requests INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_oldest TIMESTAMPTZ;
  v_reset_at BIGINT;
BEGIN
  v_window_start := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;

  -- Clean old entries and count current
  DELETE FROM rate_limit_entries
  WHERE identifier = p_identifier
    AND key_prefix = p_key_prefix
    AND timestamp < v_window_start;

  -- Insert new entry
  INSERT INTO rate_limit_entries (identifier, key_prefix)
  VALUES (p_identifier, p_key_prefix);

  -- Count entries in window
  SELECT COUNT(*), MIN(timestamp) INTO v_count, v_oldest
  FROM rate_limit_entries
  WHERE identifier = p_identifier
    AND key_prefix = p_key_prefix
    AND timestamp >= v_window_start;

  v_reset_at := EXTRACT(EPOCH FROM (COALESCE(v_oldest, NOW()) + (p_window_ms || ' milliseconds')::INTERVAL)) * 1000;

  RETURN jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count),
    'resetAt', v_reset_at,
    'retryAfter', CASE WHEN v_count > p_max_requests
      THEN CEIL((v_reset_at - EXTRACT(EPOCH FROM NOW()) * 1000) / 1000)
      ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql;
```

### Update reserve-tickets-v2
Replace in-memory rate limiter with persistent one:

```typescript
import { checkRateLimit, RATE_LIMIT_CONFIGS, getRateLimitHeaders } from '../_shared/persistent-rate-limiter.ts';

// In the handler:
const rateLimitResult = await checkRateLimit(
  UPSTASH_REDIS_URL,
  UPSTASH_REDIS_TOKEN,
  clientIP,
  RATE_LIMIT_CONFIGS.TICKET_RESERVE
);

if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(rateLimitResult),
        'Content-Type': 'application/json'
      }
    }
  );
}
```

---

## 🔴 FIX #2: Persistent Circuit Breaker (CRITICAL)

### Problem
Circuit breaker state resets on cold starts, causing repeated failures.

### Solution
Update `supabase/functions/_shared/circuit-breaker.ts`:

```typescript
/**
 * Persistent Circuit Breaker using Redis
 * State survives cold starts and is shared across isolates
 */

import { redisCommand } from './redis-client.ts';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastSuccess: number;
  openedAt: number | null;
}

interface CircuitConfig {
  failureThreshold: number;    // Failures before opening
  successThreshold: number;    // Successes in half-open before closing
  timeout: number;             // Ms before trying half-open
  resetTimeout: number;        // Ms of success before resetting failures
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000,        // 30 seconds
  resetTimeout: 60000,   // 1 minute
};

const CIRCUIT_PREFIX = 'circuit:';

export async function getCircuitStatus(
  redisUrl: string,
  redisToken: string,
  serviceName: string
): Promise<CircuitStatus> {
  try {
    const result = await redisCommand(redisUrl, redisToken, [
      'GET', `${CIRCUIT_PREFIX}${serviceName}`
    ]);

    if (result.result) {
      return JSON.parse(result.result as string);
    }
  } catch (e) {
    console.error('[CIRCUIT-BREAKER] Redis get failed:', e);
  }

  // Default: closed circuit
  return {
    state: 'closed',
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
    openedAt: null,
  };
}

async function setCircuitStatus(
  redisUrl: string,
  redisToken: string,
  serviceName: string,
  status: CircuitStatus
): Promise<void> {
  try {
    await redisCommand(redisUrl, redisToken, [
      'SET',
      `${CIRCUIT_PREFIX}${serviceName}`,
      JSON.stringify(status),
      'EX', '3600'  // 1 hour TTL
    ]);
  } catch (e) {
    console.error('[CIRCUIT-BREAKER] Redis set failed:', e);
  }
}

export async function isCircuitOpen(
  redisUrl: string,
  redisToken: string,
  serviceName: string,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<boolean> {
  const status = await getCircuitStatus(redisUrl, redisToken, serviceName);
  const now = Date.now();

  if (status.state === 'open') {
    // Check if timeout has passed
    if (status.openedAt && now - status.openedAt >= config.timeout) {
      // Move to half-open
      status.state = 'half-open';
      await setCircuitStatus(redisUrl, redisToken, serviceName, status);
      console.log(`[CIRCUIT-BREAKER] ${serviceName}: open -> half-open`);
      return false;
    }
    return true;
  }

  return false;
}

export async function recordSuccess(
  redisUrl: string,
  redisToken: string,
  serviceName: string,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<void> {
  const status = await getCircuitStatus(redisUrl, redisToken, serviceName);
  const now = Date.now();

  if (status.state === 'half-open') {
    // Count consecutive successes
    const consecutiveSuccesses = status.lastSuccess > status.lastFailure
      ? Math.floor((now - status.lastFailure) / 1000)
      : 1;

    if (consecutiveSuccesses >= config.successThreshold) {
      status.state = 'closed';
      status.failures = 0;
      status.openedAt = null;
      console.log(`[CIRCUIT-BREAKER] ${serviceName}: half-open -> closed`);
    }
  }

  status.lastSuccess = now;

  // Reset failures after sustained success
  if (now - status.lastFailure > config.resetTimeout) {
    status.failures = 0;
  }

  await setCircuitStatus(redisUrl, redisToken, serviceName, status);
}

export async function recordFailure(
  redisUrl: string,
  redisToken: string,
  serviceName: string,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<void> {
  const status = await getCircuitStatus(redisUrl, redisToken, serviceName);
  const now = Date.now();

  status.failures++;
  status.lastFailure = now;

  if (status.state === 'half-open' || status.failures >= config.failureThreshold) {
    status.state = 'open';
    status.openedAt = now;
    console.log(`[CIRCUIT-BREAKER] ${serviceName}: -> open (failures: ${status.failures})`);
  }

  await setCircuitStatus(redisUrl, redisToken, serviceName, status);
}

// Wrapper function for executing with circuit breaker
export async function withCircuitBreaker<T>(
  redisUrl: string,
  redisToken: string,
  serviceName: string,
  operation: () => Promise<T>,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<T> {
  if (await isCircuitOpen(redisUrl, redisToken, serviceName, config)) {
    throw new Error(`Circuit breaker open for ${serviceName}`);
  }

  try {
    const result = await operation();
    await recordSuccess(redisUrl, redisToken, serviceName, config);
    return result;
  } catch (error) {
    await recordFailure(redisUrl, redisToken, serviceName, config);
    throw error;
  }
}
```

### Update redis-client.ts to use circuit breaker
```typescript
import { isCircuitOpen, recordSuccess, recordFailure } from './circuit-breaker.ts';

export async function redisCommand(
  redisUrl: string,
  redisToken: string,
  command: string[]
): Promise<{ result?: unknown; error?: string }> {
  // Check circuit breaker first
  if (await isCircuitOpen(redisUrl, redisToken, 'redis')) {
    return { error: 'Redis circuit breaker open' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);

  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      await recordFailure(redisUrl, redisToken, 'redis');
      return { error: `Redis HTTP ${response.status}` };
    }

    const data = await response.json();
    await recordSuccess(redisUrl, redisToken, 'redis');
    return { result: data.result };
  } catch (error) {
    clearTimeout(timeout);
    await recordFailure(redisUrl, redisToken, 'redis');

    if (error.name === 'AbortError') {
      return { error: 'Redis timeout' };
    }
    return { error: String(error) };
  }
}
```

---

## 🟠 FIX #3: Async Webhook Processing (HIGH)

### Problem
Stripe webhook processes everything synchronously, risking timeouts.

### Solution
Update `supabase/functions/stripe-webhook/index.ts`:

```typescript
// At the top of the handler, after event verification:

// Quick ack - respond to Stripe immediately
const quickAckEvents = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
];

if (quickAckEvents.includes(event.type)) {
  // Enqueue for async processing
  const { enqueueJob } = await import('../_shared/job-queue.ts');

  await enqueueJob(
    UPSTASH_REDIS_URL,
    UPSTASH_REDIS_TOKEN,
    'stripe-webhook-process',
    {
      eventId: event.id,
      eventType: event.type,
      eventData: event.data.object,
      receivedAt: Date.now(),
    },
    { priority: 'high', maxAttempts: 5 }
  );

  // Respond immediately (within 100ms)
  return new Response(JSON.stringify({ received: true, queued: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// For non-critical events, process inline (existing code)
```

### Update process-job-queue to handle webhook jobs
Add new job type handler:

```typescript
case 'stripe-webhook-process':
  await processStripeWebhookJob(supabase, stripe, job.payload);
  break;

// New function
async function processStripeWebhookJob(
  supabase: SupabaseClient,
  stripe: Stripe,
  payload: {
    eventId: string;
    eventType: string;
    eventData: Stripe.Event.Data.Object;
    receivedAt: number;
  }
) {
  const { eventId, eventType, eventData } = payload;

  // Check idempotency
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('event_id', eventId)
    .single();

  if (existing) {
    console.log(`[WEBHOOK-JOB] Event ${eventId} already processed`);
    return;
  }

  // Process based on event type
  switch (eventType) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(supabase, eventData as Stripe.Subscription, eventType);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(supabase, eventData as Stripe.Invoice);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(supabase, eventData as Stripe.Invoice);
      break;
  }

  // Mark as processed
  await supabase.from('stripe_events').insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  });
}
```

### Parallel Organization Lookup
Replace cascading lookups with parallel:

```typescript
async function findOrganizationByStripeData(
  supabase: SupabaseClient,
  stripeCustomerId: string,
  email?: string,
  metadata?: { organization_id?: string }
): Promise<Organization | null> {
  // Run all lookups in parallel
  const [byMetadata, byCustomerId, byOrgEmail, byProfileEmail] = await Promise.all([
    // 1. By metadata
    metadata?.organization_id
      ? supabase.from('organizations').select('*').eq('id', metadata.organization_id).single()
      : Promise.resolve({ data: null }),

    // 2. By Stripe customer ID
    supabase.from('organizations').select('*').eq('stripe_customer_id', stripeCustomerId).single(),

    // 3. By org email
    email
      ? supabase.from('organizations').select('*').eq('email', email).single()
      : Promise.resolve({ data: null }),

    // 4. By profile email -> org
    email
      ? supabase.from('profiles').select('organization_id').eq('email', email).single()
          .then(({ data }) => data?.organization_id
            ? supabase.from('organizations').select('*').eq('id', data.organization_id).single()
            : { data: null }
          )
      : Promise.resolve({ data: null }),
  ]);

  // Return first match (priority order)
  return byMetadata.data || byCustomerId.data || byOrgEmail.data || byProfileEmail?.data || null;
}
```

---

## 🟠 FIX #4: True Streaming CSV Export (HIGH)

### Problem
CSV export accumulates everything in memory, causing OOM for large exports.

### Solution
Rewrite `supabase/functions/export-buyers-csv/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const BATCH_SIZE = 1000;
const MAX_ROWS = 500000; // 500k max

serve(async (req) => {
  // ... auth and validation ...

  const { raffleId, filters } = await req.json();

  // Create a TransformStream for true streaming
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Start the response immediately with streaming
  const response = new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="buyers-${raffleId}-${Date.now()}.csv"`,
      'Transfer-Encoding': 'chunked',
    },
  });

  // Process in background (non-blocking)
  (async () => {
    try {
      // Write BOM for Excel UTF-8 compatibility
      await writer.write(encoder.encode('\ufeff'));

      // Write headers
      const headers = [
        'Número de Boleto',
        'Nombre',
        'Teléfono',
        'Email',
        'Estado',
        'Fecha de Compra',
        'Monto',
        'Método de Pago'
      ];
      await writer.write(encoder.encode(headers.join(',') + '\n'));

      let offset = 0;
      let hasMore = true;
      let totalWritten = 0;

      while (hasMore && totalWritten < MAX_ROWS) {
        // Fetch batch
        let query = supabase
          .from('orders')
          .select(`
            ticket_numbers,
            buyer_name,
            buyer_phone,
            buyer_email,
            status,
            sold_at,
            order_total,
            payment_methods(name)
          `)
          .eq('raffle_id', raffleId)
          .eq('status', 'sold')
          .range(offset, offset + BATCH_SIZE - 1);

        if (filters?.search) {
          query = query.or(`buyer_name.ilike.%${filters.search}%,buyer_phone.ilike.%${filters.search}%`);
        }

        const { data: orders, error } = await query;

        if (error) throw error;
        if (!orders || orders.length === 0) {
          hasMore = false;
          break;
        }

        // Stream each row immediately
        for (const order of orders) {
          for (const ticketNumber of order.ticket_numbers || []) {
            const row = [
              ticketNumber,
              escapeCSV(order.buyer_name || ''),
              escapeCSV(order.buyer_phone || ''),
              escapeCSV(order.buyer_email || ''),
              order.status,
              order.sold_at ? new Date(order.sold_at).toLocaleString('es-MX') : '',
              order.order_total?.toFixed(2) || '0.00',
              escapeCSV(order.payment_methods?.name || 'N/A'),
            ];

            await writer.write(encoder.encode(row.join(',') + '\n'));
            totalWritten++;

            if (totalWritten >= MAX_ROWS) break;
          }
          if (totalWritten >= MAX_ROWS) break;
        }

        offset += BATCH_SIZE;
        hasMore = orders.length === BATCH_SIZE;

        // Small delay to prevent overwhelming the database
        if (hasMore) {
          await new Promise(r => setTimeout(r, 10));
        }
      }

      await writer.close();
    } catch (error) {
      console.error('[EXPORT-CSV] Streaming error:', error);
      await writer.abort(error);
    }
  })();

  return response;
});

function escapeCSV(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

---

## 🟡 FIX #5: Dynamic Cleanup Batching (MEDIUM)

### Problem
Fixed batch size can't handle traffic spikes.

### Solution
Update `cleanup_expired_tickets_batch` function:

```sql
-- Dynamic batch sizing based on queue depth
CREATE OR REPLACE FUNCTION cleanup_expired_tickets_batch(
  p_batch_size INTEGER DEFAULT 500,
  p_max_batches INTEGER DEFAULT 20,
  p_auto_scale BOOLEAN DEFAULT true
)
RETURNS TABLE (
  tickets_cleaned BIGINT,
  orders_cleaned BIGINT,
  execution_time_ms BIGINT,
  batches_processed INTEGER
) AS $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_tickets_total BIGINT := 0;
  v_orders_total BIGINT := 0;
  v_batch_count INTEGER := 0;
  v_pending_count BIGINT;
  v_effective_batch_size INTEGER;
  v_effective_max_batches INTEGER;
BEGIN
  -- Count pending items
  SELECT COUNT(*) INTO v_pending_count
  FROM ticket_reservation_status
  WHERE status = 'reserved'
    AND reserved_until < NOW();

  -- Auto-scale batch parameters based on queue depth
  IF p_auto_scale THEN
    -- Scale up for large queues
    IF v_pending_count > 50000 THEN
      v_effective_batch_size := 2000;
      v_effective_max_batches := 50;
    ELSIF v_pending_count > 20000 THEN
      v_effective_batch_size := 1000;
      v_effective_max_batches := 40;
    ELSIF v_pending_count > 10000 THEN
      v_effective_batch_size := 750;
      v_effective_max_batches := 30;
    ELSE
      v_effective_batch_size := p_batch_size;
      v_effective_max_batches := p_max_batches;
    END IF;
  ELSE
    v_effective_batch_size := p_batch_size;
    v_effective_max_batches := p_max_batches;
  END IF;

  -- Process batches
  WHILE v_batch_count < v_effective_max_batches LOOP
    WITH expired AS (
      SELECT raffle_id, ticket_index, order_id
      FROM ticket_reservation_status
      WHERE status = 'reserved'
        AND reserved_until < NOW()
      LIMIT v_effective_batch_size
      FOR UPDATE SKIP LOCKED
    ),
    deleted AS (
      DELETE FROM ticket_reservation_status trs
      USING expired e
      WHERE trs.raffle_id = e.raffle_id
        AND trs.ticket_index = e.ticket_index
      RETURNING trs.*
    )
    SELECT COUNT(*) INTO v_tickets_total FROM deleted;

    EXIT WHEN v_tickets_total = 0;

    v_tickets_total := v_tickets_total + v_tickets_total;
    v_batch_count := v_batch_count + 1;

    -- Brief pause between batches to prevent lock contention
    PERFORM pg_sleep(0.01);
  END LOOP;

  -- Clean up orphaned orders
  WITH cleaned AS (
    UPDATE orders
    SET status = 'cancelled',
        canceled_at = NOW()
    WHERE status = 'reserved'
      AND reserved_until < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM ticket_reservation_status
        WHERE order_id = orders.id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_orders_total FROM cleaned;

  RETURN QUERY SELECT
    v_tickets_total,
    v_orders_total,
    EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::BIGINT,
    v_batch_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 🟡 FIX #6: Health Check Caching (MEDIUM)

### Solution
Add caching to `supabase/functions/health-check/index.ts`:

```typescript
// At the start of handler
const CACHE_TTL_MS = 30000; // 30 seconds
let cachedResult: { data: any; timestamp: number } | null = null;

// Check cache
if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
  return new Response(
    JSON.stringify({ ...cachedResult.data, cached: true }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${Math.ceil(CACHE_TTL_MS / 1000)}`,
        'X-Cache': 'HIT',
      },
    }
  );
}

// ... existing health check logic ...

// Cache result
cachedResult = { data: result, timestamp: Date.now() };

return new Response(
  JSON.stringify({ ...result, cached: false }),
  {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${Math.ceil(CACHE_TTL_MS / 1000)}`,
      'X-Cache': 'MISS',
    },
  }
);
```

---

## Implementation Order

1. **Critical (Do First)**
   - Persistent Rate Limiter (FIX #1)
   - Persistent Circuit Breaker (FIX #2)

2. **High Priority (Do Second)**
   - Async Webhook Processing (FIX #3)
   - Streaming CSV Export (FIX #4)

3. **Medium Priority (Do Third)**
   - Dynamic Cleanup Batching (FIX #5)
   - Health Check Caching (FIX #6)

---

## Testing Requirements

After implementation:

1. **Rate Limiter Test**
   - Cold start doesn't reset limits
   - Redis failure falls back to database
   - Limits are shared across isolates

2. **Circuit Breaker Test**
   - Opens after 3 failures
   - Half-opens after timeout
   - Closes after 2 successes

3. **Webhook Test**
   - Responds to Stripe in <100ms
   - Jobs are processed asynchronously
   - No duplicate processing

4. **CSV Export Test**
   - Export 100k rows without OOM
   - Streaming starts immediately
   - Memory stays under 50MB

5. **Cleanup Test**
   - Handles 50k expired tickets efficiently
   - Auto-scales batch size
   - Completes in reasonable time
