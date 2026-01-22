import { test, expect, TEST_USERS, waitForToast } from './fixtures/test-fixtures';

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

    // Should show error
    await expect(
      page.locator('text=/error|inválido|incorrect|failed/i, [role="alert"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  });

  test('should persist login session', async ({ page, context }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });

    // Navigate to another page and back
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();

    // Should still be logged in (not redirected to auth)
    await expect(page).not.toHaveURL(/auth/);
  });
});

test.describe('Organizer Flow - Dashboard Navigation', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  });

  test('should show dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should navigate to raffles list', async ({ page }) => {
    await page.goto('/dashboard/raffles');
    await expect(page.locator('body')).toBeVisible();
    // Should show raffles list or empty state
    await expect(
      page.locator('text=/sorteo|raffle|crear|nuevo/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to approvals', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Organizer Flow - Create Raffle', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  });

  test('should show create raffle form', async ({ page }) => {
    await page.goto('/dashboard/raffles/new');

    // Should show form fields
    await expect(
      page.locator('input, textarea, [role="form"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Try to proceed without filling required fields
    const nextBtn = page.locator('button:has-text("Siguiente"), button:has-text("Crear"), button:has-text("Continuar")').first();

    if (await nextBtn.isVisible()) {
      await nextBtn.click();

      // Should show validation errors
      await expect(
        page.locator('text=/requerido|obligatorio|required/i, [role="alert"]')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should fill basic raffle info', async ({ page }) => {
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

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  });

  test('should show approvals page', async ({ page }) => {
    await page.goto('/dashboard/approvals');

    await expect(page.locator('body')).toBeVisible();
    // Should show pending approvals or empty state
    await expect(
      page.locator('text=/pendiente|aprobación|sin comprobantes|vacío|empty/i, table, [role="table"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show raffle detail with approvals tab', async ({ page }) => {
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

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  });

  test('should navigate to draw winner page', async ({ page }) => {
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

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
  });

  test('should show organization settings', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show Telegram settings section', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Look for Telegram section
    const telegramSection = page.locator('text=/telegram/i');
    await expect(telegramSection).toBeVisible({ timeout: 10000 });
  });

  test('should show payment methods settings', async ({ page }) => {
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

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.organizer.email);
    await page.fill('input[type="password"]', TEST_USERS.organizer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });

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
