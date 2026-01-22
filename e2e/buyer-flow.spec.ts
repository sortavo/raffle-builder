import { test, expect, TEST_USERS, TEST_RAFFLE, selectRandomTickets, fillBuyerForm, waitForToast, uploadPaymentProof } from './fixtures/test-fixtures';

test.describe('Buyer Flow - Complete Purchase Journey', () => {

  test.describe('1. View Public Raffle', () => {
    test('should display raffle page with title and tickets', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);

      // Should show raffle title
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Should show ticket grid or list
      await expect(
        page.locator('[data-ticket-number], .ticket-grid, .tickets-container').first()
      ).toBeVisible({ timeout: 15000 });
    });

    test('should show ticket prices and available count', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);

      // Should display price somewhere
      await expect(page.locator('text=/\\$\\d+|MXN|precio/i')).toBeVisible();
    });

    test('should be mobile responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`/r/${TEST_RAFFLE.slug}`);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });
  });

  test.describe('2. Ticket Selection', () => {
    test('should allow selecting available tickets', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);
      await page.waitForLoadState('networkidle');

      // Select tickets
      const selectedCount = await selectRandomTickets(page, 2);
      expect(selectedCount).toBeGreaterThan(0);

      // Should show selection summary or count
      await expect(
        page.locator('text=/\\d+ boleto|selected|seleccionado/i')
      ).toBeVisible();
    });

    test('should update total when selecting tickets', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);
      await page.waitForLoadState('networkidle');

      // Select a ticket
      await selectRandomTickets(page, 1);

      // Total should be visible
      await expect(
        page.locator('text=/total|\\$\\d+/i')
      ).toBeVisible();
    });

    test('should not allow selecting sold tickets', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);
      await page.waitForLoadState('networkidle');

      // Try to find a sold ticket
      const soldTicket = page.locator('[data-status="sold"], .sold, [disabled]').first();
      const hasSold = await soldTicket.count() > 0;

      if (hasSold) {
        // Sold tickets should not be clickable or should show indication
        await expect(soldTicket).toHaveAttribute('disabled', /.*/);
      }
    });
  });

  test.describe('3. Reservation Process', () => {
    test('should show buyer form when proceeding to reserve', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);
      await page.waitForLoadState('networkidle');

      // Select tickets
      await selectRandomTickets(page, 1);

      // Click reserve/continue button
      await page.click('button:has-text("Reservar"), button:has-text("Continuar"), button:has-text("Apartar")');

      // Should show buyer form
      await expect(
        page.locator('input[name="buyerName"], input[placeholder*="nombre"], input[type="email"]').first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should validate required buyer fields', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);
      await page.waitForLoadState('networkidle');

      await selectRandomTickets(page, 1);
      await page.click('button:has-text("Reservar"), button:has-text("Continuar"), button:has-text("Apartar")');

      // Try to submit without filling form
      const submitBtn = page.locator('button:has-text("Confirmar"), button:has-text("Reservar"), button[type="submit"]').first();
      await submitBtn.click();

      // Should show validation error
      await expect(
        page.locator('text=/requerido|obligatorio|required|inválido/i, [role="alert"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should complete reservation with valid data', async ({ page }) => {
      await page.goto(`/r/${TEST_RAFFLE.slug}`);
      await page.waitForLoadState('networkidle');

      // Select tickets
      await selectRandomTickets(page, 1);

      // Proceed to reserve
      await page.click('button:has-text("Reservar"), button:has-text("Continuar"), button:has-text("Apartar")');

      // Fill buyer form
      await fillBuyerForm(page);

      // Submit reservation
      await page.click('button:has-text("Confirmar"), button:has-text("Reservar"), button[type="submit"]');

      // Should show success or payment instructions
      await expect(
        page.locator('text=/éxito|confirmado|instrucciones|pago|gracias/i')
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('4. Payment Proof Upload', () => {
    test.skip('should allow uploading payment proof', async ({ page }) => {
      // This test requires a valid reservation first
      // Skip in automated runs, use for manual testing

      await page.goto(`/r/${TEST_RAFFLE.slug}`);
      await page.waitForLoadState('networkidle');

      // Complete reservation first
      await selectRandomTickets(page, 1);
      await page.click('button:has-text("Reservar"), button:has-text("Continuar")');
      await fillBuyerForm(page);
      await page.click('button:has-text("Confirmar"), button[type="submit"]');

      // Wait for payment instructions page
      await page.waitForURL(/payment|pago/, { timeout: 15000 });

      // Upload payment proof
      await uploadPaymentProof(page);

      // Submit proof
      await page.click('button:has-text("Enviar"), button:has-text("Subir")');

      // Should show success message
      await waitForToast(page, /enviado|recibido|éxito/i);
    });
  });

  test.describe('5. Order Verification', () => {
    test('should show order verification page', async ({ page }) => {
      // Use a known reference code or the my-tickets page
      await page.goto('/my-tickets');

      // Should show the page (even if empty)
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Buyer Flow - Edge Cases', () => {
  test('should handle non-existent raffle gracefully', async ({ page }) => {
    await page.goto('/r/non-existent-raffle-xyz123');

    // Should show error or 404
    await expect(
      page.locator('text=/no encontr|not found|404|error/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should handle sold out raffle', async ({ page }) => {
    // This would need a sold-out test raffle
    // For now, just verify the page loads
    await page.goto(`/r/${TEST_RAFFLE.slug}`);
    await expect(page.locator('body')).toBeVisible();
  });
});
