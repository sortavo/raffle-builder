/**
 * Script completo de Load Test v2 - usando fetch directo
 * 1. Genera boletos para los sorteos
 * 2. Crea 10,000 reservaciones con comprobantes de pago
 */

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

// Sorteos a usar (NO demo1@sortavo.com)
const RAFFLES = [
  { id: 'e5248331-e05e-4870-af20-9c004fffb255', name: 'Harley-Davidson', totalTickets: 500000 },
  { id: '66608e60-93dd-4b9b-b5f8-3e92a86c8d18', name: 'Laptop Gamer', totalTickets: 25000 },
  { id: '34b5ab00-8b0b-4a75-9e97-a6d39ed3d4ec', name: 'Viaje Cancún', totalTickets: 50000 },
];

const CONFIG = {
  TOTAL_RESERVATIONS: 10000,
  TICKETS_PER_RESERVATION: 3,
  BATCH_SIZE: 100,
  TICKET_BATCH_SIZE: 1000,
};

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// Generador de nombres aleatorios
const FIRST_NAMES = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofia', 'José', 'Carmen', 'Luis', 'Patricia', 'Jorge', 'Diana', 'Roberto', 'Elena'];
const LAST_NAMES = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'];
const CITIES = ['CDMX', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Mérida', 'Cancún', 'Querétaro'];
const PAYMENT_METHODS = ['transferencia', 'oxxo', 'efectivo', 'tarjeta', 'spei'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function padNumber(num, length) {
  return num.toString().padStart(length, '0');
}

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json().catch(() => null);
}

async function countTickets(raffleId, status = null) {
  let endpoint = `tickets?raffle_id=eq.${raffleId}&select=id`;
  if (status) endpoint += `&status=eq.${status}`;
  endpoint += '&limit=1';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: { ...headers, 'Prefer': 'count=exact' }
  });

  const count = res.headers.get('content-range')?.split('/')[1];
  return parseInt(count) || 0;
}

async function generateTickets(raffleId, raffleName, totalTickets, ticketsNeeded) {
  console.log(`\n🎫 Generando boletos para ${raffleName}...`);

  const existing = await countTickets(raffleId);
  console.log(`   📊 Existentes: ${existing}`);

  if (existing >= ticketsNeeded) {
    console.log(`   ✅ Suficientes boletos disponibles`);
    return existing;
  }

  const toGenerate = Math.min(ticketsNeeded - existing, totalTickets - existing);
  const digits = totalTickets.toString().length;

  console.log(`   📦 Generando ${toGenerate} boletos...`);

  let generated = 0;
  for (let i = existing; i < existing + toGenerate; i += CONFIG.TICKET_BATCH_SIZE) {
    const batch = [];
    const batchEnd = Math.min(i + CONFIG.TICKET_BATCH_SIZE, existing + toGenerate);

    for (let j = i; j < batchEnd; j++) {
      batch.push({
        raffle_id: raffleId,
        ticket_number: padNumber(j + 1, digits),
        status: 'available',
      });
    }

    try {
      await supabaseRequest('tickets', 'POST', batch);
      generated += batch.length;
      process.stdout.write(`\r   📦 Generados: ${generated}/${toGenerate}`);
    } catch (err) {
      console.error(`\n   ❌ Error:`, err.message);
    }
  }

  console.log(`\n   ✅ Generación completada: ${generated} boletos`);
  return generated + existing;
}

async function getAvailableTickets(raffleId, limit) {
  const endpoint = `tickets?raffle_id=eq.${raffleId}&status=eq.available&select=id,ticket_number&limit=${limit}`;
  return await supabaseRequest(endpoint);
}

async function createBuyers(buyers) {
  return await supabaseRequest('buyers', 'POST', buyers);
}

async function updateTickets(ticketIds, updateData) {
  const endpoint = `tickets?id=in.(${ticketIds.join(',')})`;
  await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateData),
  });
}

async function createReservations(raffleId, raffleName, count, startIndex) {
  console.log(`\n📝 Creando ${count} reservaciones en ${raffleName}...`);

  const ticketsNeeded = count * CONFIG.TICKETS_PER_RESERVATION;
  const availableTickets = await getAvailableTickets(raffleId, ticketsNeeded);

  if (!availableTickets || availableTickets.length === 0) {
    console.log(`   ❌ No hay boletos disponibles`);
    return { success: 0, failed: 0 };
  }

  console.log(`   🎫 Boletos disponibles: ${availableTickets.length}`);

  const actualReservations = Math.floor(availableTickets.length / CONFIG.TICKETS_PER_RESERVATION);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < actualReservations; i += CONFIG.BATCH_SIZE) {
    const batchEnd = Math.min(i + CONFIG.BATCH_SIZE, actualReservations);
    const buyers = [];

    for (let j = i; j < batchEnd; j++) {
      const buyerIndex = startIndex + j;
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);

      buyers.push({
        full_name: `${firstName} ${lastName}`,
        email: `loadtest_${buyerIndex}_${Date.now()}@test.sortavo.com`,
        phone: `55${Math.floor(10000000 + Math.random() * 90000000)}`,
        city: randomElement(CITIES),
        is_guest: true,
        email_verified: false,
      });
    }

    try {
      // Create buyers
      const insertedBuyers = await createBuyers(buyers);

      // Update tickets for each buyer
      for (let k = 0; k < insertedBuyers.length; k++) {
        const buyerIdx = i + k;
        const buyer = insertedBuyers[k];
        const ticketStart = buyerIdx * CONFIG.TICKETS_PER_RESERVATION;
        const ticketIds = availableTickets
          .slice(ticketStart, ticketStart + CONFIG.TICKETS_PER_RESERVATION)
          .map(t => t.id);

        if (ticketIds.length === 0) continue;

        await updateTickets(ticketIds, {
          buyer_id: buyer.id,
          buyer_name: buyer.full_name,
          buyer_email: buyer.email,
          buyer_phone: buyer.phone,
          buyer_city: buyer.city,
          status: 'reserved',
          reserved_at: new Date().toISOString(),
          reserved_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          payment_method: randomElement(PAYMENT_METHODS),
          payment_proof_url: `https://storage.sortavo.com/proofs/lt_${startIndex + buyerIdx}_${Math.random().toString(36).substring(2, 8)}.jpg`,
          payment_reference: `REF-LT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        });

        success++;
      }
    } catch (err) {
      console.error(`\n   ❌ Error en batch:`, err.message);
      failed += batchEnd - i;
    }

    const progress = Math.round((success / actualReservations) * 100);
    process.stdout.write(`\r   📊 Progreso: ${progress}% (${success} exitosas, ${failed} fallidas)`);
  }

  console.log(`\n   ✅ Completado: ${success} reservaciones`);
  return { success, failed };
}

async function main() {
  console.log('🚀 SORTAVO LOAD TEST - 10,000 RESERVACIONES');
  console.log('=============================================');
  console.log(`📋 Sorteos: ${RAFFLES.map(r => r.name).join(', ')}`);
  console.log(`🎯 Total reservaciones: ${CONFIG.TOTAL_RESERVATIONS}`);
  console.log(`🎫 Boletos por reservación: ${CONFIG.TICKETS_PER_RESERVATION}`);

  const startTime = Date.now();
  const reservationsPerRaffle = Math.ceil(CONFIG.TOTAL_RESERVATIONS / RAFFLES.length);
  const ticketsNeededPerRaffle = reservationsPerRaffle * CONFIG.TICKETS_PER_RESERVATION;

  // Step 1: Generate tickets
  console.log('\n\n📦 PASO 1: Generando boletos...');
  console.log('================================');

  for (const raffle of RAFFLES) {
    await generateTickets(raffle.id, raffle.name, raffle.totalTickets, ticketsNeededPerRaffle);
  }

  // Step 2: Create reservations
  console.log('\n\n📝 PASO 2: Creando reservaciones...');
  console.log('=====================================');

  let totalSuccess = 0;
  let totalFailed = 0;
  let reservationIndex = 0;

  for (const raffle of RAFFLES) {
    const result = await createReservations(
      raffle.id,
      raffle.name,
      reservationsPerRaffle,
      reservationIndex
    );
    totalSuccess += result.success;
    totalFailed += result.failed;
    reservationIndex += reservationsPerRaffle;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n=============================================');
  console.log('📊 RESUMEN FINAL');
  console.log('=============================================');
  console.log(`✅ Reservaciones creadas: ${totalSuccess}`);
  console.log(`❌ Fallidas: ${totalFailed}`);
  console.log(`🎫 Boletos reservados: ${totalSuccess * CONFIG.TICKETS_PER_RESERVATION}`);
  console.log(`⏱️  Tiempo total: ${duration}s`);
  console.log(`📈 Rate: ${(totalSuccess / parseFloat(duration)).toFixed(2)} reservaciones/segundo`);
  console.log('\n🎉 ¡Load test completado!');
  console.log('   Ahora puedes probar el dashboard de aprobaciones');
}

main().catch(console.error);
