import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "../_shared/rate-limiter.ts";
import { VERCEL_IPS, VERCEL_CNAMES, validateDomain } from "../_shared/vercel-config.ts";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";

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
    return handleCorsPrelight(req);
  }

  if (req.method !== 'POST') {
    return corsJsonResponse(req, { error: 'Method not allowed' }, 405);
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
      return corsJsonResponse(req, { 
        error: 'Too many requests. Please try again later.' 
      }, 429);
    }

    const { domain } = await req.json();

    // Validate domain format
    const validation = validateDomain(domain);
    if (!validation.valid) {
      return corsJsonResponse(req, { error: validation.error }, 400);
    }

    const normalizedDomain = validation.normalizedDomain!;
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

    return corsJsonResponse(req, result);

  } catch (error) {
    console.error('[verify-dns] Error:', error);
    
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    
    return corsJsonResponse(req, { 
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
    }, isTimeout ? 504 : 500);
  }
});