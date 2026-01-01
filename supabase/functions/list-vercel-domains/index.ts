import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN')
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID')
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID')

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      console.error('[list-vercel-domains] Missing Vercel credentials')
      throw new Error('Vercel credentials not configured')
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: (data as any).error?.message || 'Error fetching domains from Vercel',
          statusCode: response.status
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[list-vercel-domains] Found ${data.domains?.length || 0} domains:`, data.domains?.map(d => d.name))

    return new Response(
      JSON.stringify({ 
        success: true, 
        domains: data.domains || [],
        count: data.domains?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[list-vercel-domains] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
