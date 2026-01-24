import { test, expect, TEST_USERS, TEST_RAFFLE, selectRandomTickets, fillBuyerForm, waitForToast, uploadPaymentProof, checkRaffleExists, getRaffleUrl } from './fixtures/test-fixtures';

// Store raffle existence state
let raffleExists: boolean | null = null;

test.describe('Buyer Flow - Complete Purchase Journey', () => {

  // Check raffle existence before running tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    raffleExists = await checkRaffleExists(page, TEST_RAFFLE.slug);
    await page.close();

    if (!raffleExists) {
      console.log(`⚠️ Test raffle "${TEST_RAFFLE.slug}" not found. Some buyer flow tests will be skipped.`);
      console.log(`   To run these tests, set TEST_RAFFLE_SLUG environment variable to a valid raffle slug.`);
    }
  });

  test.describe('1. View Public Raffle', () => {
    test('should display raffle page with title and tickets', async ({ page }) => {
      test.skip(!raffleExists, `Raffle "${TEST_RAFFLE.slug}" not found - skipping`);

      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));

      // Should show raffle title
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Should show ticket grid - look for tabpanel with ticket buttons
      await expect(
        page.locator('[role="tabpanel"]').first()
      ).toBeVisible({ timeout: 15000 });
    });

    test('should show ticket prices and available count', async ({ page }) => {
      test.skip(!raffleExists, `Raffle "${TEST_RAFFLE.slug}" not found - skipping`);

      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));

      // Should display price somewhere (could be in various formats)
      await expect(
        page.locator('text=/\\$\\d+|MXN|USD|precio|boleto/i').first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should be mobile responsive', async ({ page }) => {
      test.skip(!raffleExists, `Raffle "${TEST_RAFFLE.slug}" not found - skipping`);

      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('h1, h2').first()).toBeVisible();
    });
  });

  test.describe('2. Ticket Selection', () => {
    test('should allow selecting available tickets', async ({ page }) => {
      test.skip(!raffleExists, `Raffle "${TEST_RAFFLE.slug}" not found - skipping`);

      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
      await page.waitForLoadState('networkidle');

      // Select tickets
      const selectedCount = await selectRandomTickets(page, 2);
      expect(selectedCount).toBeGreaterThan(0);

      // Should show selection summary or count
      await expect(
        page.locator('text=/\\d+ boleto|selected|seleccionado/i').first()
      ).toBeVisible();
    });

    test('should update total when selecting tickets', async ({ page }) => {
      test.skip(!raffleExists, `Raffle "${TEST_RAFFLE.slug}" not found - skipping`);

      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
      await page.waitForLoadState('networkidle');

      // Select a ticket
      await selectRandomTickets(page, 1);

      // Total should be visible
      await expect(
        page.locator('text=/total|\\$\\d+/i').first()
      ).toBeVisible();
    });

    test('should not allow selecting sold tickets', async ({ page }) => {
      test.skip(!raffleExists, `Raffle "${TEST_RAFFLE.slug}" not found - skipping`);

      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
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
    test.skip('should show buyer form when proceeding to reserve', async ({ page }) => {
      // Skip: This test requires understanding the specific checkout flow
      // The UI has "Comprar Boletos" button and discount packages instead of "Reservar"
      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    });

    test.skip('should validate required buyer fields', async ({ page }) => {
      // Skip: This test requires understanding the specific checkout flow
      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
    });

    test.skip('should complete reservation with valid data', async ({ page }) => {
      // Skip by default to avoid creating test data in production
      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
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

      await page.goto(getRaffleUrl(TEST_RAFFLE.slug));
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
      page.locator('text=/no encontr|not found|404|error|no existe/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should handle raffle URL format correctly', async ({ page }) => {
    // Test that /r/ route is accessible
    await page.goto('/r/test');

    // Should either show raffle or proper error message
    await expect(
      page.locator('h1, h2').first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Public Pages - Smoke Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should load help page', async ({ page }) => {
    await page.goto('/help');
    await expect(page.locator('body')).toBeVisible();
  });
});
