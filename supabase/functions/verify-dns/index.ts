import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERCEL_IPS = [
  '76.76.21.21',
  '76.76.21.164',
  '76.76.21.241'
];

const VERCEL_CNAMES = [
  'cname.vercel-dns.com',
  'cname-china.vercel-dns.com'
];

interface DNSVerificationResult {
  verified: boolean;
  domain: string;
  diagnostic: {
    aRecords: string[];
    cnameRecords: string[];
    pointsToVercel: boolean;
    currentTarget: string | null;
    expectedTarget: string;
    recordsFound: number;
    propagationComplete: boolean;
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedDomain = domain.toLowerCase().trim();
    console.log(`[verify-dns] Checking domain: ${normalizedDomain}`);

    // Query Google DNS API for A records
    const aRecordResponse = await fetch(
      `https://dns.google/resolve?name=${normalizedDomain}&type=A`,
      { headers: { 'Accept': 'application/dns-json' } }
    );

    let aRecords: string[] = [];
    if (aRecordResponse.ok) {
      const aData = await aRecordResponse.json();
      aRecords = aData.Answer?.filter((a: any) => a.type === 1).map((a: any) => a.data) || [];
      console.log(`[verify-dns] A records found: ${JSON.stringify(aRecords)}`);
    }

    // Query Google DNS API for CNAME records
    const cnameResponse = await fetch(
      `https://dns.google/resolve?name=${normalizedDomain}&type=CNAME`,
      { headers: { 'Accept': 'application/dns-json' } }
    );

    let cnameRecords: string[] = [];
    if (cnameResponse.ok) {
      const cnameData = await cnameResponse.json();
      cnameRecords = cnameData.Answer?.filter((c: any) => c.type === 5).map((c: any) => c.data.replace(/\.$/, '')) || [];
      console.log(`[verify-dns] CNAME records found: ${JSON.stringify(cnameRecords)}`);
    }

    // Check if domain points to Vercel
    const aRecordPointsToVercel = aRecords.some((ip: string) => VERCEL_IPS.includes(ip));
    const cnamePointsToVercel = cnameRecords.some((cname: string) => 
      VERCEL_CNAMES.some(vc => cname.toLowerCase().includes(vc.toLowerCase()))
    );
    const pointsToVercel = aRecordPointsToVercel || cnamePointsToVercel;

    const result: DNSVerificationResult = {
      verified: pointsToVercel,
      domain: normalizedDomain,
      diagnostic: {
        aRecords,
        cnameRecords,
        pointsToVercel,
        currentTarget: aRecords[0] || cnameRecords[0] || null,
        expectedTarget: '76.76.21.21 o cname.vercel-dns.com',
        recordsFound: aRecords.length + cnameRecords.length,
        propagationComplete: aRecords.length > 0 || cnameRecords.length > 0
      }
    };

    console.log(`[verify-dns] Result for ${normalizedDomain}: verified=${result.verified}`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[verify-dns] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        diagnostic: {
          aRecords: [],
          cnameRecords: [],
          pointsToVercel: false,
          currentTarget: null,
          expectedTarget: '76.76.21.21 o cname.vercel-dns.com',
          recordsFound: 0,
          propagationComplete: false
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
