const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Prefer': 'count=exact'
};

const RAFFLES = [
  { id: 'e5248331-e05e-4870-af20-9c004fffb255', name: 'Harley-Davidson' },
  { id: '66608e60-93dd-4b9b-b5f8-3e92a86c8d18', name: 'Laptop Gamer' },
  { id: '34b5ab00-8b0b-4a75-9e97-a6d39ed3d4ec', name: 'Viaje Cancún' },
];

async function main() {
  console.log('📊 VERIFICACIÓN DE ticket_reservation_status');
  console.log('=============================================\n');

  // Count total reservations
  const totalRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_reservation_status?select=id`,
    { headers }
  );
  const totalCount = totalRes.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`Total registros en ticket_reservation_status: ${totalCount}\n`);

  // Count by raffle
  console.log('Por sorteo:');
  for (const raffle of RAFFLES) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ticket_reservation_status?raffle_id=eq.${raffle.id}&select=id`,
      { headers }
    );
    const count = res.headers.get('content-range')?.split('/')[1] || '0';
    console.log(`  ${raffle.name}: ${count} boletos`);
  }

  // Count by status
  console.log('\n📋 Por status:');
  for (const status of ['reserved', 'sold', 'available', 'expired']) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ticket_reservation_status?status=eq.${status}&select=id`,
      { headers }
    );
    const count = res.headers.get('content-range')?.split('/')[1] || '0';
    if (parseInt(count) > 0) {
      console.log(`  ${status}: ${count}`);
    }
  }

  // Sample records
  console.log('\n📋 Muestra de registros:');
  const sampleRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ticket_reservation_status?limit=3&select=*`,
    { headers: { ...headers, 'Prefer': 'return=representation' } }
  );
  const samples = await sampleRes.json();
  if (samples.length === 0) {
    console.log('  (vacío)');
  } else {
    console.log(JSON.stringify(samples, null, 2));
  }

  // Compare with orders
  console.log('\n📊 COMPARACIÓN CON ÓRDENES');
  console.log('===========================');

  // Count completed orders
  const ordersRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?status=eq.completed&select=id`,
    { headers }
  );
  const ordersCount = ordersRes.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`Órdenes completadas: ${ordersCount}`);

  // Get ticket count from orders (paginate if needed)
  let totalTickets = 0;
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const ticketCountRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?status=eq.completed&select=ticket_count&limit=${pageSize}&offset=${offset}`,
      { headers: { ...headers, 'Prefer': 'return=representation' } }
    );
    const orders = await ticketCountRes.json();

    if (!orders || orders.length === 0) break;

    totalTickets += orders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
    offset += pageSize;

    if (orders.length < pageSize) break;
  }

  console.log(`Total boletos en órdenes completadas: ${totalTickets}`);
  console.log(`Total boletos en ticket_reservation_status: ${totalCount}`);

  const diff = totalTickets - parseInt(totalCount);
  if (diff !== 0) {
    console.log(`\n⚠️  DISCREPANCIA DETECTADA`);
    console.log(`   Faltan ${diff} registros en ticket_reservation_status`);
    console.log(`   Esto significa que los boletos vendidos NO están marcados como ocupados`);
    console.log(`   Riesgo: Se podrían vender los mismos boletos a otros compradores`);
  } else {
    console.log('\n✅ Los boletos están sincronizados');
  }

  // Check for potential overselling (overlapping ranges)
  console.log('\n📊 VERIFICACIÓN DE OVERSELLING');
  console.log('===============================');

  for (const raffle of RAFFLES) {
    // Get all ticket ranges for this raffle
    const rangesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?raffle_id=eq.${raffle.id}&status=eq.completed&select=ticket_ranges&limit=5000`,
      { headers: { ...headers, 'Prefer': 'return=representation' } }
    );
    const rangesData = await rangesRes.json();

    // Flatten all indices
    const allIndices = new Set();
    let duplicates = 0;

    for (const order of rangesData) {
      if (!order.ticket_ranges) continue;
      for (const range of order.ticket_ranges) {
        for (let i = range.s; i <= range.e; i++) {
          if (allIndices.has(i)) {
            duplicates++;
          } else {
            allIndices.add(i);
          }
        }
      }
    }

    if (duplicates > 0) {
      console.log(`  ⚠️  ${raffle.name}: ${duplicates} boletos duplicados (overselling)`);
    } else {
      console.log(`  ✅ ${raffle.name}: Sin duplicados (${allIndices.size} boletos únicos)`);
    }
  }
}

main().catch(console.error);
