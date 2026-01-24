// Load Test - Normal traffic simulation
// Run: k6 run k6/load-test.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { CONFIG, THRESHOLDS, SCENARIOS, getHeaders } from './config.js';

// Custom metrics
const raffleViews = new Counter('raffle_views');
const ticketSelections = new Counter('ticket_selections');
const pageLoadTime = new Trend('page_load_time');
const apiResponseTime = new Trend('api_response_time');
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    load: SCENARIOS.load,
  },
  thresholds: {
    ...THRESHOLDS.load,
    'page_load_time': ['p(95)<1500'],
    'api_response_time': ['p(95)<500'],
    'errors': ['rate<0.05'],
  },
};

// Simulate browsing user behavior
export default function () {
  const baseUrl = CONFIG.BASE_URL;

  // Scenario weights (what users typically do)
  const scenarios = [
    { weight: 40, fn: browseHomepage },
    { weight: 30, fn: viewRaffle },
    { weight: 20, fn: selectTickets },
    { weight: 10, fn: browseMultipleRaffles },
  ];

  // Pick a scenario based on weight
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

function browseHomepage() {
  group('Browse Homepage', function () {
    const start = Date.now();
    const res = http.get(CONFIG.BASE_URL);

    pageLoadTime.add(Date.now() - start);

    const success = check(res, {
      'homepage loaded': (r) => r.status === 200,
      'has content': (r) => r.body && r.body.length > 0,
    });

    if (!success) errorRate.add(1);

    // Simulate reading the page
    sleep(randomBetween(2, 5));
  });
}

function viewRaffle() {
  group('View Raffle', function () {
    if (!CONFIG.TEST_RAFFLE_SLUG) {
      browseHomepage();
      return;
    }

    // Load raffle page
    const start = Date.now();
    const res = http.get(`${CONFIG.BASE_URL}/r/${CONFIG.TEST_RAFFLE_SLUG}`);

    pageLoadTime.add(Date.now() - start);
    raffleViews.add(1);

    const success = check(res, {
      'raffle page loaded': (r) => r.status === 200,
      'raffle has content': (r) => r.body && r.body.includes('boleto') || r.body.includes('ticket'),
    });

    if (!success) errorRate.add(1);

    // Simulate viewing raffle details
    sleep(randomBetween(3, 8));

    // Maybe fetch ticket counts via API
    if (CONFIG.API_URL && CONFIG.TEST_RAFFLE_ID && Math.random() > 0.5) {
      fetchTicketCounts();
    }
  });
}

function selectTickets() {
  group('Select Tickets', function () {
    if (!CONFIG.TEST_RAFFLE_SLUG) {
      browseHomepage();
      return;
    }

    // Load raffle page first
    const raffleRes = http.get(`${CONFIG.BASE_URL}/r/${CONFIG.TEST_RAFFLE_SLUG}`);
    check(raffleRes, {
      'raffle page for ticket selection': (r) => r.status === 200,
    });

    sleep(randomBetween(1, 3));

    // Simulate ticket selection (API call)
    if (CONFIG.API_URL && CONFIG.TEST_RAFFLE_ID) {
      ticketSelections.add(1);

      // This simulates the user selecting tickets
      // In a real test, you'd call your selectRandomTickets endpoint
      const apiStart = Date.now();

      // Simulate an API request for available tickets
      const ticketRes = http.get(
        `${CONFIG.API_URL}/rest/v1/orders?raffle_id=eq.${CONFIG.TEST_RAFFLE_ID}&status=eq.available&select=id&limit=10`,
        { headers: getHeaders() }
      );

      apiResponseTime.add(Date.now() - apiStart);

      check(ticketRes, {
        'ticket query responded': (r) => r.status === 200 || r.status === 401,
      });
    }

    // Simulate thinking about ticket selection
    sleep(randomBetween(5, 15));
  });
}

function browseMultipleRaffles() {
  group('Browse Multiple Raffles', function () {
    // Visit homepage
    const homeRes = http.get(CONFIG.BASE_URL);
    check(homeRes, {
      'homepage for browsing': (r) => r.status === 200,
    });

    sleep(randomBetween(2, 4));

    // Visit 2-3 different pages
    const pages = ['/explore', '/about', '/pricing'];
    const numPages = Math.floor(Math.random() * 2) + 2;

    for (let i = 0; i < numPages; i++) {
      const page = pages[Math.floor(Math.random() * pages.length)];
      const pageRes = http.get(`${CONFIG.BASE_URL}${page}`);

      // 404 is acceptable for pages that don't exist
      check(pageRes, {
        'page responded': (r) => r.status === 200 || r.status === 404,
      });

      sleep(randomBetween(1, 3));
    }
  });
}

function fetchTicketCounts() {
  const start = Date.now();

  // Call the getTicketCounts edge function
  const res = http.post(
    `${CONFIG.API_URL}/functions/v1/getTicketCounts`,
    JSON.stringify({ raffle_id: CONFIG.TEST_RAFFLE_ID }),
    { headers: getHeaders() }
  );

  apiResponseTime.add(Date.now() - start);

  check(res, {
    'ticket counts responded': (r) => r.status === 200 || r.status === 401,
  });
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function handleSummary(data) {
  return {
    'k6/results/load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  return `
=== LOAD TEST RESULTS ===
Duration: ${data.state.testRunDurationMs}ms
VUs Max: ${data.metrics.vus_max?.values?.max || 'N/A'}

HTTP Requests:
  Total: ${metrics.http_reqs?.values?.count || 0}
  Failed: ${metrics.http_req_failed?.values?.rate ? (metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%
  Duration (p95): ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms

Custom Metrics:
  Raffle Views: ${metrics.raffle_views?.values?.count || 0}
  Ticket Selections: ${metrics.ticket_selections?.values?.count || 0}
  Page Load (p95): ${metrics.page_load_time?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms
  API Response (p95): ${metrics.api_response_time?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms
  Error Rate: ${metrics.errors?.values?.rate ? (metrics.errors.values.rate * 100).toFixed(2) : 0}%
`;
}
