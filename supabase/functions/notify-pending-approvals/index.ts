import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

interface PendingApproval {
  raffle_id: string;
  raffle_title: string;
  org_id: string;
  org_name: string;
  created_by: string;
  pending_count: number;
  pending_tickets: number;
  oldest_pending: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    console.log("Starting pending approvals notification job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find orders with payment proof that haven't been approved yet
    // Status is still 'reserved' but has payment_proof_url
    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select(`
        id,
        reference_code,
        ticket_count,
        buyer_name,
        reserved_at,
        payment_proof_url,
        raffle_id,
        raffles!inner (
          id,
          title,
          created_by,
          organization_id,
          organizations!inner (
            id,
            name
          )
        )
      `)
      .eq("status", "reserved")
      .not("payment_proof_url", "is", null);

    if (fetchError) {
      console.error("Error fetching pending orders:", fetchError);
      throw fetchError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log("No pending approvals found");
      return corsJsonResponse(req, { success: true, message: "No pending approvals", notified: 0 });
    }

    // Calculate total pending tickets
    const totalPendingTickets = pendingOrders.reduce((sum, o) => sum + (o.ticket_count || 0), 0);
    console.log(`Found ${pendingOrders.length} orders (${totalPendingTickets} tickets) pending approval`);

    // Group by organization and raffle
    const pendingByOrg = new Map<string, PendingApproval[]>();
    
    for (const order of pendingOrders) {
      const raffle = order.raffles as any;
      const org = raffle?.organizations;
      const createdBy = raffle?.created_by;
      
      if (!org?.id || !createdBy) continue;
      
      const orgId = org.id;
      const raffleId = raffle.id;
      
      if (!pendingByOrg.has(orgId)) {
        pendingByOrg.set(orgId, []);
      }
      
      const orgRaffles = pendingByOrg.get(orgId)!;
      let raffleEntry = orgRaffles.find(r => r.raffle_id === raffleId);
      
      if (!raffleEntry) {
        raffleEntry = {
          raffle_id: raffleId,
          raffle_title: raffle.title,
          org_id: orgId,
          org_name: org.name,
          created_by: createdBy,
          pending_count: 0,
          pending_tickets: 0,
          oldest_pending: order.reserved_at || new Date().toISOString(),
        };
        orgRaffles.push(raffleEntry);
      }
      
      raffleEntry.pending_count++;
      raffleEntry.pending_tickets += order.ticket_count || 0;
      
      // Track oldest pending
      if (order.reserved_at && order.reserved_at < raffleEntry.oldest_pending) {
        raffleEntry.oldest_pending = order.reserved_at;
      }
    }

    let notifiedCount = 0;
    const errors: string[] = [];

    // Create notifications for each organization owner
    for (const [orgId, raffles] of pendingByOrg) {
      const totalPending = raffles.reduce((sum, r) => sum + r.pending_count, 0);
      const totalTickets = raffles.reduce((sum, r) => sum + r.pending_tickets, 0);
      const createdBy = raffles[0].created_by;
      const orgName = raffles[0].org_name;
      
      // Calculate how long the oldest one has been waiting
      const oldestDate = new Date(Math.min(...raffles.map(r => new Date(r.oldest_pending).getTime())));
      const waitingHours = Math.round((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60));
      
      // Build message
      let message = `Tienes ${totalPending} comprobante${totalPending > 1 ? 's' : ''} de pago pendiente${totalPending > 1 ? 's' : ''} por aprobar (${totalTickets} boletos)`;
      
      if (raffles.length === 1) {
        message += ` en "${raffles[0].raffle_title}"`;
      } else {
        message += ` en ${raffles.length} sorteos`;
      }
      
      if (waitingHours >= 1) {
        message += `. El más antiguo lleva ${waitingHours} hora${waitingHours > 1 ? 's' : ''} esperando.`;
      } else {
        message += ".";
      }

      try {
        // Check if we already sent a notification today to avoid spam
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: existingNotification } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", createdBy)
          .eq("type", "pending_approvals")
          .gte("created_at", today.toISOString())
          .maybeSingle();

        if (existingNotification) {
          console.log(`Already notified ${createdBy} today, skipping`);
          continue;
        }

        // Create in-app notification
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: createdBy,
            organization_id: orgId,
            type: "pending_approvals",
            title: "📋 Comprobantes pendientes",
            message,
            link: `/dashboard/raffles/${raffles[0].raffle_id}?tab=approvals`,
            metadata: {
              total_pending: totalPending,
              total_tickets: totalTickets,
              raffles: raffles.map(r => ({ id: r.raffle_id, title: r.raffle_title, count: r.pending_count, tickets: r.pending_tickets })),
            },
          });

        if (notifError) {
          console.error(`Error creating notification for ${createdBy}:`, notifError);
          errors.push(`${createdBy}: ${notifError.message}`);
        } else {
          console.log(`Notification created for ${createdBy}: ${totalPending} pending approvals (${totalTickets} tickets)`);
          notifiedCount++;
        }

        // Also send email summary if there are many pending
        if (totalPending >= 5 || waitingHours >= 6) {
          // Get user email
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", createdBy)
            .single();

          if (profile?.email) {
            // Prepare invoke options with internal token
            const invokeOptions: { body: any; headers?: Record<string, string> } = {
              body: {
                to: profile.email,
                subject: `📋 ${totalPending} comprobantes pendientes de aprobar (${totalTickets} boletos)`,
                template: "pending_approvals",
                data: {
                  org_name: orgName,
                  total_pending: totalPending,
                  total_tickets: totalTickets,
                  waiting_hours: waitingHours,
                  raffles: raffles.map(r => ({ title: r.raffle_title, count: r.pending_count, tickets: r.pending_tickets })),
                  dashboard_url: `${Deno.env.get("SITE_URL") || "https://sortavo.com"}/dashboard/raffles/${raffles[0].raffle_id}?tab=approvals`,
                },
              },
            };

            // Add internal token if available
            if (internalSecret) {
              invokeOptions.headers = { 'X-Internal-Token': internalSecret };
            }

            await supabase.functions.invoke("send-email", invokeOptions);
            console.log(`Email sent to ${profile.email} about pending approvals`);
          }
        }
      } catch (err) {
        console.error(`Exception notifying ${createdBy}:`, err);
        errors.push(`${createdBy}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    console.log(`Pending approvals notifications completed: ${notifiedCount} notified, ${errors.length} failed`);

    return corsJsonResponse(req, {
      success: true,
      message: `Notified ${notifiedCount} organizers about pending approvals`,
      notified: notifiedCount,
      totalPendingOrders: pendingOrders.length,
      totalPendingTickets,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Pending approvals notification job failed:", errorMessage);
    
    return corsJsonResponse(req, { success: false, error: errorMessage }, 500);
  }
});
