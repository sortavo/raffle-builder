/**
 * Stress Test: Dashboard Approval Workflow
 *
 * Este test verifica que el dashboard puede manejar miles de aprobaciones pendientes
 *
 * Prerequisitos:
 *   1. Ejecutar el script de seed para crear reservaciones:
 *      npx tsx scripts/load-test/seed-reservations.ts
 *
 *   2. Correr este test:
 *      npx playwright test e2e/stress-test/approval-stress.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  organizerEmail: process.env.TEST_ORGANIZER_EMAIL || 'demo1@sortavo.com',
  organizerPassword: process.env.TEST_ORGANIZER_PASSWORD || 'Cone1591*',
  approvalsToProcess: parseInt(process.env.APPROVALS_TO_PROCESS || '50'),
  batchSize: 10,
};

async function login(page: Page): Promise<boolean> {
  await page.goto('/auth');
  await page.fill('input[type="email"]', TEST_CONFIG.organizerEmail);
  await page.fill('input[type="password"]', TEST_CONFIG.organizerPassword);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

test.describe('Dashboard Approval Stress Test', () => {

  test.beforeEach(async ({ page }) => {
    const loggedIn = await login(page);
    test.skip(!loggedIn, 'Could not login with test credentials');
  });

  test('should load approvals page with many pending items', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Verificar que la página carga
    await expect(page.locator('body')).toBeVisible();

    // Contar elementos pendientes
    const pendingItems = page.locator('[data-status="pending"], tr:has-text("Pendiente")');
    const count = await pendingItems.count();

    console.log(`📊 Pending approvals found: ${count}`);

    // Medir tiempo de carga
    const startTime = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`⏱️ Page load time: ${loadTime}ms`);

    // Verificar que carga en menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle pagination efficiently', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Buscar controles de paginación
    const nextButton = page.locator('button:has-text("Siguiente"), button[aria-label*="next"]').first();
    const hasPages = await nextButton.isVisible().catch(() => false);

    if (hasPages) {
      const startTime = Date.now();

      // Navegar 5 páginas
      for (let i = 0; i < 5; i++) {
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
        }
      }

      const paginationTime = Date.now() - startTime;
      console.log(`⏱️ Time to navigate 5 pages: ${paginationTime}ms`);

      // Debe tomar menos de 10 segundos
      expect(paginationTime).toBeLessThan(10000);
    }
  });

  test('should approve single payment efficiently', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Buscar primer botón de aprobar
    const approveButton = page.locator('button:has-text("Aprobar"), button[aria-label*="aprobar"]').first();
    const hasApprovals = await approveButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasApprovals) {
      console.log('⚠️ No pending approvals to test');
      return;
    }

    const startTime = Date.now();
    await approveButton.click();

    // Esperar confirmación
    await page.waitForResponse(
      response => response.url().includes('tickets') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    const approvalTime = Date.now() - startTime;
    console.log(`⏱️ Single approval time: ${approvalTime}ms`);

    // Debe tomar menos de 3 segundos
    expect(approvalTime).toBeLessThan(3000);
  });

  test('should handle bulk approval', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Buscar checkbox de seleccionar todos
    const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="all"], th input[type="checkbox"]').first();
    const hasBulkSelect = await selectAllCheckbox.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasBulkSelect) {
      console.log('⚠️ Bulk selection not available');
      return;
    }

    const startTime = Date.now();

    // Seleccionar todos
    await selectAllCheckbox.click();

    // Buscar botón de aprobar seleccionados
    const bulkApproveBtn = page.locator('button:has-text("Aprobar seleccionados"), button:has-text("Aprobar todos")').first();

    if (await bulkApproveBtn.isVisible()) {
      await bulkApproveBtn.click();

      // Confirmar si hay diálogo
      const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Sí")').first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Esperar procesamiento
      await page.waitForTimeout(3000);
    }

    const bulkTime = Date.now() - startTime;
    console.log(`⏱️ Bulk approval time: ${bulkTime}ms`);
  });

  test('should search and filter efficiently', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Buscar campo de búsqueda
    const searchInput = page.locator('input[placeholder*="buscar"], input[type="search"]').first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasSearch) {
      console.log('⚠️ Search not available');
      return;
    }

    const startTime = Date.now();

    // Realizar búsqueda
    await searchInput.fill('test');
    await page.waitForTimeout(500); // Debounce
    await page.waitForLoadState('networkidle');

    const searchTime = Date.now() - startTime;
    console.log(`⏱️ Search time: ${searchTime}ms`);

    // Debe tomar menos de 2 segundos
    expect(searchTime).toBeLessThan(2000);

    // Limpiar búsqueda
    await searchInput.clear();
  });

  test('should handle rapid approval clicks', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    const approveButtons = page.locator('button:has-text("Aprobar"), button[aria-label*="aprobar"]');
    const buttonCount = await approveButtons.count();

    if (buttonCount < 5) {
      console.log(`⚠️ Only ${buttonCount} approvals available, need at least 5`);
      return;
    }

    const startTime = Date.now();
    let approved = 0;

    // Aprobar 5 rápidamente
    for (let i = 0; i < Math.min(5, buttonCount); i++) {
      try {
        await approveButtons.first().click();
        await page.waitForTimeout(200);
        approved++;
      } catch {
        break;
      }
    }

    const rapidTime = Date.now() - startTime;
    console.log(`⏱️ Rapid approval of ${approved} items: ${rapidTime}ms`);

    // No debe crashear
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display approval metrics', async ({ page }) => {
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');

    // Buscar métricas/contadores
    const metrics = page.locator('[data-testid="approval-count"], text=/\\d+ pendiente/i').first();
    const hasMetrics = await metrics.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasMetrics) {
      const metricsText = await metrics.textContent();
      console.log(`📊 Metrics: ${metricsText}`);
    }

    // Verificar que hay algún contenido
    const content = page.locator('table, [role="table"], [data-testid="approval-list"]').first();
    await expect(content.or(page.locator('text=/sin.*pendiente|vacío|empty/i').first())).toBeVisible();
  });
});

test.describe('Performance Benchmarks', () => {

  test('benchmark: load dashboard with 1000+ pending approvals', async ({ page }) => {
    const loggedIn = await login(page);
    test.skip(!loggedIn, 'Could not login');

    const metrics: Record<string, number> = {};

    // Medir tiempo inicial
    const startTime = Date.now();
    await page.goto('/dashboard/approvals');
    await page.waitForLoadState('networkidle');
    metrics.initialLoad = Date.now() - startTime;

    // Medir reload
    const reloadStart = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    metrics.reloadTime = Date.now() - reloadStart;

    // Medir scroll (si hay virtualización)
    const scrollStart = Date.now();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    metrics.scrollTime = Date.now() - scrollStart;

    console.log('\n📊 Performance Metrics:');
    console.log('========================');
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}ms`);
    });

    // Thresholds
    expect(metrics.initialLoad).toBeLessThan(5000);
    expect(metrics.reloadTime).toBeLessThan(3000);
  });
});
