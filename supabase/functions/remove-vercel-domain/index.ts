import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Domain validation regex
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  const normalized = domain.toLowerCase().trim();
  return normalized.length > 0 && normalized.length <= 253 && DOMAIN_REGEX.test(normalized);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting: 5 domain removals per minute per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, { 
      ...RATE_LIMITS.STRICT, 
      maxRequests: 5,
      keyPrefix: 'remove-domain' 
    });
    
    if (!rateLimitResult.allowed) {
      console.warn(`[remove-vercel-domain] Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { domain } = await req.json()
    
    if (!domain) {
      throw new Error('Domain is required')
    }
    
    // Validate domain format
    if (!isValidDomain(domain)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid domain format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const normalizedDomain = domain.toLowerCase().trim();

    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN')
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID')
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID')

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      console.error('Missing Vercel credentials')
      throw new Error('Vercel credentials not configured')
    }

    const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
    console.log(`[remove-vercel-domain] Removing domain: ${normalizedDomain} from project: ${VERCEL_PROJECT_ID}${VERCEL_TEAM_ID ? ` (team: ${VERCEL_TEAM_ID})` : ''}`)

    // Call Vercel API
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(normalizedDomain)}${teamQuery}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        },
      }
    )

    // 404 means domain doesn't exist in Vercel - that's OK, we can still delete from DB
    if (!response.ok && response.status !== 404) {
      const data = await response.json()
      console.error('[remove-vercel-domain] Vercel API error:', data)
      throw new Error(data.error?.message || 'Error al eliminar dominio de Vercel')
    }

    console.log(`[remove-vercel-domain] Successfully removed domain: ${normalizedDomain}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[remove-vercel-domain] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
