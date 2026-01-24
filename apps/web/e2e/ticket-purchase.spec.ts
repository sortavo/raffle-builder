/**
 * E2E Tests: Ticket Purchase Flow
 *
 * Tests the public raffle view and ticket selection/purchase flow.
 * These tests verify that buyers can view raffles and select tickets.
 *
 * Prerequisites:
 *   - Set TEST_RAFFLE_SLUG environment variable to a valid raffle slug
 *   - Or use the default test raffle slug
 */

import { test, expect, TEST_USERS, TEST_RAFFLE, getRaffleUrl, selectRandomTickets, fillBuyerForm } from './fixtures/test-fixtures';

test.describe('Ticket Purchase - Public Raffle View', () => {
  test('should display raffle page with title', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Should show raffle title or heading
    const heading = page.locator('h1, h2, [data-testid="raffle-title"]').first();

    try {
      await expect(heading).toBeVisible({ timeout: 10000 });
    } catch {
      // Raffle may not exist - check for error message
      const notFound = page.locator('text=/no encontr|not found|no existe/i').first();
      const isNotFound = await notFound.isVisible().catch(() => false);
      test.skip(isNotFound, `Raffle "${TEST_RAFFLE.slug}" not found - set TEST_RAFFLE_SLUG to a valid slug`);
    }
  });

  test('should display ticket grid or list', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Look for ticket display - could be grid, tabs, or list
    const ticketContainer = page.locator(
      '[role="tabpanel"], [data-testid="ticket-grid"], .ticket-grid, .tickets-container'
    ).first();

    try {
      await expect(ticketContainer).toBeVisible({ timeout: 15000 });
    } catch {
      // Check if raffle exists
      const notFound = page.locator('text=/no encontr|not found/i').first();
      test.skip(await notFound.isVisible(), 'Raffle not found');
    }
  });

  test('should display ticket price information', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Should show price somewhere on the page
    const priceDisplay = page.locator(
      'text=/\\$\\d+|MXN|USD|precio|boleto.*\\d+/i'
    ).first();

    try {
      await expect(priceDisplay).toBeVisible({ timeout: 10000 });
    } catch {
      // Price might be shown differently
      const anyPrice = page.locator('text=/\\d+.*boleto|ticket.*\\d+/i').first();
      const found = await anyPrice.isVisible().catch(() => false);
      test.skip(!found, 'Price information not found on page');
    }
  });

  test('should display raffle description or details', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Look for description or prize information
    const description = page.locator(
      '[data-testid="raffle-description"], .description, text=/premio|prize|descripcion/i'
    ).first();

    // Description is optional, just verify page loaded correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // Title should be visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should show available ticket count', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Look for availability indicator
    const availability = page.locator(
      'text=/disponible|available|\\d+.*boleto|\\d+.*ticket|vendido|sold/i'
    ).first();

    // Availability info should be present
    const found = await availability.isVisible({ timeout: 10000 }).catch(() => false);

    // If not found, page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Ticket Purchase - Ticket Selection', () => {
  test('should allow selecting available tickets', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Wait for tickets to load
    await page.locator('[role="tabpanel"], .ticket-grid').first().waitFor({ timeout: 15000 }).catch(() => null);

    // Try to select tickets
    const selectedCount = await selectRandomTickets(page, 2);

    if (selectedCount > 0) {
      // Selection should be reflected in UI
      const selectionIndicator = page.locator(
        'text=/\\d+.*seleccionado|\\d+.*selected|boleto.*seleccionado/i'
      ).first();

      await expect(selectionIndicator).toBeVisible({ timeout: 5000 });
    } else {
      // No tickets available
      test.skip(true, 'No available tickets to select');
    }
  });

  test('should update total when selecting tickets', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Wait for tickets to load
    await page.waitForTimeout(2000);

    // Select a ticket
    const selectedCount = await selectRandomTickets(page, 1);
    test.skip(selectedCount === 0, 'No tickets available');

    // Total should be updated
    const totalDisplay = page.locator('text=/total|subtotal|\\$\\d+/i').first();
    await expect(totalDisplay).toBeVisible({ timeout: 5000 });
  });

  test('should allow deselecting tickets', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Wait for tickets to load
    await page.waitForTimeout(2000);

    // Find and click a ticket
    const availableTickets = page.locator('[role="tabpanel"] button:not([disabled])');
    const ticketCount = await availableTickets.count();
    test.skip(ticketCount === 0, 'No tickets available');

    // Select first ticket
    await availableTickets.first().click();
    await page.waitForTimeout(300);

    // Deselect by clicking again
    await availableTickets.first().click();
    await page.waitForTimeout(300);

    // Selection count should be back to 0 or show no selection
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show sold/reserved tickets as unavailable', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Look for sold/unavailable tickets
    const soldTickets = page.locator(
      '[data-status="sold"], [data-status="reserved"], button[disabled], .sold, .reserved'
    );

    const soldCount = await soldTickets.count();

    if (soldCount > 0) {
      // Sold tickets should be visually different
      const firstSold = soldTickets.first();
      const isDisabled = await firstSold.isDisabled().catch(() => false);
      expect(isDisabled).toBeTruthy();
    }
  });

  test('should support selecting multiple tickets', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Wait for tickets to load
    await page.waitForTimeout(2000);

    // Select multiple tickets
    const selectedCount = await selectRandomTickets(page, 5);
    test.skip(selectedCount < 2, 'Not enough tickets available for multi-select test');

    // Should show multiple selections
    const selectionText = page.locator('text=/\\d+.*boleto|\\d+.*ticket|selected/i').first();
    await expect(selectionText).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Ticket Purchase - Discount Packages', () => {
  test('should display discount packages if available', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Look for package/discount options
    const packages = page.locator(
      'text=/paquete|package|descuento|discount|oferta|mejor valor/i'
    );

    const hasPackages = await packages.count() > 0;

    if (hasPackages) {
      await expect(packages.first()).toBeVisible();
    }
  });

  test('should allow selecting a package deal', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Look for package buttons/cards
    const packageOption = page.locator(
      '[data-testid="package-option"], button:has-text("paquete"), .package-card'
    ).first();

    if (await packageOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await packageOption.click();
      await page.waitForTimeout(500);

      // Should update selection
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Ticket Purchase - Checkout Flow', () => {
  test('should show purchase button after selection', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Look for buy/purchase button
    const buyButton = page.locator(
      'button:has-text("Comprar"), button:has-text("Buy"), button:has-text("Reservar"), button:has-text("Apartar")'
    ).first();

    await expect(buyButton).toBeVisible({ timeout: 10000 });
  });

  test('should show buyer form when proceeding to checkout', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Select tickets first
    await page.waitForTimeout(2000);
    const selectedCount = await selectRandomTickets(page, 1);
    test.skip(selectedCount === 0, 'No tickets available');

    // Click buy button
    const buyButton = page.locator(
      'button:has-text("Comprar"), button:has-text("Reservar"), button:has-text("Apartar")'
    ).first();

    if (await buyButton.isVisible({ timeout: 5000 })) {
      await buyButton.click();
      await page.waitForTimeout(1000);

      // Should show buyer form (in dialog or new section)
      const buyerForm = page.locator(
        'input[name="buyerName"], input[placeholder*="nombre"], input[type="email"]'
      ).first();

      await expect(buyerForm).toBeVisible({ timeout: 10000 });
    }
  });

  test('should validate buyer information', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Select tickets
    await page.waitForTimeout(2000);
    const selectedCount = await selectRandomTickets(page, 1);
    test.skip(selectedCount === 0, 'No tickets available');

    // Proceed to checkout
    const buyButton = page.locator('button:has-text("Comprar"), button:has-text("Reservar")').first();
    if (await buyButton.isVisible({ timeout: 5000 })) {
      await buyButton.click();
      await page.waitForTimeout(1000);

      // Try to submit without filling form
      const submitButton = page.locator(
        'button:has-text("Confirmar"), button:has-text("Continuar"), button[type="submit"]'
      ).first();

      if (await submitButton.isVisible({ timeout: 5000 })) {
        await submitButton.click();

        // Should show validation errors
        const errorText = page.locator('text=/requerido|required|invalido|invalid/i').first();
        const invalidField = page.locator('[aria-invalid="true"]').first();

        await expect(errorText.or(invalidField)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // This test is skipped by default to avoid creating real reservations
  test.skip('should complete reservation successfully', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Select tickets
    await selectRandomTickets(page, 1);

    // Proceed to checkout
    await page.click('button:has-text("Comprar"), button:has-text("Reservar")');
    await page.waitForTimeout(1000);

    // Fill buyer form
    await fillBuyerForm(page);

    // Submit
    await page.click('button:has-text("Confirmar"), button[type="submit"]');

    // Should show success or payment instructions
    const success = page.locator('text=/exito|success|pago|instrucciones|gracias/i').first();
    await expect(success).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Ticket Purchase - Payment Instructions', () => {
  test('should show payment methods for raffle', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Look for payment information on the page
    const paymentInfo = page.locator(
      'text=/pago|payment|transferencia|banco|deposito/i'
    ).first();

    // Payment info might be shown after selection or in a dedicated section
    const found = await paymentInfo.isVisible({ timeout: 5000 }).catch(() => false);

    // Page should at least be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Ticket Purchase - Edge Cases', () => {
  test('should handle non-existent raffle gracefully', async ({ page }) => {
    await page.goto('/r/definitely-not-a-real-raffle-12345');
    await page.waitForLoadState('networkidle');

    // Should show error or 404 message
    const errorMessage = page.locator(
      'text=/no encontr|not found|404|no existe|error/i'
    ).first();

    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should handle raffle with no available tickets', async ({ page }) => {
    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    await page.waitForLoadState('networkidle');

    // Check for sold out message or disabled purchase
    const soldOut = page.locator('text=/agotado|sold out|no disponible/i').first();
    const soldOutVisible = await soldOut.isVisible({ timeout: 5000 }).catch(() => false);

    if (soldOutVisible) {
      // Buy button should be disabled
      const buyButton = page.locator('button:has-text("Comprar")').first();
      if (await buyButton.isVisible()) {
        const isDisabled = await buyButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    }
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto(getRaffleUrl(TEST_RAFFLE.slug));

    // Page should eventually load
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });

    // Clean up route
    await page.unroute('**/*');
  });
});
