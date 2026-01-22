/**
 * Script para sincronizar ticket_reservation_status con órdenes existentes
 * Crea los registros faltantes para órdenes que fueron aprobadas sin pasar por reserve_tickets_v2
 */

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const RAFFLES = [
  { id: 'e5248331-e05e-4870-af20-9c004fffb255', name: 'Harley-Davidson' },
  { id: '66608e60-93dd-4b9b-b5f8-3e92a86c8d18', name: 'Laptop Gamer' },
  { id: '34b5ab00-8b0b-4a75-9e97-a6d39ed3d4ec', name: 'Viaje Cancún' },
];

const BATCH_SIZE = 100;

async function getCompletedOrders(raffleId, offset, limit) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?raffle_id=eq.${raffleId}&status=eq.completed&select=id,ticket_ranges&offset=${offset}&limit=${limit}`,
    { headers }
  );
  return res.json();
}

async function getExistingReservations(raffleId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_reservation_status?raffle_id=eq.${raffleId}&select=ticket_index`,
    { headers }
  );
  const data = await res.json();
  return new Set(data.map(r => r.ticket_index));
}

async function insertReservations(reservations) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_reservation_status`,
    {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates' },
      body: JSON.stringify(reservations),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert failed: ${res.status} - ${text}`);
  }
}

function expandRanges(ranges) {
  const indices = [];
  for (const range of ranges || []) {
    for (let i = range.s; i <= range.e; i++) {
      indices.push(i);
    }
  }
  return indices;
}

async function fixRaffle(raffle) {
  console.log(`\n🔧 Procesando ${raffle.name}...`);

  // Get existing reservations
  const existingIndices = await getExistingReservations(raffle.id);
  console.log(`   📊 Reservaciones existentes: ${existingIndices.size}`);

  let offset = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  while (true) {
    const orders = await getCompletedOrders(raffle.id, offset, BATCH_SIZE);

    if (!orders || orders.length === 0) break;

    const reservationsToInsert = [];

    for (const order of orders) {
      const indices = expandRanges(order.ticket_ranges);

      for (const idx of indices) {
        if (!existingIndices.has(idx)) {
          reservationsToInsert.push({
            raffle_id: raffle.id,
            ticket_index: idx,
            status: 'sold',
            order_id: order.id,
            reserved_until: null,
          });
          existingIndices.add(idx); // Mark as processed
        } else {
          totalSkipped++;
        }
      }
    }

    if (reservationsToInsert.length > 0) {
      try {
        await insertReservations(reservationsToInsert);
        totalInserted += reservationsToInsert.length;
      } catch (err) {
        console.error(`   ❌ Error:`, err.message);
      }
    }

    offset += BATCH_SIZE;
    process.stdout.write(`\r   📊 Procesados: ${offset} órdenes, ${totalInserted} insertados, ${totalSkipped} omitidos`);
  }

  console.log(`\n   ✅ Completado: ${totalInserted} registros insertados`);
  return totalInserted;
}

async function main() {
  console.log('🔧 REPARACIÓN DE ticket_reservation_status');
  console.log('==========================================');

  const startTime = Date.now();
  let totalFixed = 0;

  for (const raffle of RAFFLES) {
    totalFixed += await fixRaffle(raffle);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n==========================================');
  console.log('📊 RESUMEN');
  console.log('==========================================');
  console.log(`✅ Total registros insertados: ${totalFixed}`);
  console.log(`⏱️  Tiempo: ${duration}s`);

  // Verify
  console.log('\n📊 Verificación final:');
  for (const raffle of RAFFLES) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ticket_reservation_status?raffle_id=eq.${raffle.id}&select=id`,
      { headers: { ...headers, 'Prefer': 'count=exact' } }
    );
    const count = res.headers.get('content-range')?.split('/')[1] || '0';
    console.log(`   ${raffle.name}: ${count} boletos en ticket_reservation_status`);
  }
}

main().catch(console.error);
