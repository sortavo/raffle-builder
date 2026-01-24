// Ticket Purchase Flow Test
// Run: k6 run k6/ticket-purchase-flow.js
//
// Tests the critical path: view raffle -> select tickets -> reserve -> purchase
// This is the most important flow for business success

import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { CONFIG, getHeaders } from './config.js';

// Business metrics
const funnelStarts = new Counter('funnel_starts');
const funnelViewRaffle = new Counter('funnel_view_raffle');
const funnelSelectTickets = new Counter('funnel_select_tickets');
const funnelReserve = new Counter('funnel_reserve');
const funnelComplete = new Counter('funnel_complete');

const reservationTime = new Trend('reservation_time');
const conversionRate = new Rate('conversion_rate');
const reservationFailures = new Rate('reservation_failures');

export const options = {
  scenarios: {
    // Simulate realistic ticket buying traffic
    ticket_buyers: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 5 },   // 5 new buyers per second
        { duration: '3m', target: 10 },  // Ramp to 10/s
        { duration: '3m', target: 10 },  // Sustain
        { duration: '1m', target: 20 },  // Peak (like a promotion)
        { duration: '2m', target: 5 },   // Cool down
      ],
    },
  },
  thresholds: {
    'reservation_time': ['p(95)<3000'], // Reservations should be fast
    'conversion_rate': ['rate>0.50'],    // At least 50% should complete
    'reservation_failures': ['rate<0.10'], // Less than 10% failures
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  funnelStarts.add(1);

  // Step 1: View the raffle page
  const viewSuccess = viewRafflePage();
  if (!viewSuccess) {
    conversionRate.add(0);
    return;
  }
  funnelViewRaffle.add(1);

  // User thinks about it (realistic delay)
  sleep(randomBetween(2, 5));

  // Step 2: Select tickets
  const tickets = selectTickets();
  if (!tickets || tickets.length === 0) {
    conversionRate.add(0);
    return;
  }
  funnelSelectTickets.add(1);

  // User reviews selection
  sleep(randomBetween(1, 3));

  // Step 3: Reserve tickets
  const reservation = reserveTickets(tickets);
  if (!reservation) {
    conversionRate.add(0);
    reservationFailures.add(1);
    return;
  }
  funnelReserve.add(1);

  // User fills in their info
  sleep(randomBetween(5, 15));

  // Step 4: Complete purchase (simulated)
  const completed = completePurchase(reservation);
  if (completed) {
    funnelComplete.add(1);
    conversionRate.add(1);
  } else {
    conversionRate.add(0);
  }
}

function viewRafflePage() {
  return group('View Raffle', function () {
    if (!CONFIG.TEST_RAFFLE_SLUG) {
      // If no raffle configured, use homepage
      const res = http.get(CONFIG.BASE_URL);
      return res.status === 200;
    }

    const res = http.get(`${CONFIG.BASE_URL}/r/${CONFIG.TEST_RAFFLE_SLUG}`, {
      timeout: '10s',
    });

    const success = check(res, {
      'raffle page loaded': (r) => r.status === 200,
      'raffle is active': (r) => !r.body.includes('sorteo terminado') && !r.body.includes('raffle ended'),
    });

    return success;
  });
}

function selectTickets() {
  return group('Select Tickets', function () {
    if (!CONFIG.API_URL || !CONFIG.TEST_RAFFLE_ID) {
      // Simulate ticket selection without API
      return [Math.floor(Math.random() * 1000) + 1];
    }

    // Query available tickets
    const res = http.get(
      `${CONFIG.API_URL}/rest/v1/orders?raffle_id=eq.${CONFIG.TEST_RAFFLE_ID}&status=eq.available&select=id,ticket_number&limit=10`,
      {
        headers: getHeaders(),
        timeout: '10s',
      }
    );

    if (res.status !== 200) {
      console.log(`Failed to get available tickets: ${res.status}`);
      return null;
    }

    try {
      const available = JSON.parse(res.body);
      if (!available || available.length === 0) {
        console.log('No tickets available');
        return null;
      }

      // Select 1-5 tickets randomly
      const numTickets = Math.min(Math.floor(Math.random() * 5) + 1, available.length);
      const selected = [];

      for (let i = 0; i < numTickets; i++) {
        const idx = Math.floor(Math.random() * available.length);
        selected.push(available[idx].id);
        available.splice(idx, 1);
      }

      return selected;
    } catch (e) {
      console.log(`Error parsing tickets: ${e.message}`);
      return null;
    }
  });
}

function reserveTickets(ticketIds) {
  return group('Reserve Tickets', function () {
    if (!CONFIG.API_URL || !CONFIG.TEST_RAFFLE_ID) {
      // Simulate reservation
      return { id: `sim-${Date.now()}`, tickets: ticketIds };
    }

    const start = Date.now();

    // Call the reserve tickets edge function
    const res = http.post(
      `${CONFIG.API_URL}/functions/v1/reserveTickets`,
      JSON.stringify({
        raffle_id: CONFIG.TEST_RAFFLE_ID,
        ticket_ids: ticketIds,
        buyer_info: {
          name: `Load Test User ${__VU}`,
          email: `loadtest${__VU}@example.com`,
          phone: '+521234567890',
        },
      }),
      {
        headers: getHeaders(),
        timeout: '15s',
      }
    );

    reservationTime.add(Date.now() - start);

    if (res.status === 200 || res.status === 201) {
      try {
        return JSON.parse(res.body);
      } catch {
        return { id: 'unknown', tickets: ticketIds };
      }
    }

    // Check if tickets were already taken (race condition)
    if (res.status === 409 || res.status === 400) {
      console.log('Tickets already reserved by another user (race condition)');
      return null;
    }

    console.log(`Reservation failed: ${res.status}`);
    return null;
  });
}

function completePurchase(reservation) {
  return group('Complete Purchase', function () {
    if (!CONFIG.API_URL || !reservation.id || reservation.id.startsWith('sim-')) {
      // Simulate completion
      return Math.random() > 0.1; // 90% success rate
    }

    // Call the confirm order edge function
    const res = http.post(
      `${CONFIG.API_URL}/functions/v1/confirmOrder`,
      JSON.stringify({
        reservation_id: reservation.id,
        payment_method: 'test',
        payment_reference: `test-${Date.now()}`,
      }),
      {
        headers: getHeaders(),
        timeout: '15s',
      }
    );

    const success = check(res, {
      'purchase completed': (r) => r.status === 200 || r.status === 201,
    });

    return success;
  });
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function handleSummary(data) {
  const report = generateFunnelReport(data);

  return {
    'k6/results/ticket-purchase-summary.json': JSON.stringify(data, null, 2),
    'k6/results/ticket-purchase-report.txt': report,
    stdout: report,
  };
}

function generateFunnelReport(data) {
  const m = data.metrics;

  const starts = m.funnel_starts?.values?.count || 0;
  const viewed = m.funnel_view_raffle?.values?.count || 0;
  const selected = m.funnel_select_tickets?.values?.count || 0;
  const reserved = m.funnel_reserve?.values?.count || 0;
  const completed = m.funnel_complete?.values?.count || 0;

  const viewRate = starts > 0 ? (viewed / starts * 100).toFixed(1) : 0;
  const selectRate = viewed > 0 ? (selected / viewed * 100).toFixed(1) : 0;
  const reserveRate = selected > 0 ? (reserved / selected * 100).toFixed(1) : 0;
  const completeRate = reserved > 0 ? (completed / reserved * 100).toFixed(1) : 0;
  const overallRate = starts > 0 ? (completed / starts * 100).toFixed(1) : 0;

  const resTime = m.reservation_time?.values?.['p(95)'] || 0;
  const resFailRate = m.reservation_failures?.values?.rate || 0;

  return `
╔══════════════════════════════════════════════════════════════╗
║              TICKET PURCHASE FUNNEL REPORT                   ║
╠══════════════════════════════════════════════════════════════╣
║ FUNNEL ANALYSIS                                              ║
║                                                              ║
║   Started Journey    : ${starts.toLocaleString().padStart(6)} (100%)
║   ↓ Viewed Raffle    : ${viewed.toLocaleString().padStart(6)} (${viewRate}%)
║   ↓ Selected Tickets : ${selected.toLocaleString().padStart(6)} (${selectRate}%)
║   ↓ Reserved         : ${reserved.toLocaleString().padStart(6)} (${reserveRate}%)
║   ↓ Completed        : ${completed.toLocaleString().padStart(6)} (${completeRate}%)
║                                                              ║
║   Overall Conversion : ${overallRate}%
╠══════════════════════════════════════════════════════════════╣
║ PERFORMANCE METRICS                                          ║
║   Reservation Time (p95): ${resTime.toFixed(0)}ms
║   Reservation Failures: ${(resFailRate * 100).toFixed(1)}%
╠══════════════════════════════════════════════════════════════╣
║ BOTTLENECK ANALYSIS                                          ║
${parseFloat(viewRate) < 90 ? `║   ⚠️  Page load issues - ${100 - parseFloat(viewRate)}% drop at raffle view\n` : ''}${parseFloat(selectRate) < 80 ? `║   ⚠️  Ticket availability issues - ${100 - parseFloat(selectRate)}% drop at selection\n` : ''}${parseFloat(reserveRate) < 70 ? `║   ⚠️  Race conditions - ${100 - parseFloat(reserveRate)}% drop at reservation\n` : ''}${resTime > 2000 ? `║   ⚠️  Slow reservations (${resTime.toFixed(0)}ms) - optimize DB queries\n` : ''}${resFailRate > 0.1 ? `║   ⚠️  High reservation failure rate (${(resFailRate * 100).toFixed(1)}%)\n` : ''}${parseFloat(overallRate) > 50 ? `║   ✅ Good conversion rate (${overallRate}%)\n` : ''}╚══════════════════════════════════════════════════════════════╝
`;
}
