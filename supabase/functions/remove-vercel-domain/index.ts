import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2"
import { checkRateLimit, getClientIP, RATE_LIMITS } from "../_shared/rate-limiter.ts"
import { validateDomain } from "../_shared/vercel-config.ts"
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
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
      return corsJsonResponse(req, { 
        success: false, 
        error: 'Too many requests. Please try again later.' 
      }, 429);
    }

    // ==========================================
    // AUTHENTICATION: Verify JWT and get user
    // ==========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsJsonResponse(req, { success: false, error: 'Authentication required' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's JWT to get their identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[remove-vercel-domain] Auth error:', authError?.message);
      return corsJsonResponse(req, { success: false, error: 'Invalid authentication token' }, 401);
    }

    // Create service client for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ==========================================
    // AUTHORIZATION: Verify user is org admin
    // ==========================================
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('[remove-vercel-domain] Profile error:', profileError?.message);
      return corsJsonResponse(req, { success: false, error: 'User organization not found' }, 403);
    }

    const organizationId = profile.organization_id;

    // Verify user is admin of this organization
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (roleError || !userRole || !['owner', 'admin'].includes(userRole.role)) {
      console.error('[remove-vercel-domain] Role check failed:', roleError?.message);
      return corsJsonResponse(req, { success: false, error: 'Admin access required' }, 403);
    }

    // ==========================================
    // DOMAIN VALIDATION
    // ==========================================
    const { domain } = await req.json();
    
    if (!domain) {
      return corsJsonResponse(req, { success: false, error: 'Domain is required' }, 400);
    }
    
    const validation = validateDomain(domain);
    if (!validation.valid) {
      return corsJsonResponse(req, { success: false, error: validation.error }, 400);
    }

    const normalizedDomain = validation.normalizedDomain!;

    // ==========================================
    // OWNERSHIP VALIDATION: Verify domain belongs to user's org
    // ==========================================
    const { data: domainRecord, error: domainError } = await supabase
      .from('custom_domains')
      .select('id, organization_id')
      .eq('domain', normalizedDomain)
      .single();

    if (domainError || !domainRecord) {
      // Domain not in our DB - still try to remove from Vercel (cleanup)
      console.log(`[remove-vercel-domain] Domain ${normalizedDomain} not in DB, attempting Vercel cleanup`);
    } else if (domainRecord.organization_id !== organizationId) {
      // Domain belongs to another organization - BLOCK
      console.error(`[remove-vercel-domain] Unauthorized: domain belongs to different org`);
      return corsJsonResponse(req, { success: false, error: 'Domain not found' }, 404);
    }

    console.log(`[remove-vercel-domain] Removing domain: ${normalizedDomain} for org: ${organizationId}`);

    // ==========================================
    // VERCEL API CALL
    // ==========================================
    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID');
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      console.error('[remove-vercel-domain] Missing Vercel credentials');
      return corsJsonResponse(req, { success: false, error: 'Server configuration error' }, 500);
    }

    const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(normalizedDomain)}${teamQuery}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      // 404 means domain doesn't exist in Vercel - that's OK, we can still delete from DB
      if (!response.ok && response.status !== 404) {
        const data = await response.json();
        console.error('[remove-vercel-domain] Vercel API error:', data);
        return corsJsonResponse(req, { success: false, error: 'Failed to remove domain from Vercel' }, 400);
      }

      console.log(`[remove-vercel-domain] Successfully removed domain: ${normalizedDomain}`);

      return corsJsonResponse(req, { success: true });

    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[remove-vercel-domain] Vercel API timeout');
        return corsJsonResponse(req, { success: false, error: 'Vercel API timeout. Please try again.' }, 504);
      }
      throw fetchError;
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[remove-vercel-domain] Error:', errorMessage);
    return corsJsonResponse(req, { success: false, error: 'An unexpected error occurred' }, 500);
  }
})