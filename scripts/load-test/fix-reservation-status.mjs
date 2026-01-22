const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const RAFFLES = [
  { id: 'e5248331-e05e-4870-af20-9c004fffb255', name: 'Harley-Davidson' },
  { id: '66608e60-93dd-4b9b-b5f8-3e92a86c8d18', name: 'Laptop Gamer' },
  { id: '34b5ab00-8b0b-4a75-9e97-a6d39ed3d4ec', name: 'Viaje Cancún' },
];

async function main() {
  console.log('🔧 Actualizando ticket_reservation_status: reserved → sold\n');

  for (const raffle of RAFFLES) {
    console.log(`${raffle.name}...`);

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ticket_reservation_status?raffle_id=eq.${raffle.id}&status=eq.reserved`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          status: 'sold',
          reserved_until: null
        })
      }
    );

    if (!res.ok) {
      console.log('   ❌ Error:', await res.text());
      continue;
    }

    const updated = await res.json();
    console.log(`   ✅ ${updated.length} registros actualizados`);
  }

  // Verify ticket_block_status after trigger should have fired
  console.log('\n📊 Verificación de ticket_block_status:');

  for (const raffle of RAFFLES) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ticket_block_status?raffle_id=eq.${raffle.id}&select=sold_count,reserved_count`,
      { headers: { ...headers, 'Prefer': 'return=representation' } }
    );
    const blocks = await res.json();

    const totalSold = blocks.reduce((sum, b) => sum + (b.sold_count || 0), 0);
    const totalReserved = blocks.reduce((sum, b) => sum + (b.reserved_count || 0), 0);

    console.log(`   ${raffle.name}: ${totalSold} vendidos, ${totalReserved} reservados`);
  }
}

main().catch(console.error);
