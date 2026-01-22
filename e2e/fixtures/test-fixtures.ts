import { test as base, expect, Page } from '@playwright/test';

// Test user credentials - use environment variables in CI
export const TEST_USERS = {
  organizer: {
    email: process.env.TEST_ORGANIZER_EMAIL || 'demo1@sortavo.com',
    password: process.env.TEST_ORGANIZER_PASSWORD || 'demo123456',
  },
  buyer: {
    email: process.env.TEST_BUYER_EMAIL || 'buyer@test.com',
    name: 'Test Buyer',
    phone: '5551234567',
  },
};

// Test raffle data
export const TEST_RAFFLE = {
  slug: process.env.TEST_RAFFLE_SLUG || 'test-rifa',
  title: 'Test Raffle E2E',
};

// Extended test with common utilities
export const test = base.extend<{
  loginAsOrganizer: () => Promise<void>;
  navigateToDashboard: () => Promise<void>;
}>({
  loginAsOrganizer: async ({ page }, use) => {
    const login = async () => {
      await page.goto('/auth');
      await page.fill('input[type="email"]', TEST_USERS.organizer.email);
      await page.fill('input[type="password"]', TEST_USERS.organizer.password);
      await page.click('button[type="submit"]');
      // Wait for redirect to dashboard
      await page.waitForURL(/dashboard/, { timeout: 15000 });
    };
    await use(login);
  },
  navigateToDashboard: async ({ page }, use) => {
    const navigate = async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    };
    await use(navigate);
  },
});

// Helper functions
export async function waitForToast(page: Page, text?: string) {
  const toast = page.locator('[data-sonner-toast], [role="status"]').first();
  await expect(toast).toBeVisible({ timeout: 10000 });
  if (text) {
    await expect(toast).toContainText(text);
  }
  return toast;
}

export async function selectRandomTickets(page: Page, count: number = 3) {
  // Wait for ticket grid to load
  await page.waitForSelector('[data-ticket-number], .ticket-cell, button:has-text("#")', {
    timeout: 10000
  });

  // Find available tickets and click them
  const availableTickets = page.locator('[data-status="available"], button:not([disabled]):has-text("#")');
  const ticketCount = await availableTickets.count();

  const toSelect = Math.min(count, ticketCount);
  for (let i = 0; i < toSelect; i++) {
    await availableTickets.nth(i).click();
    await page.waitForTimeout(200); // Small delay between clicks
  }

  return toSelect;
}

export async function fillBuyerForm(page: Page, buyer = TEST_USERS.buyer) {
  await page.fill('input[name="buyerName"], input[placeholder*="nombre"]', buyer.name);
  await page.fill('input[name="buyerEmail"], input[type="email"]', buyer.email);
  await page.fill('input[name="buyerPhone"], input[type="tel"]', buyer.phone);
}

export async function uploadPaymentProof(page: Page, imagePath?: string) {
  // Create a test image if none provided
  const fileInput = page.locator('input[type="file"]');

  if (imagePath) {
    await fileInput.setInputFiles(imagePath);
  } else {
    // Create a simple test image buffer
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fileInput.setInputFiles({
      name: 'test-payment-proof.png',
      mimeType: 'image/png',
      buffer,
    });
  }

  // Wait for upload to complete
  await page.waitForTimeout(1000);
}

export { expect };
