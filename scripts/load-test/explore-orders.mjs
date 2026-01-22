const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function main() {
  // Check orders table schema
  console.log('📋 Checking orders table...\n');

  const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?limit=3`, { headers });
  const orders = await ordersRes.json();
  console.log('Sample orders:', JSON.stringify(orders, null, 2).slice(0, 2000));

  // Check ticket_reservation_status
  console.log('\n\n📋 Checking ticket_reservation_status...\n');
  const trsRes = await fetch(`${SUPABASE_URL}/rest/v1/ticket_reservation_status?limit=3`, { headers });
  const trs = await trsRes.json();
  console.log('Sample ticket_reservation_status:', JSON.stringify(trs, null, 2).slice(0, 1000));

  // Check ticket_block_status
  console.log('\n\n📋 Checking ticket_block_status...\n');
  const tbsRes = await fetch(`${SUPABASE_URL}/rest/v1/ticket_block_status?limit=3`, { headers });
  const tbs = await tbsRes.json();
  console.log('Sample ticket_block_status:', JSON.stringify(tbs, null, 2).slice(0, 1000));

  // Count existing orders by status
  console.log('\n\n📊 Counting orders by status...\n');
  for (const status of ['pending_payment', 'pending_approval', 'completed', 'cancelled']) {
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?status=eq.${status}&select=id`,
      { headers: { ...headers, 'Prefer': 'count=exact' } }
    );
    const count = countRes.headers.get('content-range')?.split('/')[1] || '0';
    console.log(`  ${status}: ${count}`);
  }

  // Get available RPC functions for reservations
  console.log('\n\n🔧 Testing atomic_reserve_tickets_v2...');
  try {
    // Get raffle stats first
    const statsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_raffle_stats_fast`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_raffle_id: 'e5248331-e05e-4870-af20-9c004fffb255' })
    });
    console.log('Stats status:', statsRes.status);
    const stats = await statsRes.json();
    console.log('Raffle stats:', stats);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

main().catch(console.error);
