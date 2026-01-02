import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { verifyPlatformAdmin, isCronRequest } from "../_shared/admin-auth.ts";

interface VercelDomain {
  name: string
  apexName: string
  verified: boolean
  gitBranch?: string | null
  redirect?: string | null
  redirectStatusCode?: number | null
  createdAt?: number
  updatedAt?: number
}

interface VercelDomainsResponse {
  domains: VercelDomain[]
  pagination?: {
    count: number
    next: number | null
    prev: number | null
  }
}

serve(async (req) => {
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
        console.warn('[list-vercel-domains] Unauthenticated request rejected');
        return corsJsonResponse(req, { success: false, error: 'Authentication required' }, 401);
      }
      
      if (!authResult.isPlatformAdmin) {
        console.warn(`[list-vercel-domains] Non-admin user rejected: ${authResult.userId}`);
        return corsJsonResponse(req, { success: false, error: 'Platform admin access required' }, 403);
      }
      
      console.log(`[list-vercel-domains] Authenticated admin: ${authResult.userId}`);
    } else {
      console.log('[list-vercel-domains] Cron job invocation');
    }

    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN')
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID')
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID')

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      console.error('[list-vercel-domains] Missing Vercel credentials')
      return corsJsonResponse(req, { success: false, error: 'Vercel credentials not configured' }, 500);
    }

    const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
    console.log(`[list-vercel-domains] Fetching domains for project: ${VERCEL_PROJECT_ID}${VERCEL_TEAM_ID ? ` (team: ${VERCEL_TEAM_ID})` : ''}`)

    const response = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data: VercelDomainsResponse = await response.json()

    if (!response.ok) {
      console.error('[list-vercel-domains] Vercel API error:', data)
      return corsJsonResponse(req, { 
        success: false, 
        error: (data as any).error?.message || 'Error fetching domains from Vercel',
        statusCode: response.status
      }, 400);
    }

    console.log(`[list-vercel-domains] Found ${data.domains?.length || 0} domains:`, data.domains?.map(d => d.name))

    return corsJsonResponse(req, { 
      success: true, 
      domains: data.domains || [],
      count: data.domains?.length || 0
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[list-vercel-domains] Error:', errorMessage)
    return corsJsonResponse(req, { success: false, error: errorMessage }, 400);
  }
})
