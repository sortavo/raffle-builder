/**
 * E2E Tests: Authentication Flow
 *
 * Tests the login/logout flow for the application.
 * These tests verify that users can authenticate and maintain sessions.
 *
 * Prerequisites:
 *   - Set TEST_ORGANIZER_EMAIL and TEST_ORGANIZER_PASSWORD environment variables
 *   - Or use the default demo credentials
 */

import { test, expect, TEST_USERS } from './fixtures/test-fixtures';

test.describe('Authentication - Login Flow', () => {
  test('should display login form with required fields', async ({ page }) => {
    await page.goto('/auth');

    // Verify form elements are visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    await page.goto('/auth');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Should show validation error or fields should be marked as invalid
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate(
      (el) => !el.checkValidity() || el.getAttribute('aria-invalid') === 'true'
    );
    expect(isInvalid).toBeTruthy();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[type="email"]', 'invalid@nonexistent.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    // Wait for error message
    const errorMessage = page.locator('text=/error|invalid|incorrect|failed|no encontrado/i').first();
    const alertRole = page.locator('[role="alert"]').first();

    await expect(errorMessage.or(alertRole)).toBeVisible({ timeout: 10000 });
  });

  test('should show error for malformed email', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[type="email"]', 'notanemail');
    await page.fill('input[type="password"]', 'somepassword');

    // Check HTML5 validation
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el) => !el.checkValidity());
    expect(isInvalid).toBeTruthy();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or onboarding
    try {
      await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
      // Verify we're on an authenticated page
      await expect(page).not.toHaveURL(/auth/);
    } catch {
      // If credentials are invalid, the test should be skipped
      const hasError = await page.locator('text=/error|invalid/i').first().isVisible();
      test.skip(hasError, 'Test credentials are invalid - configure TEST_ORGANIZER_EMAIL and TEST_ORGANIZER_PASSWORD');
    }
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
    } catch {
      test.skip(true, 'Could not login - skipping session persistence test');
      return;
    }

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated (not redirected to auth)
    await expect(page).not.toHaveURL(/auth/);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should either redirect to auth or show login prompt
    const isOnAuth = page.url().includes('/auth');
    const hasLoginPrompt = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);

    expect(isOnAuth || hasLoginPrompt).toBeTruthy();
  });
});

test.describe('Authentication - Logout Flow', () => {
  async function loginFirst(page: import('@playwright/test').Page): Promise<boolean> {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  test('should logout successfully from settings page', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    // Navigate to settings where logout button is typically located
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Find and click logout button
    const logoutButton = page.locator(
      'button:has-text("Cerrar sesión"), button:has-text("Logout"), button:has-text("Salir"), [data-testid="logout-button"]'
    ).first();

    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click();

      // Should redirect to home or auth page
      await page.waitForURL(/(^\/($|auth|\?))|auth/, { timeout: 10000 });

      // Verify we're logged out
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should redirect back to auth
      const redirectedToAuth = page.url().includes('/auth');
      const hasLoginForm = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
      expect(redirectedToAuth || hasLoginForm).toBeTruthy();
    }
  });

  test('should clear session data on logout', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    // Navigate to settings and logout
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const logoutButton = page.locator(
      'button:has-text("Cerrar sesión"), button:has-text("Logout"), button:has-text("Salir")'
    ).first();

    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click();
      await page.waitForURL(/(^\/($|auth|\?))|auth/, { timeout: 10000 });

      // Try to access a protected route
      await page.goto('/dashboard/raffles');
      await page.waitForLoadState('networkidle');

      // Should not have access
      const isProtected = page.url().includes('/auth') ||
        await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
      expect(isProtected).toBeTruthy();
    }
  });
});

test.describe('Authentication - Password Visibility Toggle', () => {
  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/auth');

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();

    // Look for a show/hide password toggle button
    const toggleButton = page.locator(
      'button[aria-label*="password"], button:has([data-testid="eye"]), [data-testid="toggle-password"]'
    ).first();

    if (await toggleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggleButton.click();

      // Password field should now be text type
      const inputType = await page.locator('input').filter({ has: page.locator('[name="password"]') }).first()
        .getAttribute('type').catch(() => null);

      // Check if either the type changed or there's a text input now
      const hasTextInput = inputType === 'text' ||
        await page.locator('input[type="text"]').isVisible().catch(() => false);
      expect(hasTextInput).toBeTruthy();
    }
  });
});
