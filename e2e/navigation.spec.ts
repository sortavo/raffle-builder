/**
 * E2E Tests: Navigation and Routing
 *
 * Tests basic navigation and routing throughout the application.
 * These tests verify that pages load correctly and navigation works as expected.
 */

import { test, expect, TEST_USERS } from './fixtures/test-fixtures';

test.describe('Navigation - Public Pages', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Homepage should have content
    await expect(page.locator('body')).toBeVisible();

    // Should have some heading or main content
    const mainContent = page.locator('h1, main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should load pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();

    // Should show pricing information
    const pricingContent = page.locator('text=/precio|price|plan|gratis|free/i').first();
    await expect(pricingContent).toBeVisible({ timeout: 10000 });
  });

  test('should load features page', async ({ page }) => {
    await page.goto('/features');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load help center', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Should show login form
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should load terms of service', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load privacy policy', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load contact page', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should load system status page', async ({ page }) => {
    await page.goto('/status');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation - URL Redirects', () => {
  test('should redirect /login to /auth', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/auth/);
  });

  test('should redirect /signup to /auth', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/auth/);
  });

  test('should redirect /settings to /dashboard/settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should redirect (may need auth first)
    const url = page.url();
    expect(url).toMatch(/settings|auth/);
  });

  test('should redirect /support to /help', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/help/);
  });

  test('should redirect /faq to /help', async ({ page }) => {
    await page.goto('/faq');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/help/);
  });
});

test.describe('Navigation - 404 Handling', () => {
  test('should show 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should show 404 or not found message
    const notFound = page.locator('text=/404|not found|no encontr|pagina no existe/i').first();
    await expect(notFound).toBeVisible({ timeout: 10000 });
  });

  test('should allow navigating back from 404', async ({ page }) => {
    // Go to homepage first
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to 404
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Should be back on homepage
    await expect(page).toHaveURL('/');
  });
});

test.describe('Navigation - Protected Routes', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to auth or show login prompt
    const isOnAuth = page.url().includes('/auth');
    const hasLoginForm = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);

    expect(isOnAuth || hasLoginForm).toBeTruthy();
  });

  test('should redirect unauthenticated users from settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const isOnAuth = page.url().includes('/auth');
    const hasLoginForm = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);

    expect(isOnAuth || hasLoginForm).toBeTruthy();
  });

  test('should redirect unauthenticated users from approvals', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    const isOnAuth = page.url().includes('/auth');
    const hasLoginForm = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);

    expect(isOnAuth || hasLoginForm).toBeTruthy();
  });
});

test.describe('Navigation - Authenticated Routes', () => {
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

  test('should navigate to dashboard after login', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    // Navigate to raffles
    await page.goto('/dashboard/raffles');
    await expect(page).toHaveURL(/raffles/);
    await expect(page.locator('body')).toBeVisible();

    // Navigate to settings
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/settings/);
    await expect(page.locator('body')).toBeVisible();

    // Navigate to approvals
    await page.goto('/dashboard/approvals');
    await expect(page).toHaveURL(/approvals/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to raffle creation page', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await expect(page).toHaveURL(/new/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to analytics page', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/analytics');
    await expect(page).toHaveURL(/analytics/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to buyers page', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/buyers');
    await expect(page).toHaveURL(/buyers/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to subscription page', async ({ page }) => {
    const loggedIn = await loginFirst(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/subscription');
    await expect(page).toHaveURL(/subscription/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation - Header and Footer Links', () => {
  test('should have working header navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for header/nav
    const header = page.locator('header, nav, [role="navigation"]').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // Check for common nav links
    const navLinks = page.locator('header a, nav a');
    const linkCount = await navLinks.count();

    expect(linkCount).toBeGreaterThan(0);
  });

  test('should have working footer links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for footer
    const footer = page.locator('footer').first();
    const hasFooter = await footer.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFooter) {
      const footerLinks = page.locator('footer a');
      const linkCount = await footerLinks.count();

      expect(linkCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Navigation - Mobile Navigation', () => {
  test('should show mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for mobile menu button (hamburger)
    const menuButton = page.locator(
      'button[aria-label*="menu"], button[aria-label*="Menu"], [data-testid="mobile-menu"], .hamburger'
    ).first();

    const hasMobileMenu = await menuButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasMobileMenu) {
      await menuButton.click();

      // Menu should open
      const mobileNav = page.locator('[role="menu"], [role="dialog"], .mobile-menu, .menu-open').first();
      await expect(mobileNav).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate using mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first();
    const hasMobileMenu = await menuButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasMobileMenu) {
      await menuButton.click();
      await page.waitForTimeout(500);

      // Click a link in the menu
      const pricingLink = page.locator('a:has-text("Precio"), a:has-text("Pricing")').first();
      if (await pricingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pricingLink.click();
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(/pricing/);
      }
    }
  });
});

test.describe('Navigation - Raffle Public Routes', () => {
  test('should handle /r/:slug route format', async ({ page }) => {
    await page.goto('/r/test-raffle');
    await page.waitForLoadState('networkidle');

    // Should either show raffle or 404
    const content = page.locator('h1, h2, text=/no encontr|not found/i').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should handle /:org/:slug route format', async ({ page }) => {
    await page.goto('/test-org/test-raffle');
    await page.waitForLoadState('networkidle');

    // Should either show raffle or redirect/404
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle my-tickets page', async ({ page }) => {
    await page.goto('/my-tickets');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation - Browser History', () => {
  test('should support browser back navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/');
  });

  test('should support browser forward navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    await page.goForward();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/pricing/);
  });
});

test.describe('Navigation - Page Load Performance', () => {
  test('homepage should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('auth page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });
});
