// Stress Test - Find the breaking point
// Run: k6 run k6/stress-test.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { CONFIG, THRESHOLDS, SCENARIOS, getHeaders } from './config.js';

// Custom metrics
const requestsPerSecond = new Counter('requests_per_second');
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const timeouts = new Counter('timeouts');

export const options = {
  scenarios: {
    stress: SCENARIOS.stress,
  },
  thresholds: {
    ...THRESHOLDS.stress,
    'response_time': ['p(99)<5000'],
    'error_rate': ['rate<0.15'],
  },
};

export default function () {
  const scenarios = [
    { weight: 50, fn: highVolumePageLoads },
    { weight: 30, fn: concurrentAPIRequests },
    { weight: 20, fn: heavyTicketOperations },
  ];

  const rand = Math.random() * 100;
  let cumulative = 0;

  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (rand < cumulative) {
      scenario.fn();
      break;
    }
  }
}

function highVolumePageLoads() {
  group('High Volume Page Loads', function () {
    const pages = [
      CONFIG.BASE_URL,
      `${CONFIG.BASE_URL}/explore`,
      `${CONFIG.BASE_URL}/pricing`,
    ];

    if (CONFIG.TEST_RAFFLE_SLUG) {
      pages.push(`${CONFIG.BASE_URL}/r/${CONFIG.TEST_RAFFLE_SLUG}`);
    }

    // Load multiple pages quickly
    for (let i = 0; i < 3; i++) {
      const url = pages[Math.floor(Math.random() * pages.length)];
      const start = Date.now();

      const res = http.get(url, {
        timeout: '10s',
      });

      const duration = Date.now() - start;
      responseTime.add(duration);
      requestsPerSecond.add(1);

      if (res.status === 0) {
        timeouts.add(1);
        errorRate.add(1);
      } else {
        const success = check(res, {
          'page loaded under stress': (r) => r.status === 200 || r.status === 304,
        });
        if (!success) errorRate.add(1);
      }

      // Minimal sleep between requests to stress the system
      sleep(0.1);
    }

    sleep(randomBetween(0.5, 1));
  });
}

function concurrentAPIRequests() {
  group('Concurrent API Requests', function () {
    if (!CONFIG.API_URL || !CONFIG.SUPABASE_ANON_KEY) {
      highVolumePageLoads();
      return;
    }

    // Batch multiple API requests
    const requests = [];

    // Health check
    requests.push(['GET', `${CONFIG.API_URL}/rest/v1/`, null, { headers: getHeaders() }]);

    // If we have a test raffle, add raffle-specific requests
    if (CONFIG.TEST_RAFFLE_ID) {
      // Get raffle details
      requests.push([
        'GET',
        `${CONFIG.API_URL}/rest/v1/raffles?id=eq.${CONFIG.TEST_RAFFLE_ID}&select=*`,
        null,
        { headers: getHeaders() }
      ]);

      // Get ticket counts (simulated)
      requests.push([
        'GET',
        `${CONFIG.API_URL}/rest/v1/orders?raffle_id=eq.${CONFIG.TEST_RAFFLE_ID}&select=status&limit=100`,
        null,
        { headers: getHeaders() }
      ]);
    }

    // Execute requests
    for (const [method, url, body, params] of requests) {
      const start = Date.now();
      let res;

      if (method === 'GET') {
        res = http.get(url, params);
      } else {
        res = http.post(url, body, params);
      }

      responseTime.add(Date.now() - start);
      requestsPerSecond.add(1);

      const success = check(res, {
        'API responded under stress': (r) => r.status !== 0 && r.status < 500,
      });

      if (!success) errorRate.add(1);

      sleep(0.05);
    }

    sleep(randomBetween(0.3, 0.8));
  });
}

function heavyTicketOperations() {
  group('Heavy Ticket Operations', function () {
    if (!CONFIG.API_URL || !CONFIG.TEST_RAFFLE_ID) {
      highVolumePageLoads();
      return;
    }

    // Simulate multiple users trying to get tickets simultaneously
    const start = Date.now();

    // Query available tickets (heavy query)
    const res = http.get(
      `${CONFIG.API_URL}/rest/v1/orders?raffle_id=eq.${CONFIG.TEST_RAFFLE_ID}&status=eq.available&select=id,ticket_number&limit=50`,
      {
        headers: getHeaders(),
        timeout: '15s',
      }
    );

    responseTime.add(Date.now() - start);
    requestsPerSecond.add(1);

    if (res.status === 0) {
      timeouts.add(1);
      errorRate.add(1);
    } else {
      const success = check(res, {
        'ticket query under stress': (r) => r.status === 200 || r.status === 401,
      });
      if (!success) errorRate.add(1);
    }

    // Simulate thinking time (users reviewing available tickets)
    sleep(randomBetween(0.5, 2));

    // Another heavy operation: count by status
    const countStart = Date.now();
    const countRes = http.get(
      `${CONFIG.API_URL}/rest/v1/orders?raffle_id=eq.${CONFIG.TEST_RAFFLE_ID}&select=status`,
      {
        headers: getHeaders(),
        timeout: '15s',
      }
    );

    responseTime.add(Date.now() - countStart);
    requestsPerSecond.add(1);

    check(countRes, {
      'count query responded': (r) => r.status !== 0,
    });

    sleep(randomBetween(0.3, 1));
  });
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function handleSummary(data) {
  const report = generateStressReport(data);

  return {
    'k6/results/stress-test-summary.json': JSON.stringify(data, null, 2),
    'k6/results/stress-test-report.txt': report,
    stdout: report,
  };
}

function generateStressReport(data) {
  const metrics = data.metrics;
  const p95 = metrics.response_time?.values?.['p(95)'] || 0;
  const p99 = metrics.response_time?.values?.['p(99)'] || 0;
  const maxVUs = metrics.vus_max?.values?.max || 0;
  const errRate = metrics.error_rate?.values?.rate || 0;
  const totalReqs = metrics.http_reqs?.values?.count || 0;

  // Estimate breaking point
  let breakingPointAssessment = '';
  if (errRate > 0.15) {
    breakingPointAssessment = `BREAKING POINT REACHED at ~${maxVUs} VUs (error rate: ${(errRate * 100).toFixed(1)}%)`;
  } else if (p99 > 5000) {
    breakingPointAssessment = `DEGRADED PERFORMANCE at ${maxVUs} VUs (p99: ${p99.toFixed(0)}ms)`;
  } else {
    breakingPointAssessment = `STABLE at ${maxVUs} VUs - system can handle more load`;
  }

  return `
╔══════════════════════════════════════════════════════════════╗
║                    STRESS TEST REPORT                        ║
╠══════════════════════════════════════════════════════════════╣
║ Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes
║ Max Virtual Users: ${maxVUs}
║ Total Requests: ${totalReqs.toLocaleString()}
╠══════════════════════════════════════════════════════════════╣
║ RESPONSE TIMES                                               ║
║   Median (p50): ${(metrics.response_time?.values?.['p(50)'] || 0).toFixed(0)}ms
║   p95: ${p95.toFixed(0)}ms
║   p99: ${p99.toFixed(0)}ms
║   Max: ${(metrics.response_time?.values?.max || 0).toFixed(0)}ms
╠══════════════════════════════════════════════════════════════╣
║ ERROR METRICS                                                ║
║   Error Rate: ${(errRate * 100).toFixed(2)}%
║   Timeouts: ${metrics.timeouts?.values?.count || 0}
║   Failed Requests: ${metrics.http_req_failed?.values?.count || 0}
╠══════════════════════════════════════════════════════════════╣
║ ASSESSMENT                                                   ║
║   ${breakingPointAssessment}
╚══════════════════════════════════════════════════════════════╝
`;
}
