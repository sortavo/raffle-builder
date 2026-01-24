// Spike Test - Sudden traffic surge simulation
// Run: k6 run k6/spike-test.js
//
// This simulates scenarios like:
// - Winner announcement going viral
// - Marketing campaign launch
// - Social media mention

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { CONFIG, THRESHOLDS, SCENARIOS, getHeaders } from './config.js';

// Custom metrics for spike analysis
const requestsDuringSpike = new Counter('requests_during_spike');
const requestsDuringRecovery = new Counter('requests_during_recovery');
const spikeResponseTime = new Trend('spike_response_time');
const recoveryResponseTime = new Trend('recovery_response_time');
const errorsDuringSpike = new Rate('errors_during_spike');

// Track current phase
let currentPhase = 'baseline';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // Warm up
        { duration: '1m', target: 10 },    // Baseline
        { duration: '10s', target: 500 },  // SPIKE!
        { duration: '2m', target: 500 },   // Sustain spike
        { duration: '10s', target: 10 },   // Drop
        { duration: '2m', target: 10 },    // Recovery
        { duration: '30s', target: 0 },    // Cool down
      ],
    },
  },
  thresholds: {
    ...THRESHOLDS.spike,
    'spike_response_time': ['p(95)<5000'],
    'errors_during_spike': ['rate<0.20'],
  },
};

export function setup() {
  // Verify the system is accessible before starting
  const res = http.get(CONFIG.BASE_URL);
  if (res.status !== 200) {
    console.warn(`Warning: Base URL returned status ${res.status}`);
  }
  return { startTime: Date.now() };
}

export default function (data) {
  // Determine current phase based on VU count
  const vus = __VU;
  if (vus > 100) {
    currentPhase = 'spike';
  } else if (vus > 10 && currentPhase === 'spike') {
    currentPhase = 'recovery';
  }

  // Simulate realistic user behavior during a spike
  // (everyone rushing to see the raffle/winner)
  if (currentPhase === 'spike') {
    spikeScenario();
  } else {
    normalScenario();
  }
}

function spikeScenario() {
  group('Spike Traffic', function () {
    requestsDuringSpike.add(1);

    // Everyone is trying to load the raffle page
    const start = Date.now();
    let url = CONFIG.BASE_URL;

    if (CONFIG.TEST_RAFFLE_SLUG) {
      url = `${CONFIG.BASE_URL}/r/${CONFIG.TEST_RAFFLE_SLUG}`;
    }

    const res = http.get(url, {
      timeout: '30s', // Higher timeout during spike
    });

    const duration = Date.now() - start;
    spikeResponseTime.add(duration);

    const success = check(res, {
      'page loaded during spike': (r) => r.status === 200 || r.status === 304,
      'response under 5s during spike': (r) => r.timings.duration < 5000,
    });

    if (!success) {
      errorsDuringSpike.add(1);
    }

    // During spike, users rapidly refresh or navigate
    sleep(randomBetween(0.2, 1));

    // Some users will try to access API
    if (Math.random() > 0.7 && CONFIG.API_URL) {
      rapidAPICheck();
    }
  });
}

function normalScenario() {
  group('Normal Traffic', function () {
    if (currentPhase === 'recovery') {
      requestsDuringRecovery.add(1);
    }

    const start = Date.now();
    const res = http.get(CONFIG.BASE_URL);

    if (currentPhase === 'recovery') {
      recoveryResponseTime.add(Date.now() - start);
    }

    check(res, {
      'page loaded normally': (r) => r.status === 200,
    });

    // Normal browsing pace
    sleep(randomBetween(2, 5));
  });
}

function rapidAPICheck() {
  if (!CONFIG.TEST_RAFFLE_ID) return;

  const start = Date.now();

  // Simulating users checking ticket status/winner
  const res = http.get(
    `${CONFIG.API_URL}/rest/v1/raffles?id=eq.${CONFIG.TEST_RAFFLE_ID}&select=status,winner_ticket_number`,
    {
      headers: getHeaders(),
      timeout: '15s',
    }
  );

  spikeResponseTime.add(Date.now() - start);

  const success = check(res, {
    'API responded during spike': (r) => r.status === 200 || r.status === 401,
  });

  if (!success) {
    errorsDuringSpike.add(1);
  }
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function handleSummary(data) {
  const report = generateSpikeReport(data);

  return {
    'k6/results/spike-test-summary.json': JSON.stringify(data, null, 2),
    'k6/results/spike-test-report.txt': report,
    stdout: report,
  };
}

function generateSpikeReport(data) {
  const metrics = data.metrics;

  const spikeP95 = metrics.spike_response_time?.values?.['p(95)'] || 0;
  const recoveryP95 = metrics.recovery_response_time?.values?.['p(95)'] || 0;
  const spikeErrors = metrics.errors_during_spike?.values?.rate || 0;
  const spikeRequests = metrics.requests_during_spike?.values?.count || 0;
  const recoveryRequests = metrics.requests_during_recovery?.values?.count || 0;

  // Analyze recovery
  let recoveryAssessment = '';
  if (recoveryP95 > 0 && spikeP95 > 0) {
    const improvement = ((spikeP95 - recoveryP95) / spikeP95) * 100;
    if (improvement > 50) {
      recoveryAssessment = `EXCELLENT - Response times improved by ${improvement.toFixed(0)}% after spike`;
    } else if (improvement > 20) {
      recoveryAssessment = `GOOD - Response times improved by ${improvement.toFixed(0)}% after spike`;
    } else if (improvement > 0) {
      recoveryAssessment = `SLOW RECOVERY - Only ${improvement.toFixed(0)}% improvement after spike`;
    } else {
      recoveryAssessment = `NO RECOVERY - System still degraded after spike`;
    }
  } else {
    recoveryAssessment = 'Unable to assess recovery (insufficient data)';
  }

  // Overall assessment
  let overallAssessment = '';
  if (spikeErrors < 0.05 && spikeP95 < 2000) {
    overallAssessment = 'EXCELLENT - System handles spikes gracefully';
  } else if (spikeErrors < 0.10 && spikeP95 < 3000) {
    overallAssessment = 'GOOD - System degrades but remains functional';
  } else if (spikeErrors < 0.20 && spikeP95 < 5000) {
    overallAssessment = 'ACCEPTABLE - Noticeable degradation during spikes';
  } else {
    overallAssessment = 'NEEDS IMPROVEMENT - Consider adding caching/CDN/auto-scaling';
  }

  return `
╔══════════════════════════════════════════════════════════════╗
║                     SPIKE TEST REPORT                        ║
║         Simulating sudden traffic surge (500 VUs)            ║
╠══════════════════════════════════════════════════════════════╣
║ DURING SPIKE (500 concurrent users)                          ║
║   Requests: ${spikeRequests.toLocaleString()}
║   Response Time (p95): ${spikeP95.toFixed(0)}ms
║   Error Rate: ${(spikeErrors * 100).toFixed(2)}%
╠══════════════════════════════════════════════════════════════╣
║ RECOVERY PHASE                                               ║
║   Requests: ${recoveryRequests.toLocaleString()}
║   Response Time (p95): ${recoveryP95.toFixed(0)}ms
║   Assessment: ${recoveryAssessment}
╠══════════════════════════════════════════════════════════════╣
║ OVERALL ASSESSMENT                                           ║
║   ${overallAssessment}
╠══════════════════════════════════════════════════════════════╣
║ RECOMMENDATIONS                                              ║
${spikeErrors > 0.10 ? '║   ⚠️  Add request queuing or rate limiting\n' : ''}${spikeP95 > 3000 ? '║   ⚠️  Enable CDN caching for static assets\n' : ''}${spikeP95 > 5000 ? '║   ⚠️  Consider auto-scaling infrastructure\n' : ''}${spikeErrors < 0.05 && spikeP95 < 2000 ? '║   ✅ System is well-prepared for traffic spikes\n' : ''}╚══════════════════════════════════════════════════════════════╝
`;
}
