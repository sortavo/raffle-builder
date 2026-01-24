# Performance Testing with k6

This directory contains k6 performance tests for Sortavo.

## Installation

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Configuration

Create a `.env.k6` file (or export environment variables):

```bash
export BASE_URL="https://your-app.vercel.app"
export API_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export TEST_USER_EMAIL="loadtest@example.com"
export TEST_USER_PASSWORD="testpassword"
export TEST_RAFFLE_ID="uuid-of-test-raffle"
export TEST_RAFFLE_SLUG="test-raffle-slug"
```

## Running Tests

### Quick Start

```bash
# Source your environment variables
source .env.k6

# Run smoke test (quick sanity check)
k6 run k6/smoke-test.js

# Run load test (normal traffic simulation)
k6 run k6/load-test.js

# Run stress test (find breaking point)
k6 run k6/stress-test.js

# Run spike test (sudden traffic surge)
k6 run k6/spike-test.js

# Run ticket purchase flow test
k6 run k6/ticket-purchase-flow.js
```

### With Docker

```bash
docker run -i grafana/k6 run - <k6/smoke-test.js
```

### With Environment Variables

```bash
k6 run \
  -e BASE_URL=https://sortavo.com \
  -e API_URL=https://xxx.supabase.co \
  -e SUPABASE_ANON_KEY=xxx \
  -e TEST_RAFFLE_ID=xxx \
  -e TEST_RAFFLE_SLUG=xxx \
  k6/load-test.js
```

## Test Types

| Test | Purpose | Duration | Max VUs |
|------|---------|----------|---------|
| `smoke-test.js` | Sanity check | 30s | 1 |
| `load-test.js` | Normal traffic | ~9m | 50 |
| `stress-test.js` | Find breaking point | ~19m | 300 |
| `spike-test.js` | Sudden traffic surge | ~7m | 500 |
| `ticket-purchase-flow.js` | Business flow | ~10m | 200 |

## Understanding Results

### Key Metrics

- **http_req_duration**: Response time (look at p95)
- **http_req_failed**: Percentage of failed requests
- **vus**: Virtual users (concurrent users)
- **iterations**: Number of completed test iterations

### Thresholds

Each test has defined thresholds. If any threshold is exceeded, the test fails:

```
✓ http_req_duration............: avg=234ms p(95)=456ms
✗ http_req_failed..............: 12.34% ✓ 123 ✗ 877
```

### Custom Metrics

- **funnel_***: Track user journey through purchase flow
- **reservation_time**: Time to reserve tickets
- **conversion_rate**: Percentage of users completing purchase

## Recommended Testing Strategy

### Before Launch

1. **Smoke Test** - Verify basic functionality
   ```bash
   k6 run k6/smoke-test.js
   ```

2. **Load Test** - Verify normal operation
   ```bash
   k6 run k6/load-test.js
   ```

3. **Ticket Purchase Flow** - Verify critical business path
   ```bash
   k6 run k6/ticket-purchase-flow.js
   ```

### Finding Limits

4. **Stress Test** - Find the breaking point
   ```bash
   k6 run k6/stress-test.js
   ```

5. **Spike Test** - Test sudden traffic (like winner announcement)
   ```bash
   k6 run k6/spike-test.js
   ```

## Interpreting Results

### Good Results

```
✓ http_req_duration: p(95) < 500ms
✓ http_req_failed: < 1%
✓ conversion_rate: > 80%
```

### Warning Signs

- p(95) > 2000ms - Consider caching/CDN
- Error rate > 5% - Check server capacity
- Conversion rate < 50% - Check for bottlenecks

### Actions to Take

| Issue | Solution |
|-------|----------|
| Slow page loads | Enable CDN, optimize images |
| Slow API responses | Add database indexes, caching |
| High error rate during spikes | Add rate limiting, auto-scaling |
| Low conversion rate | Check for race conditions in reservations |

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: grafana/k6-action@v0.3.0
      with:
        filename: k6/smoke-test.js
      env:
        BASE_URL: ${{ secrets.BASE_URL }}
        API_URL: ${{ secrets.API_URL }}
        SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Results Storage

Results are saved to `k6/results/`:

- `*-summary.json` - Full metrics data
- `*-report.txt` - Human-readable report

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Metrics Reference](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
