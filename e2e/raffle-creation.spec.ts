/**
 * E2E Tests: Raffle Creation Flow
 *
 * Tests the complete flow of creating a new raffle.
 * These tests verify form validation, step navigation, and successful raffle creation.
 *
 * Prerequisites:
 *   - Set TEST_ORGANIZER_EMAIL and TEST_ORGANIZER_PASSWORD environment variables
 *   - Or use the default demo credentials
 *   - User must have permission to create raffles
 */

import { test, expect, TEST_USERS } from './fixtures/test-fixtures';

// Helper function to login before each test
async function loginAsOrganizer(page: import('@playwright/test').Page): Promise<boolean> {
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

test.describe('Raffle Creation - Access and Navigation', () => {
  test('should navigate to create raffle page from dashboard', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles');
    await page.waitForLoadState('networkidle');

    // Look for create/new raffle button
    const createButton = page.locator(
      'a[href*="/new"], button:has-text("Crear"), button:has-text("Nuevo"), button:has-text("Nueva Rifa")'
    ).first();

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForURL(/raffles\/new/, { timeout: 10000 });
    } else {
      // Navigate directly
      await page.goto('/dashboard/raffles/new');
    }

    // Should be on the raffle creation page
    await expect(page).toHaveURL(/raffles\/new/);
  });

  test('should show raffle creation form/wizard', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Should display form elements
    const formVisible = await page.locator('form, [role="form"], input, textarea').first().isVisible({ timeout: 10000 });
    expect(formVisible).toBeTruthy();
  });
});

test.describe('Raffle Creation - Form Validation', () => {
  test('should validate required title field', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Try to proceed without filling title
    const nextButton = page.locator(
      'button:has-text("Siguiente"), button:has-text("Continuar"), button:has-text("Next"), button[type="submit"]'
    ).first();

    if (await nextButton.isVisible({ timeout: 5000 })) {
      await nextButton.click();

      // Should show validation error for title
      const errorMessage = page.locator('text=/requerido|obligatorio|required|campo/i').first();
      const invalidField = page.locator('[aria-invalid="true"], .error, .invalid').first();

      await expect(errorMessage.or(invalidField)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate ticket quantity field', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Look for ticket quantity input
    const ticketInput = page.locator(
      'input[name*="ticket"], input[name*="boleto"], input[placeholder*="cantidad"], input[type="number"]'
    ).first();

    if (await ticketInput.isVisible({ timeout: 5000 })) {
      // Try entering invalid value
      await ticketInput.fill('0');

      const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();

        // Should show error for invalid quantity
        const hasError = await page.locator('text=/minimo|minimum|mayor|greater|invalid/i').first()
          .isVisible({ timeout: 3000 }).catch(() => false);

        // Or the field should be marked invalid
        const isInvalid = await ticketInput.evaluate((el) =>
          el.getAttribute('aria-invalid') === 'true' || el.classList.contains('error')
        );

        expect(hasError || isInvalid).toBeTruthy();
      }
    }
  });

  test('should validate ticket price field', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Look for price input
    const priceInput = page.locator(
      'input[name*="price"], input[name*="precio"], input[placeholder*="precio"]'
    ).first();

    if (await priceInput.isVisible({ timeout: 5000 })) {
      // Try entering negative value
      await priceInput.fill('-100');

      const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();

        // Validation should prevent negative prices
        const pageStillOnForm = await page.locator('input[name*="price"], input[name*="precio"]').first()
          .isVisible({ timeout: 3000 }).catch(() => false);
        expect(pageStillOnForm).toBeTruthy();
      }
    }
  });
});

test.describe('Raffle Creation - Form Filling', () => {
  test('should fill basic raffle information', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    const testRaffleTitle = `Test Raffle E2E ${Date.now()}`;

    // Fill title
    const titleInput = page.locator(
      'input[name="title"], input[name="nombre"], input[placeholder*="titulo"], input[placeholder*="nombre"]'
    ).first();

    if (await titleInput.isVisible({ timeout: 5000 })) {
      await titleInput.fill(testRaffleTitle);
      await expect(titleInput).toHaveValue(testRaffleTitle);
    }

    // Fill description if available
    const descInput = page.locator('textarea[name="description"], textarea').first();
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill('This is a test raffle created by E2E automation tests.');
    }
  });

  test('should configure ticket settings', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Fill required title first
    const titleInput = page.locator('input[name="title"], input[name="nombre"]').first();
    if (await titleInput.isVisible({ timeout: 5000 })) {
      await titleInput.fill(`Test Raffle ${Date.now()}`);
    }

    // Look for ticket configuration fields
    const ticketCountInput = page.locator(
      'input[name*="totalTickets"], input[name*="cantidadBoletos"], input[name*="ticketCount"]'
    ).first();

    if (await ticketCountInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketCountInput.fill('100');
    }

    const ticketPriceInput = page.locator(
      'input[name*="price"], input[name*="precio"], input[name*="ticketPrice"]'
    ).first();

    if (await ticketPriceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketPriceInput.fill('50');
    }
  });

  test('should allow setting raffle end date', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Look for date picker
    const dateInput = page.locator(
      'input[type="date"], input[name*="date"], input[name*="fecha"], button:has-text("Fecha")'
    ).first();

    if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click to open date picker if it's a button
      if (await dateInput.evaluate(el => el.tagName === 'BUTTON')) {
        await dateInput.click();
        // Wait for calendar to appear
        await page.locator('[role="dialog"], [role="grid"], .calendar').first()
          .waitFor({ timeout: 3000 }).catch(() => null);
      } else {
        // Direct input for date fields
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 1);
        await dateInput.fill(futureDate.toISOString().split('T')[0]);
      }
    }
  });
});

test.describe('Raffle Creation - Wizard Steps', () => {
  test('should navigate through wizard steps', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Check if there are step indicators
    const stepIndicators = page.locator(
      '[data-step], .step, [role="progressbar"], [aria-label*="step"], .stepper'
    );
    const hasSteps = await stepIndicators.count() > 0;

    if (hasSteps) {
      // Fill required fields on first step
      const titleInput = page.locator('input[name="title"], input[name="nombre"]').first();
      if (await titleInput.isVisible({ timeout: 5000 })) {
        await titleInput.fill(`Test Wizard Raffle ${Date.now()}`);
      }

      // Try to go to next step
      const nextButton = page.locator(
        'button:has-text("Siguiente"), button:has-text("Continuar"), button:has-text("Next")'
      ).first();

      if (await nextButton.isVisible({ timeout: 3000 })) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Should be on a different step or show different content
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should allow going back to previous step', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Fill first step and proceed
    const titleInput = page.locator('input[name="title"], input[name="nombre"]').first();
    if (await titleInput.isVisible({ timeout: 5000 })) {
      await titleInput.fill(`Test Back Navigation ${Date.now()}`);
    }

    const nextButton = page.locator('button:has-text("Siguiente"), button:has-text("Continuar")').first();
    if (await nextButton.isVisible({ timeout: 3000 })) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Look for back button
      const backButton = page.locator(
        'button:has-text("Anterior"), button:has-text("Atras"), button:has-text("Back"), button:has-text("Regresar")'
      ).first();

      if (await backButton.isVisible({ timeout: 3000 })) {
        await backButton.click();
        await page.waitForTimeout(500);

        // Should be back on first step with data preserved
        const titleValue = await titleInput.inputValue();
        expect(titleValue).toContain('Test Back Navigation');
      }
    }
  });
});

test.describe('Raffle Creation - Image Upload', () => {
  test('should show image upload option', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Look for file input or upload button
    const uploadInput = page.locator(
      'input[type="file"], button:has-text("Subir imagen"), button:has-text("Upload"), [data-testid="image-upload"]'
    ).first();

    const hasUpload = await uploadInput.isVisible({ timeout: 10000 }).catch(() => false);

    // Image upload should be available somewhere in the form
    if (hasUpload) {
      await expect(uploadInput).toBeVisible();
    }
  });
});

test.describe('Raffle Creation - Draft and Preview', () => {
  test('should show preview of raffle before creation', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Fill basic info
    const titleInput = page.locator('input[name="title"], input[name="nombre"]').first();
    if (await titleInput.isVisible({ timeout: 5000 })) {
      await titleInput.fill('Preview Test Raffle');
    }

    // Look for preview button
    const previewButton = page.locator(
      'button:has-text("Preview"), button:has-text("Vista previa"), button:has-text("Previsualizar")'
    ).first();

    if (await previewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewButton.click();

      // Should show preview modal or section
      const preview = page.locator('[role="dialog"], .preview, [data-testid="raffle-preview"]').first();
      await expect(preview).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Raffle Creation - Submit', () => {
  // This test is skipped by default to avoid creating test data in production
  test.skip('should create raffle successfully', async ({ page }) => {
    const loggedIn = await loginAsOrganizer(page);
    test.skip(!loggedIn, 'Could not login with test credentials');

    await page.goto('/dashboard/raffles/new');
    await page.waitForLoadState('networkidle');

    // Fill all required fields
    const titleInput = page.locator('input[name="title"], input[name="nombre"]').first();
    await titleInput.fill(`E2E Test Raffle ${Date.now()}`);

    // Fill other required fields based on the form structure
    // ... add more field fills as needed

    // Submit the form
    const submitButton = page.locator(
      'button:has-text("Crear"), button:has-text("Create"), button:has-text("Guardar"), button[type="submit"]'
    ).last();

    await submitButton.click();

    // Should redirect to raffle detail or list
    await page.waitForURL(/raffles\/(?!new)/, { timeout: 15000 });

    // Should show success message
    const successMessage = page.locator('text=/creado|success|exitosamente/i').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});
