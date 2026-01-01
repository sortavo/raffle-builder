import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DomainCheckResult {
  domain: string
  status: 'online' | 'slow' | 'offline' | 'error'
  latency: number | null
  statusCode: number | null
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { domains } = await req.json()

    if (!domains || !Array.isArray(domains)) {
      return new Response(
        JSON.stringify({ success: false, error: 'domains array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[check-domains] Checking ${domains.length} domains`)

    const results: DomainCheckResult[] = await Promise.all(
      domains.map(async (domain: string): Promise<DomainCheckResult> => {
        const start = Date.now()
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)

          const response = await fetch(`https://${domain}`, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
          })

          clearTimeout(timeoutId)
          const latency = Date.now() - start

          console.log(`[check-domains] ${domain}: ${response.status} in ${latency}ms`)

          if (response.ok || response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
            return {
              domain,
              status: latency < 2000 ? 'online' : 'slow',
              latency,
              statusCode: response.status,
            }
          }

          return {
            domain,
            status: 'error',
            latency,
            statusCode: response.status,
            error: `HTTP ${response.status}`,
          }
        } catch (error: unknown) {
          const latency = Date.now() - start
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[check-domains] ${domain}: ${errorMessage}`)

          return {
            domain,
            status: 'offline',
            latency: latency < 10000 ? latency : null,
            statusCode: null,
            error: errorMessage,
          }
        }
      })
    )

    const online = results.filter(r => r.status === 'online').length
    const slow = results.filter(r => r.status === 'slow').length
    const offline = results.filter(r => r.status === 'offline' || r.status === 'error').length

    console.log(`[check-domains] Results: ${online} online, ${slow} slow, ${offline} offline/error`)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: { online, slow, offline, total: results.length },
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[check-domains] Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
