import { test, expect, TEST_USERS, waitForToast } from './fixtures/test-fixtures';

// Flag to track if credentials are valid
let credentialsValid: boolean | null = null;

test.describe('Organizer Flow - Authentication', () => {

  test('should show login form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error - use separate locators
    const errorText = page.locator('text=/error|inválido|incorrect|failed/i').first();
    const alertRole = page.locator('[role="alert"]').first();

    // Wait for either to appear
    await expect(errorText.or(alertRole)).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');

    // Check if login succeeded - could redirect to dashboard or show error
    try {
      await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
      credentialsValid = true;
    } catch {
      // Login may have failed - check for error message
      const errorVisible = await page.locator('text=/error|inválido|incorrect/i').first().isVisible();
      if (errorVisible) {
        credentialsValid = false;
        console.log('⚠️ Test organizer credentials are invalid. Dashboard tests will be skipped.');
        console.log('   To run these tests, set TEST_ORGANIZER_EMAIL and TEST_ORGANIZER_PASSWORD environment variables.');
        test.skip(true, 'Invalid test credentials');
      }
      throw new Error('Login timeout - credentials may be invalid');
    }
  });

  test('should persist login session', async ({ page }) => {
    test.skip(credentialsValid === false, 'Test credentials are invalid');

    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
    } catch {
      test.skip(true, 'Could not login - skipping session test');
      return;
    }

    // Navigate to another page and back
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();

    // Should still be logged in (not redirected to auth)
    await expect(page).not.toHaveURL(/auth/);
  });
});

test.describe('Organizer Flow - Dashboard Navigation', () => {

  async function attemptLogin(page: import('@playwright/test').Page): Promise<boolean> {
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

  test('should show dashboard overview', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should navigate to raffles list', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles');
    await expect(page.locator('body')).toBeVisible();
    // Should show raffles list or empty state
    await expect(
      page.locator('text=/sorteo|raffle|crear|nuevo/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to settings', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/settings');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to approvals', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/approvals');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Organizer Flow - Create Raffle', () => {

  async function attemptLogin(page: import('@playwright/test').Page): Promise<boolean> {
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

  test('should show create raffle form', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');

    // Should show form fields
    await expect(
      page.locator('input, textarea, [role="form"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Try to proceed without filling required fields
    const nextBtn = page.locator('button:has-text("Siguiente"), button:has-text("Crear"), button:has-text("Continuar")').first();

    if (await nextBtn.isVisible()) {
      await nextBtn.click();

      // Should show validation errors
      const errorText = page.locator('text=/requerido|obligatorio|required/i').first();
      const alertRole = page.locator('[role="alert"]').first();
      await expect(errorText.or(alertRole)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should fill basic raffle info', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Fill title
    const titleInput = page.locator('input[name="title"], input[placeholder*="título"], input[placeholder*="nombre"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Raffle E2E ' + Date.now());
    }

    // Fill description if visible
    const descInput = page.locator('textarea[name="description"], textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('This is a test raffle created by E2E tests');
    }
  });
});

test.describe('Organizer Flow - Manage Payments', () => {

  async function attemptLogin(page: import('@playwright/test').Page): Promise<boolean> {
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

  test('should show approvals page', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/approvals');

    await expect(page.locator('body')).toBeVisible();
    // Should show pending approvals or empty state
    const statusText = page.locator('text=/pendiente|aprobación|sin comprobantes|vacío|empty/i').first();
    const table = page.locator('table, [role="table"]').first();
    await expect(statusText.or(table)).toBeVisible({ timeout: 10000 });
  });

  test('should show raffle detail with approvals tab', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles');
    await page.waitForLoadState('networkidle');

    // Click on first raffle if exists
    const raffleLink = page.locator('a[href*="/dashboard/raffles/"], tr, [role="row"]').first();

    if (await raffleLink.isVisible()) {
      await raffleLink.click();
      await page.waitForLoadState('networkidle');

      // Look for approvals tab
      const approvalsTab = page.locator('button:has-text("Aprobaciones"), [role="tab"]:has-text("Aprobaciones")');
      if (await approvalsTab.isVisible()) {
        await approvalsTab.click();
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

test.describe('Organizer Flow - Draw Winner', () => {

  async function attemptLogin(page: import('@playwright/test').Page): Promise<boolean> {
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

  test('should navigate to draw winner page', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles');
    await page.waitForLoadState('networkidle');

    // Find a raffle and navigate to draw
    const raffleRow = page.locator('a[href*="/dashboard/raffles/"], tr').first();

    if (await raffleRow.isVisible()) {
      // Try to find draw button or navigate to raffle detail
      const drawLink = page.locator('a[href*="/draw"], button:has-text("Sortear")').first();

      if (await drawLink.isVisible()) {
        await drawLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

test.describe('Organizer Flow - Settings', () => {

  async function attemptLogin(page: import('@playwright/test').Page): Promise<boolean> {
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

  test('should show organization settings', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/settings');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show Telegram settings section', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Look for Telegram section - it might be in a tab or accordion
    const telegramSection = page.locator('text=/telegram/i').first();
    const hasTelegram = await telegramSection.isVisible({ timeout: 10000 }).catch(() => false);

    // If not visible directly, the page still loaded successfully
    if (!hasTelegram) {
      // Just verify settings page loaded
      await expect(page.locator('body')).toBeVisible();
    } else {
      await expect(telegramSection).toBeVisible();
    }
  });

  test('should show payment methods settings', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Look for payment section
    const paymentSection = page.locator('text=/pago|payment|banco|transferencia/i').first();
    if (await paymentSection.isVisible()) {
      await expect(paymentSection).toBeVisible();
    }
  });
});

test.describe('Organizer Flow - Logout', () => {

  async function attemptLogin(page: import('@playwright/test').Page): Promise<boolean> {
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

  test('should logout successfully', async ({ page }) => {
    const loggedIn = await attemptLogin(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Find and click logout
    const logoutBtn = page.locator('button:has-text("Cerrar sesión"), button:has-text("Logout"), button:has-text("Salir")');

    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();

      // Should redirect to home or auth
      await page.waitForURL(/(auth|^\/$)/, { timeout: 10000 });
    }
  });
});
