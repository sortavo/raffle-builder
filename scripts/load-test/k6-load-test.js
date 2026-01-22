/**
 * K6 Load Test Script para Sortavo
 *
 * Instalación:
 *   brew install k6  # macOS
 *   # o descarga desde https://k6.io/docs/get-started/installation/
 *
 * Uso:
 *   k6 run scripts/load-test/k6-load-test.js
 *
 * Con más usuarios:
 *   k6 run --vus 100 --duration 60s scripts/load-test/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');
const ticketReservationTime = new Trend('ticket_reservation_time');
const pageLoadTime = new Trend('page_load_time');

// Configuración
const BASE_URL = __ENV.BASE_URL || 'https://www.sortavo.com';
const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcwMDIsImV4cCI6MjA4MzQ4MzAwMn0.lQd4r9clw-unRd97qTNxaQe-6f99rvtM9tTJPzbpMdk';

// Slugs de sorteos a probar
const RAFFLE_SLUGS = (__ENV.RAFFLE_SLUGS || 'demo3/relojes-de-lujo').split(',');

export const options = {
  // Escenarios de carga
  scenarios: {
    // Smoke test - verificar que funciona
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },

    // Load test - carga normal
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Ramp up a 50 usuarios
        { duration: '1m', target: 50 },    // Mantener 50 usuarios
        { duration: '30s', target: 100 },  // Ramp up a 100
        { duration: '1m', target: 100 },   // Mantener 100
        { duration: '30s', target: 0 },    // Ramp down
      ],
      startTime: '15s',
      tags: { scenario: 'load' },
    },

    // Stress test - límites del sistema
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 200 },  // Ramp up rápido
        { duration: '1m', target: 200 },   // Mantener alto
        { duration: '20s', target: 500 },  // Spike
        { duration: '30s', target: 500 },  // Mantener spike
        { duration: '30s', target: 0 },    // Ramp down
      ],
      startTime: '4m',
      tags: { scenario: 'stress' },
    },
  },

  thresholds: {
    // 95% de requests deben completarse en menos de 2s
    http_req_duration: ['p(95)<2000'],
    // Menos del 1% de errores
    errors: ['rate<0.01'],
    // Page load bajo 3s
    page_load_time: ['p(95)<3000'],
  },
};

// Datos de prueba
const FIRST_NAMES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBuyerData() {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  return {
    full_name: `${firstName} ${lastName}`,
    email: `loadtest_${Date.now()}_${Math.random().toString(36).substring(7)}@test.sortavo.com`,
    phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`,
  };
}

export default function () {
  const raffleSlug = randomElement(RAFFLE_SLUGS);

  group('Buyer Journey', () => {
    // 1. Cargar página del sorteo
    group('Load Raffle Page', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/${raffleSlug}`);

      pageLoadTime.add(Date.now() - start);

      check(res, {
        'raffle page loaded': (r) => r.status === 200,
        'page has content': (r) => r.body.length > 1000,
      }) || errorRate.add(1);
    });

    sleep(1); // Simular usuario viendo la página

    // 2. Obtener boletos disponibles
    group('Fetch Available Tickets', () => {
      // Primero obtener el raffle_id
      const raffleRes = http.get(
        `${SUPABASE_URL}/rest/v1/raffles?slug=eq.${raffleSlug.split('/').pop()}&select=id`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (raffleRes.status !== 200 || !raffleRes.json()[0]) {
        errorRate.add(1);
        return;
      }

      const raffleId = raffleRes.json()[0].id;

      // Obtener boletos disponibles
      const ticketsRes = http.get(
        `${SUPABASE_URL}/rest/v1/tickets?raffle_id=eq.${raffleId}&status=eq.available&select=id,ticket_number&limit=100`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      check(ticketsRes, {
        'tickets fetched': (r) => r.status === 200,
        'has available tickets': (r) => {
          try {
            return r.json().length > 0;
          } catch {
            return false;
          }
        },
      }) || errorRate.add(1);
    });

    sleep(2); // Simular usuario seleccionando boletos

    // 3. Simular reservación de boletos
    group('Reserve Tickets', () => {
      const buyer = generateBuyerData();

      // Crear buyer
      const start = Date.now();
      const buyerRes = http.post(
        `${SUPABASE_URL}/rest/v1/buyers`,
        JSON.stringify(buyer),
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
        }
      );

      ticketReservationTime.add(Date.now() - start);

      check(buyerRes, {
        'buyer created': (r) => r.status === 201,
      }) || errorRate.add(1);
    });

    sleep(1);
  });
}

// Función de setup - se ejecuta una vez al inicio
export function setup() {
  console.log(`
  ╔════════════════════════════════════════════════╗
  ║     SORTAVO LOAD TEST                          ║
  ║     Testing: ${BASE_URL}
  ║     Raffles: ${RAFFLE_SLUGS.join(', ')}
  ╚════════════════════════════════════════════════╝
  `);

  // Verificar conectividad
  const res = http.get(BASE_URL);
  if (res.status !== 200) {
    console.error(`Cannot connect to ${BASE_URL}`);
    return null;
  }

  return { startTime: Date.now() };
}

// Función de teardown - se ejecuta al final
export function teardown(data) {
  if (!data) return;

  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`
  ╔════════════════════════════════════════════════╗
  ║     TEST COMPLETED                             ║
  ║     Duration: ${duration} minutes
  ╚════════════════════════════════════════════════╝
  `);
}
