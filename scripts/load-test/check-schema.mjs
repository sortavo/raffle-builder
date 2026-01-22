const SUPABASE_URL = 'https://xnwqrgumstikdmsxtame.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud3FyZ3Vtc3Rpa2Rtc3h0YW1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwNzAwMiwiZXhwIjoyMDgzNDgzMDAyfQ.UVkrKcq8blnikKhMhZOXyyCN7MdFUcUty60Hg0c3Dfs';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

async function main() {
  // Check OpenAPI spec
  console.log('Fetching OpenAPI spec...\n');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
  const spec = await res.json();

  console.log('Available paths:');
  if (spec.paths) {
    Object.keys(spec.paths).forEach(path => {
      console.log(`  ${path}`);
    });
  }

  if (spec.definitions) {
    console.log('\nAvailable tables/definitions:');
    Object.keys(spec.definitions).forEach(def => {
      console.log(`  ${def}`);
    });
  }

  // Try to access raffles
  console.log('\n\nTrying to access raffles...');
  const rafflesRes = await fetch(`${SUPABASE_URL}/rest/v1/raffles?select=id,title&limit=1`, { headers });
  console.log('Raffles status:', rafflesRes.status);
  if (rafflesRes.ok) {
    console.log('Raffles data:', await rafflesRes.json());
  }

  // Try to access tickets
  console.log('\nTrying to access tickets...');
  const ticketsRes = await fetch(`${SUPABASE_URL}/rest/v1/tickets?limit=1`, { headers });
  console.log('Tickets status:', ticketsRes.status);
  console.log('Tickets response:', await ticketsRes.text());

  // Try with RPC
  console.log('\n\nTrying SQL via RPC...');
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, { headers });
  console.log('RPC status:', rpcRes.status);
}

main().catch(console.error);
