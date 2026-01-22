/**
 * Script para crear 10,000 órdenes pendientes de aprobación
 * Usando el sistema de boletos virtuales de Sortavo
 */

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

// Sorteos a usar (NO demo1@sortavo.com)
const RAFFLES = [
  {
    id: 'e5248331-e05e-4870-af20-9c004fffb255',
    name: 'Harley-Davidson',
    totalTickets: 500000,
    orgId: null, // Will fetch
    ticketPrice: 150
  },
  {
    id: '66608e60-93dd-4b9b-b5f8-3e92a86c8d18',
    name: 'Laptop Gamer',
    totalTickets: 25000,
    orgId: null,
    ticketPrice: 50
  },
  {
    id: '34b5ab00-8b0b-4a75-9e97-a6d39ed3d4ec',
    name: 'Viaje Cancún',
    totalTickets: 50000,
    orgId: null,
    ticketPrice: 100
  },
];

const CONFIG = {
  TOTAL_ORDERS: 10000,
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
const FIRST_NAMES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia', 'José', 'Carmen', 'Luis', 'Patricia', 'Jorge', 'Diana', 'Roberto', 'Elena', 'Fernando', 'Rosa', 'Antonio', 'Lucia', 'Alejandro', 'Isabel', 'Ricardo', 'Teresa', 'Francisco', 'Beatriz'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Cruz', 'Morales', 'Ortiz', 'Gutiérrez', 'Chavez', 'Vázquez', 'Castro', 'Ruiz', 'Mendoza'];
const CITIES = ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Mérida', 'Cancún', 'Querétaro', 'Chihuahua', 'Aguascalientes', 'Morelia', 'Veracruz', 'Toluca', 'Oaxaca', 'Culiacán', 'Hermosillo'];
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

async function getRaffleInfo(raffleId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/raffles?id=eq.${raffleId}&select=id,organization_id,ticket_price,total_tickets`,
    { headers }
  );
  const data = await res.json();
  return data[0];
}

async function getNextAvailableIndex(raffleId, totalTickets) {
  // Get count of existing reservations
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_reservation_status?raffle_id=eq.${raffleId}&select=ticket_index`,
    { headers: { ...headers, 'Prefer': 'count=exact' } }
  );
  const count = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
  return count + 1;
}

// Track used indices per raffle
const usedIndices = new Map();

function getNextIndices(raffleId, count, totalTickets) {
  if (!usedIndices.has(raffleId)) {
    usedIndices.set(raffleId, 1);
  }

  const startIndex = usedIndices.get(raffleId);
  const indices = [];

  for (let i = 0; i < count && startIndex + i <= totalTickets; i++) {
    indices.push(startIndex + i);
  }

  usedIndices.set(raffleId, startIndex + count);
  return indices;
}

function indicesToRanges(indices) {
  if (indices.length === 0) return [];

  const ranges = [];
  let start = indices[0];
  let end = indices[0];

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === end + 1) {
      end = indices[i];
    } else {
      ranges.push({ s: start, e: end });
      start = indices[i];
      end = indices[i];
    }
  }
  ranges.push({ s: start, e: end });

  return ranges;
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
  console.log('🚀 SORTAVO LOAD TEST - 10,000 ÓRDENES');
  console.log('======================================');
  console.log(`📋 Sorteos: ${RAFFLES.map(r => r.name).join(', ')}`);
  console.log(`🎯 Total órdenes: ${CONFIG.TOTAL_ORDERS}`);
  console.log(`🎫 Boletos por orden: ${CONFIG.TICKETS_PER_ORDER_MIN}-${CONFIG.TICKETS_PER_ORDER_MAX}`);

  const startTime = Date.now();

  // Fetch raffle info
  console.log('\n📋 Obteniendo información de sorteos...');
  for (const raffle of RAFFLES) {
    const info = await getRaffleInfo(raffle.id);
    if (info) {
      raffle.orgId = info.organization_id;
      raffle.ticketPrice = parseFloat(info.ticket_price) || raffle.ticketPrice;
      raffle.totalTickets = info.total_tickets || raffle.totalTickets;
      console.log(`   ✅ ${raffle.name}: ${raffle.totalTickets} boletos, $${raffle.ticketPrice}/boleto`);
    }
  }

  // Initialize used indices from existing reservations
  console.log('\n📊 Verificando reservaciones existentes...');
  for (const raffle of RAFFLES) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ticket_reservation_status?raffle_id=eq.${raffle.id}&order=ticket_index.desc&limit=1`,
      { headers }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      usedIndices.set(raffle.id, data[0].ticket_index + 1);
      console.log(`   ${raffle.name}: Último índice ${data[0].ticket_index}`);
    } else {
      usedIndices.set(raffle.id, 1);
      console.log(`   ${raffle.name}: Sin reservaciones`);
    }
  }

  // Create orders
  console.log('\n\n📝 Creando órdenes...');
  console.log('======================');

  const ordersPerRaffle = Math.ceil(CONFIG.TOTAL_ORDERS / RAFFLES.length);
  let totalCreated = 0;
  let totalFailed = 0;

  for (const raffle of RAFFLES) {
    console.log(`\n🎰 ${raffle.name} (${ordersPerRaffle} órdenes)`);

    for (let i = 0; i < ordersPerRaffle; i += CONFIG.BATCH_SIZE) {
      const batchEnd = Math.min(i + CONFIG.BATCH_SIZE, ordersPerRaffle);
      const ordersBatch = [];
      const reservationsBatch = [];

      for (let j = i; j < batchEnd; j++) {
        const ticketCount = randomInt(CONFIG.TICKETS_PER_ORDER_MIN, CONFIG.TICKETS_PER_ORDER_MAX);
        const indices = getNextIndices(raffle.id, ticketCount, raffle.totalTickets);

        if (indices.length === 0) {
          console.log(`\n   ⚠️ No hay más boletos disponibles`);
          break;
        }

        const ranges = indicesToRanges(indices);
        const totalAmount = ticketCount * raffle.ticketPrice;

        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const orderIndex = totalCreated + j + 1;

        const order = {
          raffle_id: raffle.id,
          organization_id: raffle.orgId,
          buyer_name: `${firstName} ${lastName}`,
          buyer_email: `loadtest_${orderIndex}_${Date.now()}@test.sortavo.com`,
          buyer_phone: `55${randomInt(10000000, 99999999)}`,
          buyer_city: randomElement(CITIES),
          ticket_ranges: ranges,
          ticket_count: ticketCount,
          order_total: totalAmount,
          status: 'pending_approval',
          payment_method: randomElement(PAYMENT_METHODS),
          payment_proof_url: `https://storage.sortavo.com/proofs/loadtest_${orderIndex}_${Math.random().toString(36).substring(2, 10)}.jpg`,
          reference_code: generateReferenceCode(),
          reserved_at: new Date().toISOString(),
          reserved_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        };

        ordersBatch.push(order);

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

      try {
        // Create orders
        const createdOrders = await createOrderBatch(ordersBatch);

        // Update reservations with order_id
        for (let k = 0; k < createdOrders.length; k++) {
          const order = createdOrders[k];
          const indices = [];
          for (const range of order.ticket_ranges) {
            for (let idx = range.s; idx <= range.e; idx++) {
              indices.push(idx);
            }
          }

          // Find matching reservations and add order_id
          const matchingReservations = reservationsBatch.filter(r =>
            r.raffle_id === order.raffle_id && indices.includes(r.ticket_index)
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

  console.log('\n\n======================================');
  console.log('📊 RESUMEN FINAL');
  console.log('======================================');
  console.log(`✅ Órdenes creadas: ${totalCreated}`);
  console.log(`❌ Fallidas: ${totalFailed}`);
  console.log(`⏱️  Tiempo total: ${duration}s`);
  console.log(`📈 Rate: ${(totalCreated / parseFloat(duration)).toFixed(2)} órdenes/segundo`);

  // Count pending approvals
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?status=eq.pending_approval&select=id`,
    { headers: { ...headers, 'Prefer': 'count=exact' } }
  );
  const pendingCount = countRes.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`\n📋 Total órdenes pendientes de aprobación: ${pendingCount}`);

  console.log('\n🎉 ¡Load test completado!');
  console.log('   Ahora puedes probar el dashboard de aprobaciones');
}

main().catch(console.error);
