import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VercelDomain {
  name: string;
  verified: boolean;
}

interface SyncResult {
  orphanedInVercel: string[];
  orphanedInDatabase: string[];
  synced: number;
  cleaned: {
    vercel: number;
    database: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID');
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Vercel configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body for options
    let dryRun = true; // Default to dry run for safety
    try {
      const body = await req.json();
      dryRun = body.dryRun !== false;
    } catch {
      // No body, use defaults
    }

    console.log(`[sync-domains] Starting sync (dryRun: ${dryRun})`);

    // 1. Get all domains from Vercel
    const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
    const vercelResponse = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`,
      {
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!vercelResponse.ok) {
      const error = await vercelResponse.text();
      console.error(`[sync-domains] Vercel API error: ${error}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch Vercel domains' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vercelData = await vercelResponse.json();
    const vercelDomains: string[] = (vercelData.domains || [])
      .map((d: VercelDomain) => d.name.toLowerCase())
      .filter((name: string) => !name.includes('*') && !name.endsWith('.vercel.app'));

    console.log(`[sync-domains] Found ${vercelDomains.length} custom domains in Vercel`);

    // 2. Get all domains from database
    const { data: dbDomains, error: dbError } = await supabase
      .from('custom_domains')
      .select('id, domain, organization_id');

    if (dbError) {
      console.error(`[sync-domains] Database error: ${dbError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch database domains' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dbDomainNames = (dbDomains || []).map(d => d.domain.toLowerCase());

    console.log(`[sync-domains] Found ${dbDomainNames.length} domains in database`);

    // 3. Find orphaned domains
    // Domains in Vercel but not in database
    const orphanedInVercel = vercelDomains.filter(
      (domain: string) => !dbDomainNames.includes(domain)
    );

    // Domains in database but not in Vercel
    const orphanedInDatabase = dbDomainNames.filter(
      (domain: string) => !vercelDomains.includes(domain)
    );

    console.log(`[sync-domains] Orphaned in Vercel: ${orphanedInVercel.length}`);
    console.log(`[sync-domains] Orphaned in Database: ${orphanedInDatabase.length}`);

    const result: SyncResult = {
      orphanedInVercel,
      orphanedInDatabase,
      synced: vercelDomains.length,
      cleaned: { vercel: 0, database: 0 }
    };

    // 4. Clean up orphaned domains (if not dry run)
    if (!dryRun) {
      // Remove orphaned domains from Vercel
      for (const domain of orphanedInVercel) {
        try {
          const deleteResponse = await fetch(
            `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${teamQuery}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
              },
            }
          );
          
          if (deleteResponse.ok) {
            console.log(`[sync-domains] Removed orphaned domain from Vercel: ${domain}`);
            result.cleaned.vercel++;
          } else {
            console.error(`[sync-domains] Failed to remove ${domain} from Vercel`);
          }
        } catch (err) {
          console.error(`[sync-domains] Error removing ${domain} from Vercel:`, err);
        }
      }

      // Remove orphaned domains from database
      for (const domain of orphanedInDatabase) {
        const dbDomain = (dbDomains || []).find(d => d.domain.toLowerCase() === domain);
        if (dbDomain) {
          const { error } = await supabase
            .from('custom_domains')
            .delete()
            .eq('id', dbDomain.id);

          if (!error) {
            console.log(`[sync-domains] Removed orphaned domain from database: ${domain}`);
            result.cleaned.database++;
          } else {
            console.error(`[sync-domains] Failed to remove ${domain} from database: ${error.message}`);
          }
        }
      }
    }

    console.log(`[sync-domains] Sync complete. Cleaned: ${result.cleaned.vercel} Vercel, ${result.cleaned.database} database`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dryRun,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-domains] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
