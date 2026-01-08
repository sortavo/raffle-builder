import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} attempting to delete organization`);

    // Verify the requesting user is a platform admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminCheck) {
      console.error("User is not a platform admin:", adminError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only platform admins can delete organizations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization ID from request body
    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "Organization ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Attempting to delete organization: ${organizationId}`);

    // Get organization info for audit log
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, email")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get users in this organization
    const { data: orgUsers, error: usersError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId);

    if (usersError) {
      console.error("Error fetching org users:", usersError);
      return new Response(
        JSON.stringify({ error: "Error checking organization users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any user in this org is a platform admin
    if (orgUsers && orgUsers.length > 0) {
      const userIds = orgUsers.map(u => u.user_id);
      const { data: platformAdminsInOrg, error: paError } = await supabaseAdmin
        .from("platform_admins")
        .select("user_id")
        .in("user_id", userIds);

      if (paError) {
        console.error("Error checking platform admins:", paError);
        return new Response(
          JSON.stringify({ error: "Error checking platform admins" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (platformAdminsInOrg && platformAdminsInOrg.length > 0) {
        console.error("Cannot delete organization containing platform admins");
        return new Response(
          JSON.stringify({ error: "Cannot delete organization that contains platform admins" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Delete related data in order (respecting foreign key constraints)
    console.log("Deleting related data...");

    // Delete telegram connections
    await supabaseAdmin.from("telegram_connections").delete().eq("organization_id", organizationId);
    
    // Delete team invitations
    await supabaseAdmin.from("team_invitations").delete().eq("organization_id", organizationId);
    
    // Delete notifications
    await supabaseAdmin.from("notifications").delete().eq("organization_id", organizationId);
    
    // Delete analytics events
    await supabaseAdmin.from("analytics_events").delete().eq("organization_id", organizationId);
    
    // Get raffles to delete their related data
    const { data: raffles } = await supabaseAdmin
      .from("raffles")
      .select("id")
      .eq("organization_id", organizationId);

    if (raffles && raffles.length > 0) {
      const raffleIds = raffles.map(r => r.id);
      
      // Delete orders (new table)
      await supabaseAdmin.from("orders").delete().in("raffle_id", raffleIds);
      
      // Delete sold tickets (legacy table, for backward compatibility)
      await supabaseAdmin.from("sold_tickets").delete().in("raffle_id", raffleIds);
      
      // Delete raffle packages
      await supabaseAdmin.from("raffle_packages").delete().in("raffle_id", raffleIds);
      
      // Delete raffle custom numbers
      await supabaseAdmin.from("raffle_custom_numbers").delete().in("raffle_id", raffleIds);
      
      // Delete raffle draws
      await supabaseAdmin.from("raffle_draws").delete().in("raffle_id", raffleIds);
    }
    
    // Delete coupons (and their usage will cascade)
    const { data: coupons } = await supabaseAdmin
      .from("coupons")
      .select("id")
      .eq("organization_id", organizationId);
    
    if (coupons && coupons.length > 0) {
      const couponIds = coupons.map(c => c.id);
      await supabaseAdmin.from("coupon_usage").delete().in("coupon_id", couponIds);
    }
    await supabaseAdmin.from("coupons").delete().eq("organization_id", organizationId);
    
    // Delete raffles
    await supabaseAdmin.from("raffles").delete().eq("organization_id", organizationId);
    
    // Delete payment methods
    await supabaseAdmin.from("payment_methods").delete().eq("organization_id", organizationId);
    
    // Delete custom domains
    await supabaseAdmin.from("custom_domains").delete().eq("organization_id", organizationId);
    
    // Delete user roles for this organization
    await supabaseAdmin.from("user_roles").delete().eq("organization_id", organizationId);
    
    // Update profiles to remove organization reference
    await supabaseAdmin
      .from("profiles")
      .update({ organization_id: null })
      .eq("organization_id", organizationId);

    // Delete audit logs for this organization (optional, keeping for audit trail)
    // await supabaseAdmin.from("audit_log").delete().eq("organization_id", organizationId);

    // Finally delete the organization
    const { error: deleteError } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", organizationId);

    if (deleteError) {
      console.error("Error deleting organization:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete organization" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Organization ${organizationId} deleted successfully`);

    // Log to audit (using admin's org or null)
    await supabaseAdmin.from("audit_log").insert({
      user_id: user.id,
      user_email: user.email || "unknown",
      action: "delete",
      resource_type: "organization",
      resource_id: organizationId,
      resource_name: org.name,
      organization_id: null, // The org no longer exists
      metadata: {
        deleted_org_email: org.email,
        deleted_by_platform_admin: true,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Organization deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
