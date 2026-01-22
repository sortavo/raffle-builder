/**
 * Script para aprobar todas las órdenes pendientes de aprobación
 */

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const BATCH_SIZE = 500;

async function countPendingOrders() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?status=eq.pending_approval&select=id`,
    { headers: { ...headers, 'Prefer': 'count=exact' } }
  );
  const count = res.headers.get('content-range')?.split('/')[1] || '0';
  return parseInt(count);
}

async function getPendingOrderIds(limit) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?status=eq.pending_approval&select=id&limit=${limit}`,
    { headers }
  );
  return res.json();
}

async function approveOrders(orderIds) {
  const now = new Date().toISOString();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=in.(${orderIds.join(',')})`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'completed',
        approved_at: now,
        sold_at: now,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Approval failed: ${res.status} - ${text}`);
  }

  return orderIds.length;
}

async function main() {
  console.log('🚀 APROBACIÓN MASIVA DE ÓRDENES');
  console.log('================================');

  const startTime = Date.now();
  const totalPending = await countPendingOrders();

  console.log(`📋 Órdenes pendientes: ${totalPending}`);

  if (totalPending === 0) {
    console.log('✅ No hay órdenes pendientes de aprobación');
    return;
  }

  let approved = 0;
  let failed = 0;

  while (approved + failed < totalPending) {
    try {
      const orders = await getPendingOrderIds(BATCH_SIZE);

      if (!orders || orders.length === 0) {
        break;
      }

      const orderIds = orders.map(o => o.id);
      await approveOrders(orderIds);
      approved += orderIds.length;

    } catch (err) {
      console.error(`\n❌ Error:`, err.message);
      failed += BATCH_SIZE;
    }

    const progress = Math.round((approved / totalPending) * 100);
    process.stdout.write(`\r📊 Progreso: ${progress}% (${approved} aprobadas, ${failed} fallidas)`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n================================');
  console.log('📊 RESUMEN');
  console.log('================================');
  console.log(`✅ Órdenes aprobadas: ${approved}`);
  console.log(`❌ Fallidas: ${failed}`);
  console.log(`⏱️  Tiempo total: ${duration}s`);
  console.log(`📈 Rate: ${(approved / parseFloat(duration)).toFixed(2)} órdenes/segundo`);

  // Verify
  const remaining = await countPendingOrders();
  console.log(`\n📋 Órdenes pendientes restantes: ${remaining}`);
}

main().catch(console.error);
