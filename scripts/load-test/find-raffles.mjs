const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

async function main() {
  // Get all raffles with organization info
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/raffles?select=id,title,total_tickets,ticket_price,status,organization_id,organizations(id,slug,profiles(email))&order=created_at.desc`,
    { headers }
  );
  const raffles = await res.json();

  console.log('📋 RIFAS DISPONIBLES (excluyendo demo1@sortavo.com):\n');

  const available = [];

  for (const r of raffles) {
    const email = r.organizations?.profiles?.email || 'unknown';
    const isDemo1 = email === 'demo1@sortavo.com';

    if (!isDemo1 && r.status === 'active') {
      console.log(`ID: ${r.id}`);
      console.log(`   Título: ${r.title}`);
      console.log(`   Total boletos: ${r.total_tickets}`);
      console.log(`   Precio: $${r.ticket_price}`);
      console.log(`   Org: ${r.organizations?.slug} (${email})`);
      console.log('');

      available.push({
        id: r.id,
        name: r.title,
        totalTickets: r.total_tickets,
        ticketPrice: parseFloat(r.ticket_price),
        orgId: r.organization_id,
      });
    }
  }

  console.log(`\n✅ Total rifas disponibles: ${available.length}`);
  console.log('\nJSON para usar en script:');
  console.log(JSON.stringify(available, null, 2));
}

main().catch(console.error);
