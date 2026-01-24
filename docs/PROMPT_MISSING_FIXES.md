# Fix Missing Items from Bottleneck Fixes

## Context
The bottleneck fixes are 95% complete. Two items were missed:

1. **Jitter fix** - Retry logic uses fixed jitter (50ms) causing collision in high concurrency
2. **Async Stripe Webhook** - Heavy webhook events should be enqueued for async processing

---

## FIX 1: Proportional Jitter in useVirtualTickets.ts

### File: `src/hooks/useVirtualTickets.ts`

### Problem
Current retry delay uses fixed jitter of 50ms:
```typescript
const delay = RESERVE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * 50;
```

With 1000 concurrent users, they can still collide within 50ms windows.

### Solution
Change to proportional jitter that scales with the delay:

```typescript
// Find this line (around line 217-220):
const delay = RESERVE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.random() * 50;

// Replace with proportional jitter:
const baseDelay = RESERVE_RETRY_DELAY_MS * Math.pow(2, attempt);
const delay = baseDelay * (0.5 + Math.random()); // 50-150% of base delay
```

This distributes retries more evenly:
- Attempt 0: 50-150ms (was 100-150ms)
- Attempt 1: 100-300ms (was 200-250ms)
- Attempt 2: 200-600ms (was 400-450ms)

---

## FIX 2: Async Stripe Webhook Processing

### File: `supabase/functions/stripe-webhook/index.ts`

### Problem
Heavy webhook events are processed synchronously, risking Stripe timeout (>3 seconds).

### Solution
For heavy events, immediately respond to Stripe and enqueue for async processing.

### Implementation

Add at the top of the file (after imports):
```typescript
import { enqueueJob } from '../_shared/job-queue.ts';
```

Add these constants after existing constants:
```typescript
// Events that should be processed asynchronously
const ASYNC_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

// Get Redis config for job queue
const UPSTASH_REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const UPSTASH_REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
```

In the main handler, after event verification and BEFORE the switch statement, add:
```typescript
// Check if this event should be processed asynchronously
if (ASYNC_EVENTS.includes(event.type) && UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN) {
  try {
    // Enqueue for async processing
    const { jobId, success, error } = await enqueueJob(
      UPSTASH_REDIS_URL,
      UPSTASH_REDIS_TOKEN,
      'stripe-webhook-process',
      {
        eventId: event.id,
        eventType: event.type,
        eventData: event.data.object,
        livemode: event.livemode,
        receivedAt: Date.now(),
      },
      { priority: 'high', maxAttempts: 5 }
    );

    if (success) {
      console.log(`[STRIPE-WEBHOOK] Event ${event.id} (${event.type}) queued for async processing, jobId: ${jobId}`);

      // Respond immediately to Stripe (within 100ms)
      return new Response(
        JSON.stringify({
          received: true,
          queued: true,
          jobId,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.warn(`[STRIPE-WEBHOOK] Failed to queue event ${event.id}, falling back to sync: ${error}`);
      // Fall through to synchronous processing
    }
  } catch (queueError) {
    console.error(`[STRIPE-WEBHOOK] Queue error for ${event.id}, falling back to sync:`, queueError);
    // Fall through to synchronous processing
  }
}

// Continue with existing synchronous processing as fallback...
```

### Note
The `process-job-queue/index.ts` already has the handler for `stripe-webhook-process` jobs (added in previous commit). This change just enables the webhook to use it.

---

## Testing

### Jitter Test
1. Simulate 100 concurrent reservations
2. Verify retry attempts are spread across wider time window
3. Collision rate should decrease

### Webhook Test
1. Trigger a test webhook from Stripe Dashboard
2. Verify immediate 200 response (< 100ms)
3. Check job queue processes the event
4. Verify no duplicate processing (idempotency)

---

## Files Changed
1. `src/hooks/useVirtualTickets.ts` - 1 line change (jitter)
2. `supabase/functions/stripe-webhook/index.ts` - ~40 lines added (async queue)
