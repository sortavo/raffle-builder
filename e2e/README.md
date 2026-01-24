# E2E Tests

This directory contains end-to-end tests for the Sortavo application using [Playwright](https://playwright.dev/).

## Prerequisites

Before running the tests, you need to:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

3. **Set up environment variables** (optional):
   Create a `.env.test` file in the project root with:
   ```env
   TEST_ORGANIZER_EMAIL=your-test-organizer@example.com
   TEST_ORGANIZER_PASSWORD=your-test-password
   TEST_RAFFLE_SLUG=your-test-raffle-slug
   ```

   If not set, the tests will use default demo credentials.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests with Playwright UI
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/navigation.spec.ts
npx playwright test e2e/raffle-creation.spec.ts
npx playwright test e2e/ticket-purchase.spec.ts
```

### Run tests for specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Run a single test by name
```bash
npx playwright test -g "should load homepage"
```

## Test Files

| File | Description |
|------|-------------|
| `auth.spec.ts` | Login and logout flow tests |
| `navigation.spec.ts` | Basic navigation and routing tests |
| `raffle-creation.spec.ts` | Raffle creation wizard flow tests |
| `ticket-purchase.spec.ts` | Public raffle view and ticket selection tests |
| `buyer-flow.spec.ts` | Complete buyer journey tests |
| `organizer-flow.spec.ts` | Organizer dashboard and management tests |
| `stress-test/approval-stress.spec.ts` | Performance stress tests for approvals |

## Test Fixtures

Shared test utilities and fixtures are located in `fixtures/test-fixtures.ts`:

- `TEST_USERS` - Test user credentials
- `TEST_RAFFLE` - Test raffle configuration
- `test` - Extended Playwright test with custom fixtures
- `loginAsOrganizer()` - Helper to login as organizer
- `selectRandomTickets()` - Helper to select tickets
- `fillBuyerForm()` - Helper to fill buyer information
- `waitForToast()` - Helper to wait for toast notifications
- `uploadPaymentProof()` - Helper to upload payment proof

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:8080`
- **Test directory**: `./e2e`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Web server**: Automatically starts `npm run dev` before tests

## Viewing Test Results

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Debugging Tests

### Debug mode with inspector
```bash
npx playwright test --debug
```

### Trace viewer for failed tests
Traces are captured on first retry. View them with:
```bash
npx playwright show-trace trace.zip
```

### Slow motion mode
```bash
npx playwright test --headed --slow-mo=500
```

## CI/CD Integration

In CI environments:
- Tests run with 1 worker (sequential)
- Retries are set to 2
- Screenshots are captured on failure
- Traces are captured on first retry

Environment variables for CI:
```bash
CI=true
TEST_ORGANIZER_EMAIL=ci-test@example.com
TEST_ORGANIZER_PASSWORD=ci-test-password
TEST_RAFFLE_SLUG=ci-test-raffle
```

## Writing New Tests

1. Create a new `.spec.ts` file in this directory
2. Import fixtures: `import { test, expect, TEST_USERS } from './fixtures/test-fixtures';`
3. Use `test.describe()` to group related tests
4. Use `test.skip()` to conditionally skip tests based on environment

Example:
```typescript
import { test, expect, TEST_USERS } from './fixtures/test-fixtures';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

## Best Practices

1. **Use test.skip()** for tests that depend on external state (e.g., valid credentials)
2. **Avoid hardcoded waits** - use `waitForLoadState()` or `waitForSelector()`
3. **Use flexible selectors** - combine multiple selector strategies with `.or()`
4. **Don't create production data** - skip tests that would create real reservations
5. **Test mobile viewports** - use `page.setViewportSize()` for responsive tests

## Troubleshooting

### Tests fail with "Could not login"
- Verify `TEST_ORGANIZER_EMAIL` and `TEST_ORGANIZER_PASSWORD` are correct
- Check if the account exists in your test environment

### Tests fail with "Raffle not found"
- Verify `TEST_RAFFLE_SLUG` points to an existing raffle
- Ensure the raffle is public and active

### Browser installation issues
```bash
npx playwright install --with-deps
```

### Port already in use
The dev server runs on port 8080. Kill any existing processes:
```bash
lsof -i :8080 | awk 'NR>1 {print $2}' | xargs kill
```
