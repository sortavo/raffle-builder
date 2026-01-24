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

// Get the raffle URL - handles both /r/slug and /org/slug formats
export function getRaffleUrl(slug: string): string {
  // If slug contains a slash, it's likely in org/raffle format
  if (slug.includes('/')) {
    return `/${slug}`;
  }
  // Otherwise use the /r/ prefix
  return `/r/${slug}`;
}

// Check if a raffle exists at the given slug
export async function checkRaffleExists(page: Page, slug: string): Promise<boolean> {
  await page.goto(getRaffleUrl(slug));
  await page.waitForLoadState('networkidle');

  // Check if we see the "not found" message
  const notFound = page.locator('text=/no encontr|not found|no existe/i');
  const hasNotFound = await notFound.count() > 0;

  return !hasNotFound;
}

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
  // Wait for ticket grid to load - look for tabpanel with buttons
  await page.locator('[role="tabpanel"]').first().waitFor({ timeout: 15000 });

  // Wait a bit for tickets to render
  await page.waitForTimeout(1000);

  // Find available tickets - they are buttons inside tabpanel that are not disabled
  // The tickets are buttons with text like "0000001" or "● 0000001"
  const availableTickets = page.locator('[role="tabpanel"] button:not([disabled])');

  const ticketCount = await availableTickets.count();

  if (ticketCount === 0) {
    console.log('No tickets found in tabpanel');
    return 0;
  }

  const toSelect = Math.min(count, ticketCount);
  for (let i = 0; i < toSelect; i++) {
    await availableTickets.nth(i).click();
    await page.waitForTimeout(300); // Small delay between clicks
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
