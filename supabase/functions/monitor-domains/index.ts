import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { verifyPlatformAdmin, isCronRequest } from "../_shared/admin-auth.ts";
import { VERCEL_IPS, VERCEL_CNAMES } from "../_shared/vercel-config.ts";

interface DomainStatus {
  domain: string;
  organization_id: string;
  previouslyVerified: boolean;
  currentlyPointsToVercel: boolean;
  aRecords: string[];
  cnameRecords: string[];
  statusChanged: boolean;
  newStatus: 'online' | 'offline' | 'error';
}

interface MonitorResult {
  checked: number;
  online: number;
  offline: number;
  errors: number;
  statusChanges: DomainStatus[];
}

async function checkDNS(domain: string): Promise<{ 
  pointsToVercel: boolean; 
  aRecords: string[]; 
  cnameRecords: string[] 
}> {
  try {
    // Query Google DNS for A records
    const aResponse = await fetch(
      `https://dns.google/resolve?name=${domain}&type=A`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    const aData = await aResponse.json();
    const aRecords = (aData.Answer || [])
      .filter((r: any) => r.type === 1)
      .map((r: any) => r.data);

    // Query Google DNS for CNAME records
    const cnameResponse = await fetch(
      `https://dns.google/resolve?name=${domain}&type=CNAME`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    const cnameData = await cnameResponse.json();
    const cnameRecords = (cnameData.Answer || [])
      .filter((r: any) => r.type === 5)
      .map((r: any) => r.data.replace(/\.$/, ''));

    // Check if points to Vercel using centralized config
    const hasVercelIP = aRecords.some((ip: string) => VERCEL_IPS.includes(ip));
    const hasVercelCNAME = cnameRecords.some((cname: string) => 
      VERCEL_CNAMES.some(vc => cname.toLowerCase().includes(vc))
    );

    return {
      pointsToVercel: hasVercelIP || hasVercelCNAME,
      aRecords,
      cnameRecords
    };
  } catch (error) {
    console.error(`[monitor-domains] DNS check failed for ${domain}:`, error);
    return { pointsToVercel: false, aRecords: [], cnameRecords: [] };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  try {
    // ==========================================
    // AUTHENTICATION: Allow cron jobs or platform admins
    // ==========================================
    const isCron = isCronRequest(req);
    
    if (!isCron) {
      const authResult = await verifyPlatformAdmin(req);
      
      if (!authResult.authenticated) {
        console.warn('[monitor-domains] Unauthenticated request rejected');
        return corsJsonResponse(req, { success: false, error: 'Authentication required' }, 401);
      }
      
      if (!authResult.isPlatformAdmin) {
        console.warn(`[monitor-domains] Non-admin user rejected: ${authResult.userId}`);
        return corsJsonResponse(req, { success: false, error: 'Platform admin access required' }, 403);
      }
      
      console.log(`[monitor-domains] Authenticated admin: ${authResult.userId}`);
    } else {
      console.log('[monitor-domains] Cron job invocation');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return corsJsonResponse(req, { success: false, error: 'Missing Supabase configuration' }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('[monitor-domains] Starting DNS monitoring...');

    // Get all verified domains from database
    const { data: domains, error: dbError } = await supabase
      .from('custom_domains')
      .select('id, domain, organization_id, verified, ssl_status')
      .eq('verified', true);

    if (dbError) {
      console.error(`[monitor-domains] Database error: ${dbError.message}`);
      return corsJsonResponse(req, { success: false, error: 'Failed to fetch domains' }, 500);
    }

    if (!domains || domains.length === 0) {
      console.log('[monitor-domains] No verified domains to monitor');
      return corsJsonResponse(req, { 
        success: true, 
        result: { checked: 0, online: 0, offline: 0, errors: 0, statusChanges: [] } 
      });
    }

    console.log(`[monitor-domains] Checking ${domains.length} verified domains...`);

    const result: MonitorResult = {
      checked: domains.length,
      online: 0,
      offline: 0,
      errors: 0,
      statusChanges: []
    };

    // Check each domain
    for (const domain of domains) {
      try {
        const dnsResult = await checkDNS(domain.domain);
        
        const status: DomainStatus = {
          domain: domain.domain,
          organization_id: domain.organization_id,
          previouslyVerified: domain.verified,
          currentlyPointsToVercel: dnsResult.pointsToVercel,
          aRecords: dnsResult.aRecords,
          cnameRecords: dnsResult.cnameRecords,
          statusChanged: false,
          newStatus: dnsResult.pointsToVercel ? 'online' : 'offline'
        };

        if (dnsResult.pointsToVercel) {
          result.online++;
        } else {
          result.offline++;
          status.statusChanged = true;

          // Update domain as unverified since DNS changed
          const { error: updateError } = await supabase
            .from('custom_domains')
            .update({ 
              verified: false, 
              ssl_status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', domain.id);

          if (updateError) {
            console.error(`[monitor-domains] Failed to update ${domain.domain}: ${updateError.message}`);
          } else {
            console.log(`[monitor-domains] Marked ${domain.domain} as offline (DNS changed)`);
            
            // Create notification for organization owner
            const { data: orgUsers } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('organization_id', domain.organization_id)
              .eq('role', 'owner');

            if (orgUsers && orgUsers.length > 0) {
              for (const user of orgUsers) {
                await supabase.from('notifications').insert({
                  user_id: user.user_id,
                  organization_id: domain.organization_id,
                  type: 'domain_offline',
                  title: 'Dominio Offline',
                  message: `El dominio ${domain.domain} ya no apunta a nuestros servidores. Por favor, verifica la configuración DNS.`,
                  link: '/dashboard/settings?tab=domains'
                });
              }
            }
          }

          result.statusChanges.push(status);
        }
      } catch (error) {
        console.error(`[monitor-domains] Error checking ${domain.domain}:`, error);
        result.errors++;
      }

      // Small delay between checks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[monitor-domains] Complete. Online: ${result.online}, Offline: ${result.offline}, Errors: ${result.errors}`);

    return corsJsonResponse(req, { success: true, result });

  } catch (error) {
    console.error('[monitor-domains] Unexpected error:', error);
    return corsJsonResponse(req, { success: false, error: 'Internal server error' }, 500);
  }
});
