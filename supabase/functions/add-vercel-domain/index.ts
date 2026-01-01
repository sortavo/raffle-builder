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
    console.log(`[add-vercel-domain] Adding domain: ${domain} to project: ${VERCEL_PROJECT_ID}${VERCEL_TEAM_ID ? ` (team: ${VERCEL_TEAM_ID})` : ''}`)

    // Call Vercel API
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
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

    console.log(`[add-vercel-domain] Successfully added domain: ${domain}`, data)

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
