# Fix Stripe ID Synchronization Issues

## Context
After an exhaustive enterprise audit of the Stripe implementation, we identified **2 critical issues** where Stripe IDs are hardcoded with incorrect values. These MUST be fixed before going to production.

---

## ISSUE 1: create-checkout/index.ts - Wrong BASIC_PRICE_IDS

### File: `supabase/functions/create-checkout/index.ts`

### Current Code (lines 12-19):
```typescript
const BASIC_PRICE_IDS = [
  // Test mode
  "price_1SjvNEDPAURVR9VYo48CuIdo", // test monthly
  "price_1SjvNKDPAURVR9VYTaWlJiqR", // test annual
  // Live mode
  "price_1ShldQRk7xhLUSttlw5O8LPm", // live monthly ❌ WRONG
  "price_1ShldlRk7xhLUSttMCfocNpN", // live annual ❌ WRONG
];
```

### Problem
The live mode price IDs are from a deleted Stripe account. The correct IDs are in `_shared/stripe-config.ts`.

### Solution
Import from the centralized config instead of hardcoding:

```typescript
// At the top of the file, add import:
import { BASIC_PRICE_IDS } from '../_shared/stripe-config.ts';

// Then DELETE lines 12-19 (the hardcoded BASIC_PRICE_IDS array)
```

---

## ISSUE 2: stripe-webhook/index.ts - Outdated PRODUCT_TO_TIER

### File: `supabase/functions/stripe-webhook/index.ts`

### Current Code (lines 51-69):
```typescript
const PRODUCT_TO_TIER: Record<string, "basic" | "pro" | "premium" | "enterprise"> = {
  // Production IDs
  "prod_Tf5pTKxFYtPfd4": "basic",      // ❌ OLD - deleted account
  "prod_Tf5tsw8mmJQneA": "pro",        // ❌ OLD
  "prod_Tf5uiAAHV2WZNF": "premium",    // ❌ OLD
  "prod_ThHMyhLAztHnsu": "enterprise", // ❌ OLD
  "prod_ThHMbFCP3wSrq8": "enterprise", // ❌ OLD
  // Test IDs - these are correct
  "prod_ThK1EiE0AtKCIM": "basic",
  // ... rest
};
```

### Problem
The "Production IDs" section contains IDs from a deleted Stripe account. The `_shared/stripe-config.ts` already has the correct mapping.

### Solution
Import from the centralized config:

```typescript
// At the top of the file, add import:
import { PRODUCT_TO_TIER, TIER_LIMITS } from '../_shared/stripe-config.ts';

// Then DELETE lines 51-77 (both PRODUCT_TO_TIER and TIER_LIMITS declarations)
```

---

## ISSUE 3: _shared/stripe-config.ts - Add Missing Live Product IDs

### File: `supabase/functions/_shared/stripe-config.ts`

### Current Code is missing some annual product IDs. Update PRODUCT_TO_TIER to:

```typescript
export const PRODUCT_TO_TIER: Record<string, "basic" | "pro" | "premium" | "enterprise"> = {
  // ============= LIVE MODE (USD) =============
  // Monthly products
  "prod_TonJe2av2nOJS7": "basic",
  "prod_TonJoJd4FUAn1e": "pro",
  "prod_TonJ2Y3B8MlzGE": "premium",
  "prod_TonJ8L27dLZL5P": "enterprise",
  // Annual products (same tier, different billing)
  "prod_TonKTHjbrkLuRT": "basic",
  "prod_TonK5qhj3EbmjP": "pro",
  "prod_TonKyHdkN3Mr0k": "premium",
  "prod_TonKDi280pPPx6": "enterprise",

  // ============= TEST MODE =============
  // Monthly products
  "prod_ThK1EiE0AtKCIM": "basic",
  "prod_ThK1LTy6UcPdrl": "pro",
  "prod_ThK1L4ZhLIMS0C": "premium",
  "prod_ThK18K9yms0nxs": "enterprise",
  // Annual products
  "prod_ThK1JlY6NKTIFS": "basic",
  "prod_ThK1C9kzAMf4h9": "pro",
  "prod_ThK1pF8uFNd4yB": "premium",
  "prod_ThK1X1RtiwN326": "enterprise",
};
```

---

## Summary of Changes

| File | Action |
|------|--------|
| `supabase/functions/_shared/stripe-config.ts` | Verify PRODUCT_TO_TIER has all correct live IDs |
| `supabase/functions/create-checkout/index.ts` | Import BASIC_PRICE_IDS from shared config, delete hardcoded array |
| `supabase/functions/stripe-webhook/index.ts` | Import PRODUCT_TO_TIER and TIER_LIMITS from shared config, delete hardcoded objects |

---

## Why This Matters

1. **Trial Detection**: `create-checkout` uses BASIC_PRICE_IDS to determine if a 7-day trial should be applied. Wrong IDs = no trial in production.

2. **Tier Mapping**: `stripe-webhook` uses PRODUCT_TO_TIER to determine which tier a customer subscribed to. Wrong IDs = customers get mapped to wrong tier (likely `basic` fallback).

3. **Single Source of Truth**: All Stripe IDs should come from ONE file (`_shared/stripe-config.ts`) to prevent synchronization issues.

---

## Testing After Fix

1. Create a test checkout in TEST mode → Verify trial is applied for Basic plan
2. Check webhook logs after subscription.created → Verify correct tier is detected
3. Verify organization gets correct `max_active_raffles`, `max_tickets_per_raffle` limits

---

## Files Changed
1. `supabase/functions/_shared/stripe-config.ts` - Verify/update PRODUCT_TO_TIER
2. `supabase/functions/create-checkout/index.ts` - Import instead of hardcode
3. `supabase/functions/stripe-webhook/index.ts` - Import instead of hardcode
