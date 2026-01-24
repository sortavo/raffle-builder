import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://www.sortavo.com';

test.describe('Critical User Flows - Production Monitoring', () => {

  test('Homepage loads correctly', async ({ page }) => {
    const response = await page.goto(PRODUCTION_URL);

    // Page loads successfully
    expect(response?.status()).toBe(200);

    // Main content is visible
    await expect(page.locator('main, #root, body')).toBeVisible();

    // Title contains Sortavo
    await expect(page).toHaveTitle(/Sortavo/i);

    // Navigation is functional
    await expect(page.locator('nav, header').first()).toBeVisible();
  });

  test('Auth page is accessible', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/auth`);

    // Login form is visible
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Pricing page loads with plans', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/pricing`);

    // Page loads
    await expect(page.locator('body')).toBeVisible();

    // Shows pricing content
    await expect(
      page.locator('text=/precio|plan|gratis|premium|enterprise/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Public raffle page structure', async ({ page }) => {
    // Test with a demo raffle if available
    await page.goto(`${PRODUCTION_URL}/r/demo`);

    // Either shows the raffle or a proper error
    await expect(
      page.locator('h1, h2, text=/no encontr|sorteo/i')
    ).toBeVisible({ timeout: 15000 });
  });

  test('Help center is accessible', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/help`);

    await expect(page.locator('body')).toBeVisible();
    await expect(
      page.locator('text=/ayuda|help|faq|preguntas/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('System status page shows services', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/status`);

    await expect(page.locator('body')).toBeVisible();

    // Should show some status indicators
    await expect(
      page.locator('text=/estado|status|operativo|operational/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(PRODUCTION_URL);

    // Page should still work on mobile
    await expect(page.locator('body')).toBeVisible();

    // Navigation should be accessible (maybe hamburger menu)
    await expect(
      page.locator('nav, header, button[aria-label*="menu"], button[aria-label*="Menu"]').first()
    ).toBeVisible();
  });

  test('No console errors on homepage', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Filter out known third-party errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('third-party') && !e.includes('analytics') && !e.includes('favicon')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('Performance - Homepage LCP under 3s', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Measure performance
    const lcpValue = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // Timeout fallback
        setTimeout(() => resolve(0), 5000);
      });
    });

    // LCP should be under 3 seconds (3000ms)
    expect(lcpValue).toBeLessThan(3000);
  });
});
