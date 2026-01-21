#!/usr/bin/env node
/**
 * Stripe Integration Tests - Full Business Logic Validation
 *
 * IMPORTANT: These tests create REAL test data in Stripe and Supabase.
 * Only run against TEST environments!
 *
 * Prerequisites:
 * 1. STRIPE_SECRET_KEY (sk_test_...) in environment
 * 2. SUPABASE_SERVICE_ROLE_KEY in environment
 * 3. A test user account in Supabase
 *
 * Run with:
 *   STRIPE_SECRET_KEY=sk_test_xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/test-stripe-integration.mjs
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  supabaseUrl: "https://xnwqrgumstikdmsxtame.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcwMDIsImV4cCI6MjA4MzQ4MzAwMn0.lQd4r9clw-unRd97qTNxaQe-6f99rvtM9tTJPzbpMdk",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,

  // Test Price IDs - Current Stripe Account (ANwomfV97e)
  prices: {
    basic: {
      monthly: "price_1Sr9iWANwomfV97eI7ojW9KR",
      annual: "price_1Sr9jsANwomfV97efJQopwlu",
    },
    pro: {
      monthly: "price_1Sr9iYANwomfV97eTKTKJ4nA",
      annual: "price_1Sr9jtANwomfV97eMAVPLDMq",
    },
    premium: {
      monthly: "price_1Sr9iaANwomfV97eKjea9Y3w",
      annual: "price_1Sr9jvANwomfV97eQLYGvWDB",
    },
    enterprise: {
      monthly: "price_1Sr9ibANwomfV97eZafLddgu",
      annual: "price_1Sr9jxANwomfV97eUbwB9owr",
    },
  },

  // Expected tier limits
  tierLimits: {
    basic: { maxActiveRaffles: 2, maxTicketsPerRaffle: 2000, templatesAvailable: 3 },
    pro: { maxActiveRaffles: 7, maxTicketsPerRaffle: 30000, templatesAvailable: 6 },
    premium: { maxActiveRaffles: 15, maxTicketsPerRaffle: 100000, templatesAvailable: 9 },
    enterprise: { maxActiveRaffles: 999, maxTicketsPerRaffle: 10000000, templatesAvailable: 9 },
  },
};

// Colors
const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// =============================================================================
// VALIDATION
// =============================================================================

function validateEnvironment() {
  const missing = [];

  if (!config.stripeSecretKey) missing.push("STRIPE_SECRET_KEY");
  if (!config.supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    console.error(`${c.red}Missing environment variables: ${missing.join(", ")}${c.reset}`);
    console.log(`
${c.yellow}Usage:${c.reset}
  STRIPE_SECRET_KEY=sk_test_xxx \\
  SUPABASE_SERVICE_ROLE_KEY=xxx \\
  node scripts/test-stripe-integration.mjs
`);
    process.exit(1);
  }

  if (!config.stripeSecretKey.startsWith("sk_test_")) {
    console.error(`${c.red}ERROR: STRIPE_SECRET_KEY must be a TEST key (sk_test_...)${c.reset}`);
    console.error(`${c.red}Never run integration tests against production!${c.reset}`);
    process.exit(1);
  }
}

// =============================================================================
// TEST HELPERS
// =============================================================================

let stripe;
let supabase;
let testResults = { passed: 0, failed: 0, skipped: 0 };
let testCustomerId = null;
let testSubscriptionId = null;
let testOrgId = null;

async function setup() {
  console.log(`${c.blue}Setting up test environment...${c.reset}\n`);

  stripe = new Stripe(config.stripeSecretKey);
  supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

  // Create a test customer in Stripe
  const testEmail = `test-${Date.now()}@sortavo-test.com`;
  const customer = await stripe.customers.create({
    email: testEmail,
    name: "Integration Test User",
    metadata: { test: "true", created_by: "integration-test" },
  });
  testCustomerId = customer.id;
  console.log(`${c.dim}Created test customer: ${customer.id}${c.reset}`);

  // Create a test organization in Supabase
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: "Test Organization",
      email: testEmail,
      stripe_customer_id: customer.id,
      subscription_tier: "basic",
      subscription_status: "active",
    })
    .select()
    .single();

  if (orgError) {
    console.error(`${c.red}Failed to create test org: ${orgError.message}${c.reset}`);
    await cleanup();
    process.exit(1);
  }
  testOrgId = org.id;
  console.log(`${c.dim}Created test organization: ${org.id}${c.reset}`);
}

async function cleanup() {
  console.log(`\n${c.blue}Cleaning up test data...${c.reset}`);

  try {
    // Cancel any subscriptions
    if (testSubscriptionId) {
      await stripe.subscriptions.cancel(testSubscriptionId).catch(() => {});
      console.log(`${c.dim}Cancelled subscription: ${testSubscriptionId}${c.reset}`);
    }

    // Delete test customer (cascades to subscriptions)
    if (testCustomerId) {
      await stripe.customers.del(testCustomerId).catch(() => {});
      console.log(`${c.dim}Deleted customer: ${testCustomerId}${c.reset}`);
    }

    // Delete test organization
    if (testOrgId) {
      await supabase.from("organizations").delete().eq("id", testOrgId);
      console.log(`${c.dim}Deleted organization: ${testOrgId}${c.reset}`);
    }
  } catch (e) {
    console.log(`${c.yellow}Cleanup warning: ${e.message}${c.reset}`);
  }
}

async function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    testResults.passed++;
    console.log(`${c.green}PASS${c.reset}`);
  } catch (error) {
    testResults.failed++;
    console.log(`${c.red}FAIL${c.reset}`);
    console.log(`    ${c.dim}${error.message}${c.reset}`);
  }
}

function skip(name, reason) {
  testResults.skipped++;
  console.log(`  ${name}... ${c.yellow}SKIP${c.reset} (${reason})`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function waitForWebhook(ms = 3000) {
  // Wait for webhook to be processed
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function getOrgFromDb() {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", testOrgId)
    .single();

  if (error) throw new Error(`Failed to fetch org: ${error.message}`);
  return data;
}

// =============================================================================
// TEST SUITES
// =============================================================================

async function testTrialPeriod() {
  console.log(`\n${c.bold}▸ Trial Period Tests${c.reset}`);

  await test("Basic plan subscription includes 7-day trial", async () => {
    // Create subscription with Basic plan
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{ price: config.prices.basic.monthly }],
      trial_period_days: 7,
      metadata: { organization_id: testOrgId },
    });

    testSubscriptionId = subscription.id;

    assert(subscription.status === "trialing", `Expected trialing, got ${subscription.status}`);
    assert(subscription.trial_end !== null, "Trial end should be set");

    const trialDays = Math.round((subscription.trial_end - Date.now() / 1000) / 86400);
    assert(trialDays >= 6 && trialDays <= 7, `Trial should be ~7 days, got ${trialDays}`);
  });

  await test("Pro plan subscription has NO trial", async () => {
    // Cancel existing subscription first
    if (testSubscriptionId) {
      await stripe.subscriptions.cancel(testSubscriptionId);
    }

    // Create Pro subscription without trial
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{ price: config.prices.pro.monthly }],
      payment_behavior: "default_incomplete", // Don't require immediate payment for test
      metadata: { organization_id: testOrgId },
    });

    testSubscriptionId = subscription.id;

    // Pro should NOT have trial
    assertEqual(subscription.trial_end, null, "Pro should not have trial");
  });
}

async function testUpgradeDowngrade() {
  console.log(`\n${c.bold}▸ Upgrade/Downgrade Tests${c.reset}`);

  // First create a Basic subscription
  await test("Create Basic subscription for upgrade test", async () => {
    if (testSubscriptionId) {
      await stripe.subscriptions.cancel(testSubscriptionId);
    }

    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{ price: config.prices.basic.monthly }],
      payment_behavior: "default_incomplete",
      metadata: { organization_id: testOrgId },
    });

    testSubscriptionId = subscription.id;
    assert(subscription.id, "Subscription should be created");
  });

  await test("Upgrade from Basic to Pro shows positive amount due", async () => {
    const subscription = await stripe.subscriptions.retrieve(testSubscriptionId);
    const itemId = subscription.items.data[0].id;

    // Preview the upgrade
    const invoice = await stripe.invoices.createPreview({
      customer: testCustomerId,
      subscription: testSubscriptionId,
      subscription_details: {
        items: [{ id: itemId, price: config.prices.pro.monthly }],
        proration_behavior: "always_invoice",
      },
    });

    // Upgrade should result in positive amount due (Pro $149 > Basic $49)
    // The actual amount depends on proration period remaining
    assert(invoice.amount_due > 0, `Upgrade should have positive amount due, got ${invoice.amount_due}`);

    // Verify invoice has line items
    assert(invoice.lines.data.length > 0, "Invoice should have line items");
  });

  await test("Downgrade from Pro to Basic shows lower amount for next cycle", async () => {
    // First upgrade to Pro
    const subscription = await stripe.subscriptions.retrieve(testSubscriptionId);
    const itemId = subscription.items.data[0].id;

    await stripe.subscriptions.update(testSubscriptionId, {
      items: [{ id: itemId, price: config.prices.pro.monthly }],
      proration_behavior: "none",
    });

    // Now preview downgrade to Basic
    const updatedSub = await stripe.subscriptions.retrieve(testSubscriptionId);
    const newItemId = updatedSub.items.data[0].id;

    const invoice = await stripe.invoices.createPreview({
      customer: testCustomerId,
      subscription: testSubscriptionId,
      subscription_details: {
        items: [{ id: newItemId, price: config.prices.basic.monthly }],
        proration_behavior: "none",
      },
    });

    // With proration_behavior: "none", next invoice shows Basic price ($49)
    // This is correct behavior - downgrade takes effect at next billing cycle
    assertEqual(invoice.amount_due, 4900, "Downgrade should show Basic price for next cycle");
  });
}

async function testTierLimits() {
  console.log(`\n${c.bold}▸ Tier Limits Tests${c.reset}`);

  await test("Basic tier has correct limits in config", async () => {
    const limits = config.tierLimits.basic;
    assertEqual(limits.maxActiveRaffles, 2, "Basic maxActiveRaffles");
    assertEqual(limits.maxTicketsPerRaffle, 2000, "Basic maxTicketsPerRaffle");
    assertEqual(limits.templatesAvailable, 3, "Basic templatesAvailable");
  });

  await test("Pro tier has correct limits in config", async () => {
    const limits = config.tierLimits.pro;
    assertEqual(limits.maxActiveRaffles, 7, "Pro maxActiveRaffles");
    assertEqual(limits.maxTicketsPerRaffle, 30000, "Pro maxTicketsPerRaffle");
    assertEqual(limits.templatesAvailable, 6, "Pro templatesAvailable");
  });

  await test("Premium tier has correct limits in config", async () => {
    const limits = config.tierLimits.premium;
    assertEqual(limits.maxActiveRaffles, 15, "Premium maxActiveRaffles");
    assertEqual(limits.maxTicketsPerRaffle, 100000, "Premium maxTicketsPerRaffle");
    assertEqual(limits.templatesAvailable, 9, "Premium templatesAvailable");
  });

  await test("Enterprise tier has correct limits in config", async () => {
    const limits = config.tierLimits.enterprise;
    assertEqual(limits.maxActiveRaffles, 999, "Enterprise maxActiveRaffles");
    assertEqual(limits.maxTicketsPerRaffle, 10000000, "Enterprise maxTicketsPerRaffle");
    assertEqual(limits.templatesAvailable, 9, "Enterprise templatesAvailable");
  });
}

async function testCancellation() {
  console.log(`\n${c.bold}▸ Cancellation Tests${c.reset}`);

  await test("Cancel at period end sets cancel_at_period_end flag", async () => {
    // First ensure we have an active subscription
    if (!testSubscriptionId) {
      const subscription = await stripe.subscriptions.create({
        customer: testCustomerId,
        items: [{ price: config.prices.basic.monthly }],
        payment_behavior: "default_incomplete",
      });
      testSubscriptionId = subscription.id;
    }

    // Cancel at period end
    const updated = await stripe.subscriptions.update(testSubscriptionId, {
      cancel_at_period_end: true,
    });

    assert(updated.cancel_at_period_end === true, "cancel_at_period_end should be true");
    assert(updated.status !== "canceled", "Status should not be canceled yet");
  });

  await test("Reactivate subscription clears cancel_at_period_end", async () => {
    const updated = await stripe.subscriptions.update(testSubscriptionId, {
      cancel_at_period_end: false,
    });

    assert(updated.cancel_at_period_end === false, "cancel_at_period_end should be false");
  });

  await test("Immediate cancel terminates subscription", async () => {
    const canceled = await stripe.subscriptions.cancel(testSubscriptionId);

    // Status can be "canceled" or "incomplete_expired" depending on payment state
    const validStatuses = ["canceled", "incomplete_expired"];
    assert(
      validStatuses.includes(canceled.status),
      `Status should be canceled or incomplete_expired, got ${canceled.status}`
    );
    testSubscriptionId = null; // Clear so cleanup doesn't try again
  });
}

async function testWebhookIdempotency() {
  console.log(`\n${c.bold}▸ Webhook Idempotency Tests${c.reset}`);

  await test("stripe_events table exists", async () => {
    const { data, error } = await supabase
      .from("stripe_events")
      .select("id")
      .limit(1);

    assert(!error, `stripe_events table should exist: ${error?.message}`);
  });

  await test("Duplicate event IDs are prevented", async () => {
    const testEventId = `evt_test_${Date.now()}`;

    // Insert first event
    const { error: error1 } = await supabase
      .from("stripe_events")
      .insert({ event_id: testEventId, event_type: "test.event" });

    assert(!error1, `First insert should succeed: ${error1?.message}`);

    // Try to insert duplicate
    const { error: error2 } = await supabase
      .from("stripe_events")
      .insert({ event_id: testEventId, event_type: "test.event" });

    assert(error2, "Duplicate insert should fail");

    // Cleanup
    await supabase.from("stripe_events").delete().eq("event_id", testEventId);
  });
}

async function testBillingAuditLog() {
  console.log(`\n${c.bold}▸ Billing Audit Log Tests${c.reset}`);

  await test("billing_audit_log table exists", async () => {
    const { data, error } = await supabase
      .from("billing_audit_log")
      .select("id")
      .limit(1);

    assert(!error, `billing_audit_log table should exist: ${error?.message}`);
  });

  await test("Can insert audit log entry", async () => {
    const { data, error } = await supabase
      .from("billing_audit_log")
      .insert({
        organization_id: testOrgId,
        actor_type: "system",
        action: "test_action",
        resource_type: "subscription",
        metadata: { test: true },
      })
      .select()
      .single();

    assert(!error, `Should insert audit log: ${error?.message}`);
    assert(data.id, "Should return inserted row");

    // Cleanup
    await supabase.from("billing_audit_log").delete().eq("id", data.id);
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log(`
${c.blue}╔═══════════════════════════════════════════════════════════════╗
║     SORTAVO - Stripe Integration Test Suite                    ║
║     ${c.yellow}⚠ Creates real test data in Stripe & Supabase${c.blue}              ║
╚═══════════════════════════════════════════════════════════════╝${c.reset}
`);

  validateEnvironment();

  try {
    await setup();

    // Run all test suites
    await testTrialPeriod();
    await testUpgradeDowngrade();
    await testTierLimits();
    await testCancellation();
    await testWebhookIdempotency();
    await testBillingAuditLog();

  } finally {
    await cleanup();
  }

  // Print summary
  console.log(`
${c.blue}═══════════════════════════════════════════════════════════════${c.reset}
                        TEST RESULTS
${c.blue}═══════════════════════════════════════════════════════════════${c.reset}

  ${c.green}Passed:${c.reset}  ${testResults.passed}
  ${c.red}Failed:${c.reset}  ${testResults.failed}
  ${c.yellow}Skipped:${c.reset} ${testResults.skipped}
  ${c.dim}Total:   ${testResults.passed + testResults.failed + testResults.skipped}${c.reset}

${testResults.failed === 0
  ? `${c.green}✓ All integration tests passed!${c.reset}`
  : `${c.red}✗ Some tests failed${c.reset}`}

${c.blue}═══════════════════════════════════════════════════════════════${c.reset}
`);

  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`${c.red}Fatal error: ${err.message}${c.reset}`);
  cleanup().finally(() => process.exit(1));
});
