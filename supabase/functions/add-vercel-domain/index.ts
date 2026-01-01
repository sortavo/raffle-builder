import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Domain validation regex (RFC 1035 compliant)
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const MAX_DOMAIN_LENGTH = 253;

function validateDomain(domain: string): { valid: boolean; error?: string } {
  if (!domain || typeof domain !== 'string') {
    return { valid: false, error: 'Domain is required and must be a string' };
  }
  
  const normalized = domain.toLowerCase().trim();
  
  if (normalized.length === 0) {
    return { valid: false, error: 'Domain cannot be empty' };
  }
  
  if (normalized.length > MAX_DOMAIN_LENGTH) {
    return { valid: false, error: `Domain exceeds maximum length of ${MAX_DOMAIN_LENGTH} characters` };
  }
  
  if (!DOMAIN_REGEX.test(normalized)) {
    return { valid: false, error: 'Invalid domain format. Example: mydomain.com' };
  }
  
  // Block potential injection attempts
  if (normalized.includes('..') || normalized.includes('//') || normalized.includes('\\')) {
    return { valid: false, error: 'Invalid characters in domain' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Rate limiting: 5 domain additions per minute per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, { 
      ...RATE_LIMITS.STRICT, 
      maxRequests: 5,
      keyPrefix: 'add-domain' 
    });
    
    if (!rateLimitResult.allowed) {
      console.warn(`[add-vercel-domain] Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { domain } = await req.json()
    
    // Validate domain format
    const validation = validateDomain(domain);
    if (!validation.valid) {
      console.error('[add-vercel-domain] Domain validation failed:', validation.error);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
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
    console.log(`[add-vercel-domain] Adding domain: ${normalizedDomain} to project: ${VERCEL_PROJECT_ID}${VERCEL_TEAM_ID ? ` (team: ${VERCEL_TEAM_ID})` : ''}`)

    // Call Vercel API
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: normalizedDomain }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[add-vercel-domain] Vercel API error:', data)
      
      const errorMessage = data.error?.message || 'Error al registrar dominio en Vercel';
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          statusCode: response.status
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[add-vercel-domain] Successfully added domain: ${normalizedDomain}`, data)

    return new Response(
      JSON.stringify({ success: true, vercelDomain: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[add-vercel-domain] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
