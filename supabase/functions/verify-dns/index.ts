import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIP, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Updated Vercel IPs (as of 2024) - https://vercel.com/docs/projects/domains
const VERCEL_IPS = [
  '76.76.21.21',
  '76.76.21.164',
  '76.76.21.241',
  '76.76.21.98',
  '76.76.21.142',
  '76.76.21.9',
  '76.76.21.61',
  '76.76.21.123'
];

const VERCEL_CNAMES = [
  'cname.vercel-dns.com',
  'cname-china.vercel-dns.com',
  'alias.vercel.com'
];

// Domain validation regex
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  const normalized = domain.toLowerCase().trim();
  return normalized.length > 0 && normalized.length <= 253 && DOMAIN_REGEX.test(normalized);
}

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
    // Rate limiting: 20 DNS verifications per minute per IP (more relaxed for checking)
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, { 
      ...RATE_LIMITS.STANDARD, 
      maxRequests: 20,
      keyPrefix: 'verify-dns' 
    });
    
    if (!rateLimitResult.allowed) {
      console.warn(`[verify-dns] Rate limit exceeded for IP: ${clientIP}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { domain } = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate domain format
    if (!isValidDomain(domain)) {
      return new Response(
        JSON.stringify({ error: 'Invalid domain format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedDomain = domain.toLowerCase().trim();
    console.log(`[verify-dns] Checking domain: ${normalizedDomain}`);

    // Query Google DNS API for A records with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let aRecords: string[] = [];
    let cnameRecords: string[] = [];

    try {
      const aRecordResponse = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(normalizedDomain)}&type=A`,
        { 
          headers: { 'Accept': 'application/dns-json' },
          signal: controller.signal
        }
      );

      if (aRecordResponse.ok) {
        const aData = await aRecordResponse.json();
        aRecords = aData.Answer?.filter((a: any) => a.type === 1).map((a: any) => a.data) || [];
        console.log(`[verify-dns] A records found: ${JSON.stringify(aRecords)}`);
      }

      // Query Google DNS API for CNAME records
      const cnameResponse = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(normalizedDomain)}&type=CNAME`,
        { 
          headers: { 'Accept': 'application/dns-json' },
          signal: controller.signal
        }
      );

      if (cnameResponse.ok) {
        const cnameData = await cnameResponse.json();
        cnameRecords = cnameData.Answer?.filter((c: any) => c.type === 5).map((c: any) => c.data.replace(/\.$/, '')) || [];
        console.log(`[verify-dns] CNAME records found: ${JSON.stringify(cnameRecords)}`);
      }
    } finally {
      clearTimeout(timeoutId);
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
    
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: isTimeout ? 'DNS lookup timeout' : (error instanceof Error ? error.message : 'Unknown error'),
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
        status: isTimeout ? 504 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
