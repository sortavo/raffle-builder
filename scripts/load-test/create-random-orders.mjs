/**
 * Script para crear 30,000 órdenes con selección aleatoria de boletos
 * - Usa lucky_indices (máquina de la suerte)
 * - Selección aleatoria dispersa por todo el rango de boletos
 * - Status: pending_approval
 * - Excluye rifas de demo1@sortavo.com (org: 40c2604c-764b-49fb-9b53-1ee59102ff6e)
 */

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

// Rifas de demo2 y demo3 (excluyendo demo1: 40c2604c-764b-49fb-9b53-1ee59102ff6e)
// Excluyendo también las 3 rifas que ya tienen datos del test anterior
const RAFFLES = [
  {
    id: '455a7ee1-de85-46b5-8281-128ee5ed2bd1',
    name: 'Relojes de Lujo',
    totalTickets: 5000000,
    ticketPrice: 80,
    orgId: 'b8dc29a4-ad98-425b-bf98-7902557300db'
  },
  {
    id: '2d01d62d-a8a3-4d50-b816-29cdc0290198',
    name: 'Un Millón en Efectivo',
    totalTickets: 2000000,
    ticketPrice: 50,
    orgId: 'a73799b4-c28d-43d6-bea3-427c11ccb4e4'
  },
  {
    id: '47593ad2-ade6-47c5-a9ec-7517922d18a8',
    name: 'Ferrari 296 GTB',
    totalTickets: 7000000,
    ticketPrice: 100,
    orgId: 'b8dc29a4-ad98-425b-bf98-7902557300db'
  },
  {
    id: '084f7f8a-6472-48f8-a281-e61ff4ddc4b9',
    name: 'Mansión en Los Cabos',
    totalTickets: 10000000,
    ticketPrice: 50,
    orgId: 'b8dc29a4-ad98-425b-bf98-7902557300db'
  },
  {
    id: '0f1ea80d-d9c7-4c0e-8e73-bcf18f195f64',
    name: 'Casa de Playa',
    totalTickets: 3000000,
    ticketPrice: 100,
    orgId: 'a73799b4-c28d-43d6-bea3-427c11ccb4e4'
  },
];

const CONFIG = {
  TOTAL_ORDERS: 30000,
  TICKETS_PER_ORDER_MIN: 1,
  TICKETS_PER_ORDER_MAX: 5,
  BATCH_SIZE: 100,
};

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// Generador de datos
const FIRST_NAMES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia', 'José', 'Carmen', 'Luis', 'Patricia', 'Jorge', 'Diana', 'Roberto', 'Elena', 'Fernando', 'Rosa', 'Antonio', 'Lucia', 'Alejandro', 'Isabel', 'Ricardo', 'Teresa', 'Francisco', 'Beatriz', 'Gabriel', 'Valentina', 'Diego', 'Camila'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Cruz', 'Morales', 'Ortiz', 'Gutiérrez', 'Chavez', 'Vázquez', 'Castro', 'Ruiz', 'Mendoza', 'Aguilar', 'Medina'];
const CITIES = ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Mérida', 'Cancún', 'Querétaro', 'Chihuahua', 'Aguascalientes', 'Morelia', 'Veracruz', 'Toluca', 'Oaxaca', 'Culiacán', 'Hermosillo', 'Saltillo', 'Villahermosa'];
const PAYMENT_METHODS = ['transferencia', 'oxxo', 'efectivo', 'tarjeta', 'spei'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateReferenceCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Track used indices per raffle to avoid duplicates
const usedIndices = new Map();

function getRandomIndices(raffleId, count, totalTickets) {
  if (!usedIndices.has(raffleId)) {
    usedIndices.set(raffleId, new Set());
  }

  const used = usedIndices.get(raffleId);
  const indices = [];
  let attempts = 0;
  const maxAttempts = count * 10;

  while (indices.length < count && attempts < maxAttempts) {
    // Generate random 0-BASED INDEX (0 to totalTickets-1)
    // IMPORTANT: lucky_indices stores indices, not ticket numbers!
    // Ticket number = numberStart + index
    const idx = randomInt(0, totalTickets - 1);

    if (!used.has(idx)) {
      used.add(idx);
      indices.push(idx);
    }
    attempts++;
  }

  return indices.sort((a, b) => a - b);
}

async function createOrderBatch(orders) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orders),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Order creation failed: ${res.status} - ${text}`);
  }

  return res.json();
}

async function createTicketReservations(reservations) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ticket_reservation_status`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify(reservations),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reservation creation failed: ${res.status} - ${text}`);
  }
}

async function main() {
  console.log('🎰 SORTAVO LOAD TEST - 30,000 ÓRDENES ALEATORIAS');
  console.log('=================================================');
  console.log(`📋 Sorteos: ${RAFFLES.map(r => r.name).join(', ')}`);
  console.log(`🎯 Total órdenes: ${CONFIG.TOTAL_ORDERS}`);
  console.log(`🎫 Boletos por orden: ${CONFIG.TICKETS_PER_ORDER_MIN}-${CONFIG.TICKETS_PER_ORDER_MAX}`);
  console.log(`🎲 Selección: ALEATORIA (Lucky Machine)`);
  console.log(`📊 Status: pending_approval`);

  const startTime = Date.now();

  const ordersPerRaffle = Math.ceil(CONFIG.TOTAL_ORDERS / RAFFLES.length);
  let totalCreated = 0;
  let totalFailed = 0;
  let totalTickets = 0;

  for (const raffle of RAFFLES) {
    console.log(`\n🎰 ${raffle.name} (${ordersPerRaffle} órdenes)`);
    console.log(`   Total boletos disponibles: ${raffle.totalTickets.toLocaleString()}`);

    for (let i = 0; i < ordersPerRaffle; i += CONFIG.BATCH_SIZE) {
      const batchEnd = Math.min(i + CONFIG.BATCH_SIZE, ordersPerRaffle);
      const ordersBatch = [];
      const reservationsBatch = [];

      for (let j = i; j < batchEnd; j++) {
        const ticketCount = randomInt(CONFIG.TICKETS_PER_ORDER_MIN, CONFIG.TICKETS_PER_ORDER_MAX);
        const indices = getRandomIndices(raffle.id, ticketCount, raffle.totalTickets);

        if (indices.length === 0) {
          continue;
        }

        const totalAmount = indices.length * raffle.ticketPrice;
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const orderIndex = totalCreated + j + 1;
        const referenceCode = `LT2-${generateReferenceCode()}`;

        const order = {
          raffle_id: raffle.id,
          organization_id: raffle.orgId,
          buyer_name: `${firstName} ${lastName}`,
          buyer_email: `lucky_${orderIndex}_${Date.now()}@test.sortavo.com`,
          buyer_phone: `55${randomInt(10000000, 99999999)}`,
          buyer_city: randomElement(CITIES),
          // Use lucky_indices instead of ticket_ranges for lucky machine
          ticket_ranges: [],
          lucky_indices: indices,
          ticket_count: indices.length,
          order_total: totalAmount,
          status: 'pending_approval',
          payment_method: randomElement(PAYMENT_METHODS),
          payment_proof_url: `https://storage.sortavo.com/proofs/lucky_${orderIndex}_${Math.random().toString(36).substring(2, 10)}.jpg`,
          reference_code: referenceCode,
          reserved_at: new Date().toISOString(),
          reserved_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        };

        ordersBatch.push(order);
        totalTickets += indices.length;

        // Create reservation entries
        for (const idx of indices) {
          reservationsBatch.push({
            raffle_id: raffle.id,
            ticket_index: idx,
            status: 'reserved',
            reserved_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          });
        }
      }

      if (ordersBatch.length === 0) continue;

      try {
        // Create orders
        const createdOrders = await createOrderBatch(ordersBatch);

        // Update reservations with order_id
        for (let k = 0; k < createdOrders.length; k++) {
          const order = createdOrders[k];
          const luckyIndices = order.lucky_indices || [];

          // Find matching reservations and add order_id
          const matchingReservations = reservationsBatch.filter(r =>
            r.raffle_id === order.raffle_id && luckyIndices.includes(r.ticket_index)
          );
          matchingReservations.forEach(r => r.order_id = order.id);
        }

        // Create ticket reservations
        if (reservationsBatch.length > 0) {
          await createTicketReservations(reservationsBatch);
        }

        totalCreated += ordersBatch.length;
      } catch (err) {
        console.error(`\n   ❌ Error:`, err.message);
        totalFailed += ordersBatch.length;
      }

      const progress = Math.round((totalCreated / CONFIG.TOTAL_ORDERS) * 100);
      process.stdout.write(`\r   📊 Progreso: ${progress}% (${totalCreated} creadas, ${totalFailed} fallidas)`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n=================================================');
  console.log('📊 RESUMEN FINAL');
  console.log('=================================================');
  console.log(`✅ Órdenes creadas: ${totalCreated}`);
  console.log(`❌ Fallidas: ${totalFailed}`);
  console.log(`🎫 Total boletos reservados: ${totalTickets}`);
  console.log(`⏱️  Tiempo total: ${duration}s`);
  console.log(`📈 Rate: ${(totalCreated / parseFloat(duration)).toFixed(2)} órdenes/segundo`);

  // Count pending approvals
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?status=eq.pending_approval&select=id`,
    { headers: { ...headers, 'Prefer': 'count=exact' } }
  );
  const pendingCount = countRes.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`\n📋 Total órdenes pendientes de aprobación: ${pendingCount}`);

  // Show distribution per raffle
  console.log('\n📊 Distribución por rifa:');
  for (const raffle of RAFFLES) {
    const used = usedIndices.get(raffle.id);
    const count = used ? used.size : 0;
    console.log(`   ${raffle.name}: ${count} boletos únicos`);
  }

  console.log('\n🎉 ¡Load test completado!');
  console.log('   Los boletos están distribuidos ALEATORIAMENTE en cada rifa');
  console.log('   Ahora puedes aprobar las órdenes desde el dashboard');
}

main().catch(console.error);
