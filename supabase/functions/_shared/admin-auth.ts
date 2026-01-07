// Shared authentication helper for admin-only Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AdminAuthResult {
  authenticated: boolean;
  isPlatformAdmin: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verifies if the request is from an authenticated platform admin.
 * Used for administrative Edge Functions like sync-domains, monitor-domains, etc.
 */
export async function verifyPlatformAdmin(
  request: Request
): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('Authorization');
  
  // Allow cron jobs with service role key
  const isServiceCall = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
  if (isServiceCall) {
    return { authenticated: true, isPlatformAdmin: true, userId: 'service-role' };
  }
  
  if (!authHeader) {
    return { authenticated: false, isPlatformAdmin: false, error: 'No authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Create client with user's JWT to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      return { authenticated: false, isPlatformAdmin: false, error: 'Invalid token' };
    }

    // Create service client to check platform_admins table
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminRecord, error: adminError } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminRecord) {
      return { 
        authenticated: true, 
        isPlatformAdmin: false, 
        userId: user.id,
        error: 'User is not a platform admin' 
      };
    }

    return { authenticated: true, isPlatformAdmin: true, userId: user.id };
  } catch (error) {
    console.error('[admin-auth] Error:', error);
    return { authenticated: false, isPlatformAdmin: false, error: 'Authentication failed' };
  }
}

/**
 * Helper to check if request is from a cron job (scheduled invocation)
 */
export function isCronRequest(request: Request): boolean {
  // Supabase cron jobs use Authorization header with service role key
  const authHeader = request.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!authHeader || !serviceKey) return false;
  
  return authHeader.includes(serviceKey);
}
