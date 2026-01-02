import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2"
import { checkRateLimit, getClientIP, RATE_LIMITS } from "../_shared/rate-limiter.ts"
import { validateDomain, getDomainLimit, canHaveCustomDomains } from "../_shared/vercel-config.ts"
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
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
      console.error('[add-vercel-domain] Auth error:', authError?.message);
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
      console.error('[add-vercel-domain] Profile error:', profileError?.message);
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
      console.error('[add-vercel-domain] Role check failed:', roleError?.message);
      return corsJsonResponse(req, { success: false, error: 'Admin access required' }, 403);
    }

    // ==========================================
    // SUBSCRIPTION TIER VALIDATION
    // ==========================================
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('[add-vercel-domain] Org error:', orgError?.message);
      return corsJsonResponse(req, { success: false, error: 'Organization not found' }, 404);
    }

    const tier = organization.subscription_tier || 'basic';
    if (!canHaveCustomDomains(tier)) {
      return corsJsonResponse(req, { success: false, error: 'Custom domains require Pro plan or higher' }, 403);
    }

    // ==========================================
    // DOMAIN LIMIT VALIDATION
    // ==========================================
    const domainLimit = getDomainLimit(tier);
    const { count: currentDomainCount, error: countError } = await supabase
      .from('custom_domains')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (countError) {
      console.error('[add-vercel-domain] Count error:', countError.message);
      return corsJsonResponse(req, { success: false, error: 'Failed to check domain limit' }, 500);
    }

    if ((currentDomainCount || 0) >= domainLimit) {
      return corsJsonResponse(req, { 
        success: false, 
        error: `Domain limit reached. Your ${tier} plan allows ${domainLimit} custom domains.` 
      }, 403);
    }

    // ==========================================
    // DOMAIN VALIDATION
    // ==========================================
    const { domain } = await req.json();
    const validation = validateDomain(domain);
    
    if (!validation.valid) {
      console.error('[add-vercel-domain] Domain validation failed:', validation.error);
      return corsJsonResponse(req, { success: false, error: validation.error }, 400);
    }

    const normalizedDomain = validation.normalizedDomain!;
    console.log(`[add-vercel-domain] Adding domain: ${normalizedDomain} for org: ${organizationId}, tier: ${tier}`);

    // ==========================================
    // VERCEL API CALL
    // ==========================================
    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID');
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      console.error('[add-vercel-domain] Missing Vercel credentials');
      return corsJsonResponse(req, { success: false, error: 'Server configuration error' }, 500);
    }

    const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: normalizedDomain }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        console.error('[add-vercel-domain] Vercel API error:', data);
        
        // Handle specific Vercel errors
        if (response.status === 409) {
          return corsJsonResponse(req, { success: false, error: 'Domain already exists in Vercel' }, 409);
        }
        
        const errorMessage = data.error?.message || 'Failed to add domain to Vercel';
        return corsJsonResponse(req, { success: false, error: errorMessage }, 400);
      }

      console.log(`[add-vercel-domain] Successfully added domain: ${normalizedDomain}`);

      return corsJsonResponse(req, { 
        success: true, 
        vercelDomain: data,
        warning: validation.warning 
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[add-vercel-domain] Vercel API timeout');
        return corsJsonResponse(req, { success: false, error: 'Vercel API timeout. Please try again.' }, 504);
      }
      throw fetchError;
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[add-vercel-domain] Error:', errorMessage);
    return corsJsonResponse(req, { success: false, error: 'An unexpected error occurred' }, 500);
  }
})