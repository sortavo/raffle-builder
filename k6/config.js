// k6 Performance Testing Configuration for Sortavo
// Documentation: https://k6.io/docs/

export const CONFIG = {
  // Base URLs - Update these for your environment
  BASE_URL: __ENV.BASE_URL || 'https://sortavo.com',
  API_URL: __ENV.API_URL || 'https://your-project.supabase.co',

  // Supabase credentials for authenticated tests
  SUPABASE_ANON_KEY: __ENV.SUPABASE_ANON_KEY || '',

  // Test user credentials (create a test user for load testing)
  TEST_USER_EMAIL: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
  TEST_USER_PASSWORD: __ENV.TEST_USER_PASSWORD || '',

  // Sample raffle ID for testing (use a test raffle)
  TEST_RAFFLE_ID: __ENV.TEST_RAFFLE_ID || '',
  TEST_RAFFLE_SLUG: __ENV.TEST_RAFFLE_SLUG || '',
};

// Thresholds for different test types
export const THRESHOLDS = {
  // Smoke test - should be very fast
  smoke: {
    http_req_duration: ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],      // Less than 1% failure rate
  },

  // Load test - normal operation
  load: {
    http_req_duration: ['p(95)<1000'],   // 95% under 1s
    http_req_failed: ['rate<0.05'],      // Less than 5% failure
  },

  // Stress test - under pressure
  stress: {
    http_req_duration: ['p(95)<2000'],   // 95% under 2s
    http_req_failed: ['rate<0.10'],      // Less than 10% failure
  },

  // Spike test - sudden traffic
  spike: {
    http_req_duration: ['p(95)<3000'],   // 95% under 3s
    http_req_failed: ['rate<0.15'],      // Less than 15% failure
  },
};

// Standard scenarios
export const SCENARIOS = {
  // Smoke test: Quick validation
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  // Load test: Ramp up to normal load
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Ramp up to 50 users
      { duration: '5m', target: 50 },   // Stay at 50 users
      { duration: '2m', target: 0 },    // Ramp down
    ],
  },

  // Stress test: Push beyond normal
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },   // Normal load
      { duration: '5m', target: 100 },  // Push to 100
      { duration: '5m', target: 200 },  // Push to 200
      { duration: '5m', target: 300 },  // Push to 300
      { duration: '2m', target: 0 },    // Ramp down
    ],
  },

  // Spike test: Sudden traffic surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 10 },   // Baseline
      { duration: '10s', target: 500 }, // Spike!
      { duration: '1m', target: 500 },  // Stay at spike
      { duration: '10s', target: 10 },  // Back to baseline
      { duration: '2m', target: 10 },   // Recovery
      { duration: '1m', target: 0 },    // Ramp down
    ],
  },

  // Soak test: Long duration for memory leaks
  soak: {
    executor: 'constant-vus',
    vus: 50,
    duration: '30m',
  },
};

// Helper to build headers
export function getHeaders(authToken = null) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': CONFIG.SUPABASE_ANON_KEY,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}
