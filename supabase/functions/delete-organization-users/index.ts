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
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get the JWT from the request header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request from user:", user.id, user.email);

    // Check if the requesting user is a platform admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminCheck) {
      console.error("Platform admin check failed:", adminError);
      return new Response(
        JSON.stringify({ error: "Only platform admins can delete organization users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the organization ID from the request body
    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "Organization ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Deleting users from organization:", organizationId);

    // Get organization info for audit log
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("name, email")
      .eq("id", organizationId)
      .single();

    if (orgError || !orgData) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all users from this organization via user_roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Error fetching organization users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userRoles || userRoles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deletedCount: 0, message: "No users to delete" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = userRoles.map(ur => ur.user_id);
    console.log("Found users to check:", userIds.length);

    // Check if any user is a platform admin (we cannot delete them)
    const { data: platformAdmins, error: paError } = await supabaseAdmin
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

    const platformAdminIds = new Set(platformAdmins?.map(pa => pa.user_id) || []);
    const usersToDelete = userIds.filter(id => !platformAdminIds.has(id));

    console.log("Users to delete (excluding platform admins):", usersToDelete.length);

    if (usersToDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          deletedCount: 0, 
          skippedCount: platformAdminIds.size,
          message: "All users are platform admins and cannot be deleted" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails for audit log
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", usersToDelete);

    const deletedUsers: string[] = [];
    const failedUsers: string[] = [];

    // Delete each user from auth (this will cascade to profiles and user_roles)
    for (const userId of usersToDelete) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.error(`Failed to delete user ${userId}:`, deleteError);
          failedUsers.push(userId);
        } else {
          deletedUsers.push(userId);
          console.log(`Deleted user: ${userId}`);
        }
      } catch (err) {
        console.error(`Exception deleting user ${userId}:`, err);
        failedUsers.push(userId);
      }
    }

    // Log the action in audit_log
    const { error: auditError } = await supabaseAdmin
      .from("audit_log")
      .insert({
        user_id: user.id,
        user_email: user.email || "unknown",
        user_name: null,
        action: "bulk_delete",
        resource_type: "organization_users",
        resource_id: organizationId,
        resource_name: orgData.name,
        changes: {
          deleted_count: deletedUsers.length,
          failed_count: failedUsers.length,
          skipped_platform_admins: platformAdminIds.size,
          deleted_user_emails: profiles?.filter(p => deletedUsers.includes(p.id)).map(p => p.email) || [],
        },
        metadata: {
          organization_email: orgData.email,
        },
      });

    if (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    console.log(`Bulk delete complete: ${deletedUsers.length} deleted, ${failedUsers.length} failed, ${platformAdminIds.size} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: deletedUsers.length,
        failedCount: failedUsers.length,
        skippedCount: platformAdminIds.size,
      }),
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
