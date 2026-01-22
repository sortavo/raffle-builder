import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const RAFFLE_IDS = [
  '0f1ea80d-d9c7-4c0e-8e73-bcf18f195f64', // Casa de Playa
  '47593ad2-ade6-47c5-a9ec-7517922d18a8', // Ferrari
  'e5248331-e05e-4870-af20-9c004fffb255', // Harley
];

async function main() {
  for (const raffleId of RAFFLE_IDS) {
    // Get raffle info
    const { data: raffle } = await supabase
      .from('raffles')
      .select('title, total_tickets')
      .eq('id', raffleId)
      .single();

    // Count total tickets
    const { count: totalTickets } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('raffle_id', raffleId);

    // Count by status
    const { data: statusCounts } = await supabase
      .from('tickets')
      .select('status')
      .eq('raffle_id', raffleId);

    const statuses = {};
    statusCounts?.forEach(t => {
      statuses[t.status] = (statuses[t.status] || 0) + 1;
    });

    console.log(`\n📋 ${raffle?.title}`);
    console.log(`   Total en raffle: ${raffle?.total_tickets}`);
    console.log(`   Total en tickets table: ${totalTickets || 0}`);
    console.log(`   Por status:`, statuses);
  }
}

main().catch(console.error);
