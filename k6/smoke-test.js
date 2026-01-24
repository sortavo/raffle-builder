// Smoke Test - Quick sanity check
// Run: k6 run k6/smoke-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG, THRESHOLDS, SCENARIOS } from './config.js';

export const options = {
  scenarios: {
    smoke: SCENARIOS.smoke,
  },
  thresholds: THRESHOLDS.smoke,
};

export default function () {
  // Test 1: Homepage loads
  const homeRes = http.get(CONFIG.BASE_URL);
  check(homeRes, {
    'homepage status 200': (r) => r.status === 200,
    'homepage loads fast': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 2: Public raffle page (if configured)
  if (CONFIG.TEST_RAFFLE_SLUG) {
    const raffleRes = http.get(`${CONFIG.BASE_URL}/r/${CONFIG.TEST_RAFFLE_SLUG}`);
    check(raffleRes, {
      'raffle page status 200': (r) => r.status === 200,
      'raffle page loads fast': (r) => r.timings.duration < 1000,
    });
  }

  sleep(1);

  // Test 3: API health check
  if (CONFIG.API_URL && CONFIG.SUPABASE_ANON_KEY) {
    const apiRes = http.get(`${CONFIG.API_URL}/rest/v1/`, {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
    });
    check(apiRes, {
      'API responds': (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'k6/results/smoke-test-summary.json': JSON.stringify(data, null, 2),
  };
}
