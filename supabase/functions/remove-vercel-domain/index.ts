import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { domain } = await req.json()
    
    if (!domain) {
      throw new Error('Domain is required')
    }

    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN')
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID')
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID')

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      console.error('Missing Vercel credentials')
      throw new Error('Vercel credentials not configured')
    }

    const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
    console.log(`[remove-vercel-domain] Removing domain: ${domain} from project: ${VERCEL_PROJECT_ID}${VERCEL_TEAM_ID ? ` (team: ${VERCEL_TEAM_ID})` : ''}`)

    // Call Vercel API
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}${teamQuery}`,
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

    console.log(`[remove-vercel-domain] Successfully removed domain: ${domain}`)

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
