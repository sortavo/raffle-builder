import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Sortavo/i);
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Precios');
    await expect(page).toHaveURL(/pricing/);
  });
});

test.describe('Public Raffle', () => {
  test('should display raffle details', async ({ page }) => {
    // This will need a real raffle slug to work
    await page.goto('/r/test-raffle');
    // Add assertions based on your raffle page structure
  });
});

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('form')).toBeVisible();
  });

  test('should display error on invalid login', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Expect error message
    await expect(page.locator('[role="alert"], .text-destructive')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Accessibility', () => {
  test('homepage should have no obvious a11y issues', async ({ page }) => {
    await page.goto('/');
    // Basic accessibility checks
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });
});
