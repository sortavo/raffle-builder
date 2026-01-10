import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { verifyPlatformAdmin } from "../_shared/admin-auth.ts";

type CustomDomainRow = {
  id: string;
  domain: string;
  organization_id: string;
  verified: boolean;
  ssl_status: string | null;
  is_primary: boolean;
  organizations?: {
    name: string;
    slug: string | null;
    subscription_tier: string | null;
    email: string;
  } | {
    name: string;
    slug: string | null;
    subscription_tier: string | null;
    email: string;
  }[] | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    const auth = await verifyPlatformAdmin(req);

    if (!auth.authenticated) {
      return corsJsonResponse(req, { success: false, error: "Authentication required" }, 401);
    }

    if (!auth.isPlatformAdmin) {
      return corsJsonResponse(req, { success: false, error: "Platform admin access required" }, 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return corsJsonResponse(req, { success: false, error: "Server misconfigured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("custom_domains")
      .select(
        "id, domain, organization_id, verified, ssl_status, is_primary, organizations(name, slug, subscription_tier, email)"
      )
      .order("domain");

    if (error) {
      return corsJsonResponse(req, { success: false, error: error.message }, 500);
    }

    const domains = ((data ?? []) as CustomDomainRow[]).map((d) => {
      const org = Array.isArray(d.organizations)
        ? d.organizations[0]
        : d.organizations ?? null;

      return {
        id: d.id,
        domain: d.domain,
        organization_id: d.organization_id,
        verified: d.verified,
        ssl_status: d.ssl_status,
        is_primary: d.is_primary,
        organization_name: org?.name,
        organization_slug: org?.slug,
        subscription_tier: org?.subscription_tier,
        organization_email: org?.email,
      };
    });

    return corsJsonResponse(req, { success: true, domains }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return corsJsonResponse(req, { success: false, error: message }, 500);
  }
});
