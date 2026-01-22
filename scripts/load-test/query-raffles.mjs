import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function main() {
  // Get all active raffles with organization info
  const { data: raffles, error } = await supabase
    .from('raffles')
    .select(`
      id,
      title,
      slug,
      total_tickets,
      organization_id,
      organizations (
        id,
        email,
        name
      )
    `)
    .eq('status', 'active');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📋 Sorteos Activos:\n');

  // Filter out demo1@sortavo.com
  const filteredRaffles = raffles.filter(r =>
    r.organizations?.email !== 'demo1@sortavo.com'
  );

  console.log('Excluyendo demo1@sortavo.com:\n');

  if (filteredRaffles.length === 0) {
    console.log('❌ No hay sorteos activos de otras organizaciones');
    console.log('\nTodos los sorteos activos:');
    raffles.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   Slug: ${r.slug}`);
      console.log(`   Boletos: ${r.total_tickets}`);
      console.log(`   Org: ${r.organizations?.email || 'N/A'}`);
      console.log(`   ID: ${r.id}\n`);
    });
  } else {
    filteredRaffles.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   Slug: ${r.slug}`);
      console.log(`   Boletos: ${r.total_tickets}`);
      console.log(`   Org: ${r.organizations?.email || 'N/A'}`);
      console.log(`   ID: ${r.id}\n`);
    });

    console.log('\n🎯 IDs para usar:');
    console.log(filteredRaffles.map(r => r.id).join(','));
  }

  // Count available tickets
  for (const raffle of filteredRaffles.slice(0, 3)) {
    const { count } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('raffle_id', raffle.id)
      .eq('status', 'available');

    console.log(`\n📊 ${raffle.title}: ${count || 0} boletos disponibles`);
  }
}

main().catch(console.error);
