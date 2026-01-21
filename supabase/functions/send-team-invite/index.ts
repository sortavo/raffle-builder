import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
// C4 Security: Use centralized CORS with origin whitelist instead of wildcard
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-TEAM-INVITE] ${step}${detailsStr}`);
};

interface InviteRequest {
  email: string;
  role: "admin" | "member";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid token");

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("User has no organization");
    }

    const organizationId = profile.organization_id;
    logStep("Got organization", { organizationId });

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const { email, role }: InviteRequest = await req.json();
    logStep("Invite request", { email, role });

    // Validate email
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    // Check if user already exists in org
    const { data: existingMember } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .eq("organization_id", organizationId)
      .single();

    if (existingMember) {
      throw new Error("Este usuario ya es miembro de la organización");
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .is("accepted_at", null)
      .single();

    if (existingInvite) {
      throw new Error("Ya existe una invitación pendiente para este email");
    }

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: userId,
      })
      .select()
      .single();

    if (inviteError) {
      logStep("Error creating invitation", { error: inviteError.message });
      throw new Error("Error al crear la invitación: " + inviteError.message);
    }

    logStep("Invitation created", { invitationId: invitation.id, token: invitation.token });

    // Build invite URL
    const origin = req.headers.get("origin") || "https://sortavo.com";
    const inviteUrl = `${origin}/invite/${invitation.token}`;

    // Send email
    const roleLabel = role === "admin" ? "Administrador" : "Miembro";
    const inviterName = inviterProfile?.full_name || "Un administrador";
    const orgName = org?.name || "la organización";

    const emailResponse = await resend.emails.send({
      from: "Sortavo <onboarding@resend.dev>",
      to: [email],
      subject: `${inviterName} te ha invitado a unirte a ${orgName} en Sortavo`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <tr>
              <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #2563eb, #7c3aed);">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎟️ SORTAVO</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #18181b; margin: 0 0 20px; font-size: 24px;">¡Has sido invitado!</h2>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  <strong>${inviterName}</strong> te ha invitado a unirte a <strong>${orgName}</strong> como <strong>${roleLabel}</strong>.
                </p>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                  Sortavo es la plataforma #1 para organizar y vender boletos de sorteos en línea.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                    Aceptar Invitación
                  </a>
                </div>
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                  Esta invitación expira en 7 días. Si no esperabas este email, puedes ignorarlo.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 40px; background-color: #f4f4f5; text-align: center;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Sortavo. Todos los derechos reservados.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    logStep("Email sent", { emailResponse });

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: { 
          id: invitation.id, 
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at 
        } 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
