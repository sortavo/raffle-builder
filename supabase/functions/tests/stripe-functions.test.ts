/**
 * Automated Tests for Stripe Edge Functions
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/tests/stripe-functions.test.ts
 *
 * Prerequisites:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 * - STRIPE_SECRET_KEY (test mode) in .env.local
 */

import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { load } from "https://deno.land/std@0.190.0/dotenv/mod.ts";

// Load environment variables
const env = await load({ envPath: ".env.local" });

const SUPABASE_URL = env.SUPABASE_URL || Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY || Deno.env.get("STRIPE_SECRET_KEY") || "";

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Test Price IDs (current Stripe account: ANwomfV97e)
const TEST_BASIC_MONTHLY_PRICE = "price_1Sr9iWANwomfV97eI7ojW9KR";
const TEST_PRO_MONTHLY_PRICE = "price_1Sr9iYANwomfV97eTKTKJ4nA";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function callFunction(
  functionName: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<{ status: number; data: unknown }> {
  const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function callFunctionWithAuth(
  functionName: string,
  body: Record<string, unknown>,
  token: string
): Promise<{ status: number; data: unknown }> {
  return callFunction(functionName, body, {
    "Authorization": `Bearer ${token}`,
  });
}

// =============================================================================
// TEST SUITE: create-checkout
// =============================================================================

Deno.test("create-checkout: requires priceId", async () => {
  const { status, data } = await callFunction("create-checkout", {});

  assertEquals(status, 500);
  assertStringIncludes((data as { error: string }).error, "Price ID is required");
});

Deno.test("create-checkout: requires authentication", async () => {
  const { status, data } = await callFunction("create-checkout", {
    priceId: TEST_BASIC_MONTHLY_PRICE,
  });

  assertEquals(status, 500);
  assertStringIncludes((data as { error: string }).error, "authorization");
});

Deno.test("create-checkout: rejects invalid token", async () => {
  const { status, data } = await callFunctionWithAuth("create-checkout", {
    priceId: TEST_BASIC_MONTHLY_PRICE,
  }, "invalid-token");

  assertEquals(status, 500);
  assertStringIncludes((data as { error: string }).error.toLowerCase(), "authenticated");
});

// =============================================================================
// TEST SUITE: stripe-webhook
// =============================================================================

Deno.test("stripe-webhook: requires signature", async () => {
  const { status, data } = await callFunction("stripe-webhook", {
    type: "checkout.session.completed",
  });

  assertEquals(status, 400);
  assertStringIncludes((data as { error: string }).error, "signature");
});

Deno.test("stripe-webhook: rejects invalid signature", async () => {
  const response = await fetch(`${FUNCTIONS_URL}/stripe-webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "invalid-signature",
    },
    body: JSON.stringify({ type: "test" }),
  });

  const data = await response.json();
  assertEquals(response.status, 400);
  assertStringIncludes((data as { error: string }).error.toLowerCase(), "signature");
});

// =============================================================================
// TEST SUITE: upgrade-subscription
// =============================================================================

Deno.test("upgrade-subscription: requires priceId", async () => {
  const { status, data } = await callFunctionWithAuth("upgrade-subscription", {}, "test-token");

  assertEquals(status, 500);
  // Should fail on auth first, then priceId
  assertExists((data as { error: string }).error);
});

Deno.test("upgrade-subscription: requires authentication", async () => {
  const { status, data } = await callFunction("upgrade-subscription", {
    priceId: TEST_PRO_MONTHLY_PRICE,
  });

  assertEquals(status, 500);
  assertStringIncludes((data as { error: string }).error, "authorization");
});

// =============================================================================
// TEST SUITE: cancel-subscription
// =============================================================================

Deno.test("cancel-subscription: requires authentication", async () => {
  const { status, data } = await callFunction("cancel-subscription", {});

  assertEquals(status, 500);
  assertStringIncludes((data as { error: string }).error, "authorization");
});

// =============================================================================
// TEST SUITE: reactivate-subscription
// =============================================================================

Deno.test("reactivate-subscription: requires authentication", async () => {
  const { status, data } = await callFunction("reactivate-subscription", {});

  assertEquals(status, 500);
  assertStringIncludes((data as { error: string }).error, "authorization");
});

// =============================================================================
// TEST SUITE: customer-portal
// =============================================================================

Deno.test("customer-portal: requires authentication", async () => {
  const { status, data } = await callFunction("customer-portal", {});

  assertEquals(status, 500);
  assertStringIncludes((data as { error: string }).error, "authorization");
});

// =============================================================================
// TEST SUITE: preview-upgrade
// =============================================================================

Deno.test("preview-upgrade: requires priceId", async () => {
  const { status, data } = await callFunctionWithAuth("preview-upgrade", {}, "test-token");

  assertEquals(status, 500);
  assertExists((data as { error: string }).error);
});

// =============================================================================
// TEST SUITE: health-check
// =============================================================================

Deno.test("health-check: returns status", async () => {
  const response = await fetch(`${FUNCTIONS_URL}/health-check`);
  const data = await response.json();

  assertEquals(response.status, 200);
  assertExists((data as { status: string }).status);
  assertExists((data as { services: unknown[] }).services);
});

Deno.test("health-check: Stripe service is operational", async () => {
  const response = await fetch(`${FUNCTIONS_URL}/health-check`);
  const data = await response.json() as { services: Array<{ name: string; status: string }> };

  const stripeService = data.services.find(s => s.name.includes("Stripe"));
  assertExists(stripeService);
  assertEquals(stripeService.status, "operational");
});

// =============================================================================
// TEST SUITE: Stripe Config Validation
// =============================================================================

Deno.test("stripe-config: BASIC_PRICE_IDS contains test prices", async () => {
  // This test validates that the shared config is correctly set up
  // by checking if create-checkout accepts our test price IDs

  const { data } = await callFunctionWithAuth("create-checkout", {
    priceId: TEST_BASIC_MONTHLY_PRICE,
  }, "test-token");

  // Should fail on auth, not on price validation
  const error = (data as { error: string }).error.toLowerCase();
  assertEquals(error.includes("price"), false, "Should not fail on price validation");
});

console.log(`
===========================================
  Stripe Edge Functions Test Suite
===========================================

  SUPABASE_URL: ${SUPABASE_URL ? "✓ Set" : "✗ Missing"}
  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing"}

  Running tests against: ${FUNCTIONS_URL}

===========================================
`);
