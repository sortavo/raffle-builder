const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('🔧 Corrigiendo status de órdenes: completed → sold\n');

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?status=eq.completed`,
    {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'sold' })
    }
  );

  if (!res.ok) {
    console.log('❌ Error:', await res.text());
    return;
  }

  const updated = await res.json();
  console.log(`✅ ${updated.length} órdenes actualizadas a status=sold`);

  // Verify counts
  console.log('\n📊 Verificación:');

  const RAFFLES = [
    { id: 'e5248331-e05e-4870-af20-9c004fffb255', name: 'Harley-Davidson' },
    { id: '66608e60-93dd-4b9b-b5f8-3e92a86c8d18', name: 'Laptop Gamer' },
    { id: '34b5ab00-8b0b-4a75-9e97-a6d39ed3d4ec', name: 'Viaje Cancún' },
  ];

  for (const raffle of RAFFLES) {
    const countsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_order_ticket_counts`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_raffle_id: raffle.id })
      }
    );
    const counts = await countsRes.json();
    const c = counts[0] || {};
    console.log(`   ${raffle.name}: ${c.sold_count || 0} vendidos, ${c.reserved_count || 0} reservados`);
  }
}

main().catch(console.error);
