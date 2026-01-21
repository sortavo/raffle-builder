#!/usr/bin/env node
/**
 * Automated Stripe Edge Functions Test Suite (Node.js version)
 *
 * Run with: node scripts/test-stripe-functions.mjs
 */

const SUPABASE_URL = "https://xnwqrgumstikdmsxtame.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcwMDIsImV4cCI6MjA4MzQ4MzAwMn0.lQd4r9clw-unRd97qTNxaQe-6f99rvtM9tTJPzbpMdk";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Test Price IDs (current Stripe account: ANwomfV97e)
const TEST_BASIC_MONTHLY_PRICE = "price_1Sr9iWANwomfV97eI7ojW9KR";
const TEST_PRO_MONTHLY_PRICE = "price_1Sr9iYANwomfV97eTKTKJ4nA";

// Colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
};

let passed = 0;
let failed = 0;
const results = [];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function callFunction(functionName, body, headers = {}) {
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

async function test(name, fn) {
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    passed++;
    results.push({ name, status: "pass", duration });
    console.log(`${colors.green}✓${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    failed++;
    results.push({ name, status: "fail", error: error.message, duration });
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.dim}${error.message}${colors.reset}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(str, substring, message) {
  if (!str.toLowerCase().includes(substring.toLowerCase())) {
    throw new Error(message || `Expected "${str}" to include "${substring}"`);
  }
}

// =============================================================================
// TEST SUITES
// =============================================================================

async function runTests() {
  console.log(`
${colors.blue}╔═══════════════════════════════════════════════════════════╗
║     SORTAVO - Stripe Edge Functions Test Suite              ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}

Testing against: ${FUNCTIONS_URL}
`);

  // =========================================================================
  // health-check
  // =========================================================================
  console.log(`${colors.yellow}▸ health-check${colors.reset}`);

  await test("health-check: returns status", async () => {
    const response = await fetch(`${FUNCTIONS_URL}/health-check`);
    const data = await response.json();
    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(data.status, "Missing status field");
    assert(data.services, "Missing services field");
  });

  await test("health-check: Stripe service is operational", async () => {
    const response = await fetch(`${FUNCTIONS_URL}/health-check`);
    const data = await response.json();
    const stripeService = data.services.find(s => s.name.includes("Stripe"));
    assert(stripeService, "Stripe service not found");
    assert(stripeService.status === "operational", `Stripe status: ${stripeService.status}`);
  });

  // =========================================================================
  // create-checkout
  // =========================================================================
  console.log(`\n${colors.yellow}▸ create-checkout${colors.reset}`);

  await test("create-checkout: requires priceId", async () => {
    const { status, data } = await callFunction("create-checkout", {});
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "Price ID");
  });

  await test("create-checkout: requires authentication", async () => {
    const { status, data } = await callFunction("create-checkout", {
      priceId: TEST_BASIC_MONTHLY_PRICE,
    });
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "authorization");
  });

  await test("create-checkout: rejects invalid token", async () => {
    const { status, data } = await callFunction("create-checkout",
      { priceId: TEST_BASIC_MONTHLY_PRICE },
      { "Authorization": "Bearer invalid-token" }
    );
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "authenticated");
  });

  await test("create-checkout: accepts valid priceId format", async () => {
    const { data } = await callFunction("create-checkout",
      { priceId: TEST_BASIC_MONTHLY_PRICE },
      { "Authorization": "Bearer test" }
    );
    // Should fail on auth, NOT on priceId validation
    assert(!data.error.toLowerCase().includes("price"), "Should not fail on price validation");
  });

  // =========================================================================
  // stripe-webhook
  // =========================================================================
  console.log(`\n${colors.yellow}▸ stripe-webhook${colors.reset}`);

  await test("stripe-webhook: requires signature", async () => {
    const { status, data } = await callFunction("stripe-webhook", {});
    assert(status === 400, `Expected 400, got ${status}`);
    assertIncludes(data.error, "signature");
  });

  await test("stripe-webhook: rejects invalid signature", async () => {
    const response = await fetch(`${FUNCTIONS_URL}/stripe-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=1234,v1=invalid",
      },
      body: JSON.stringify({ type: "test" }),
    });
    const data = await response.json();
    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assertIncludes(data.error, "signature");
  });

  // =========================================================================
  // upgrade-subscription
  // =========================================================================
  console.log(`\n${colors.yellow}▸ upgrade-subscription${colors.reset}`);

  await test("upgrade-subscription: requires authentication", async () => {
    const { status, data } = await callFunction("upgrade-subscription", {
      priceId: TEST_PRO_MONTHLY_PRICE,
    });
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "authorization");
  });

  // =========================================================================
  // cancel-subscription
  // =========================================================================
  console.log(`\n${colors.yellow}▸ cancel-subscription${colors.reset}`);

  await test("cancel-subscription: requires authentication", async () => {
    const { status, data } = await callFunction("cancel-subscription", {});
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "authorization");
  });

  // =========================================================================
  // reactivate-subscription
  // =========================================================================
  console.log(`\n${colors.yellow}▸ reactivate-subscription${colors.reset}`);

  await test("reactivate-subscription: requires authentication", async () => {
    const { status, data } = await callFunction("reactivate-subscription", {});
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "authorization");
  });

  // =========================================================================
  // customer-portal
  // =========================================================================
  console.log(`\n${colors.yellow}▸ customer-portal${colors.reset}`);

  await test("customer-portal: requires authentication", async () => {
    const { status, data } = await callFunction("customer-portal", {});
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "authorization");
  });

  // =========================================================================
  // preview-upgrade
  // =========================================================================
  console.log(`\n${colors.yellow}▸ preview-upgrade${colors.reset}`);

  await test("preview-upgrade: requires authentication", async () => {
    const { status, data } = await callFunction("preview-upgrade", {
      priceId: TEST_PRO_MONTHLY_PRICE,
    });
    assert(status === 500, `Expected 500, got ${status}`);
    assertIncludes(data.error, "authorization");
  });

  // =========================================================================
  // process-dunning (system function)
  // =========================================================================
  console.log(`\n${colors.yellow}▸ process-dunning${colors.reset}`);

  await test("process-dunning: responds to requests", async () => {
    const { status, data } = await callFunction("process-dunning", {});
    // Should either succeed (no failures to process) or fail gracefully
    assert(status === 200 || status === 500, `Unexpected status: ${status}`);
    assert(data.success !== undefined || data.error !== undefined, "Missing response body");
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`
${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}
                        TEST RESULTS
${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}

  ${colors.green}Passed:${colors.reset} ${passed}
  ${colors.red}Failed:${colors.reset} ${failed}
  ${colors.dim}Total:  ${passed + failed}${colors.reset}

${failed === 0
  ? `${colors.green}✓ All tests passed!${colors.reset}`
  : `${colors.red}✗ Some tests failed${colors.reset}`}

${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}
`);

  // Exit with error code if tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
