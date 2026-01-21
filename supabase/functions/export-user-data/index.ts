/**
 * C10 GDPR Data Portability - Export User Data
 * GDPR Art. 20 - Right to data portability
 * 
 * Exports all user-related data in JSON format
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[EXPORT-USER-DATA] Starting export for user ${user.id}`);

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fetch organization if user has one
    let organization = null;
    if (profile?.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();
      organization = orgData;
    }

    // Fetch user's raffles
    const { data: raffles } = profile?.organization_id
      ? await supabase
          .from("raffles")
          .select("id, title, slug, status, created_at, total_tickets, ticket_price, prize_name")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
      : { data: [] };

    // Fetch user's orders (buyers data)
    const { data: orders } = profile?.organization_id
      ? await supabase
          .from("orders")
          .select("id, reference_code, status, created_at, ticket_count, order_total, buyer_name, buyer_email, buyer_phone")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
          .limit(1000)
      : { data: [] };

    // Fetch user's audit log entries
    const { data: auditLog } = await supabase
      .from("audit_log")
      .select("id, action, resource_type, resource_name, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000);

    // Fetch billing audit log
    const { data: billingLog } = profile?.organization_id
      ? await supabase
          .from("billing_audit_log")
          .select("id, action, resource_type, created_at, old_values, new_values")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
          .limit(500)
      : { data: [] };

    // Fetch terms acceptance records
    const { data: termsAcceptance } = await supabase
      .from("terms_acceptance")
      .select("*")
      .eq("user_id", user.id)
      .order("accepted_at", { ascending: false });

    // Fetch notifications
    const { data: notifications } = await supabase
      .from("notifications")
      .select("id, type, title, message, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    // Fetch payment methods (if organization exists)
    const { data: paymentMethods } = profile?.organization_id
      ? await supabase
          .from("payment_methods")
          .select("id, name, type, bank_name, enabled, created_at")
          .eq("organization_id", profile.organization_id)
      : { data: [] };

    // Fetch coupons
    const { data: coupons } = profile?.organization_id
      ? await supabase
          .from("coupons")
          .select("id, code, name, discount_type, discount_value, active, created_at, current_uses")
          .eq("organization_id", profile.organization_id)
      : { data: [] };

    const exportData = {
      exported_at: new Date().toISOString(),
      export_version: "1.0",
      gdpr_article: "GDPR Art. 20 - Right to data portability",
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      profile: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        last_login: profile.last_login,
      } : null,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        email: organization.email,
        phone: organization.phone,
        country_code: organization.country_code,
        currency_code: organization.currency_code,
        subscription_tier: organization.subscription_tier,
        subscription_status: organization.subscription_status,
        created_at: organization.created_at,
      } : null,
      raffles: raffles || [],
      orders: orders || [],
      audit_log: auditLog || [],
      billing_history: billingLog || [],
      terms_acceptance: termsAcceptance || [],
      notifications: notifications || [],
      payment_methods: paymentMethods || [],
      coupons: coupons || [],
    };

    console.log(`[EXPORT-USER-DATA] Export completed for user ${user.id}`);

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sortavo-data-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("[EXPORT-USER-DATA] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
