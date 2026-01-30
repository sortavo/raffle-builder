// ============================================================================
// Auto-Archive Raffles Edge Function
// ============================================================================
// Archives completed raffles that are 90+ days past their draw date
// Consolidates data into archived_raffle_summary and frees up storage
// Recommended schedule: Weekly on Sundays at 3AM UTC

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJsonResponse, handleCorsPrelight } from '../_shared/cors.ts';

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-ARCHIVE] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    logStep("Starting auto-archive job");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Find raffles ready to archive (completed, 90+ days past draw, not yet archived)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const { data: rafflesToArchive, error: fetchError } = await supabase
      .from('raffles')
      .select('id, title, organization_id, draw_date, total_tickets')
      .eq('status', 'completed')
      .is('archived_at', null)
      .lt('draw_date', cutoffDate.toISOString())
      .order('draw_date', { ascending: true })
      .limit(10); // Process max 10 per run to avoid timeouts

    if (fetchError) {
      logStep("Error fetching raffles", { error: fetchError.message });
      throw fetchError;
    }

    if (!rafflesToArchive || rafflesToArchive.length === 0) {
      logStep("No raffles ready to archive");
      return corsJsonResponse(req, { 
        success: true, 
        message: "No raffles to archive",
        archived: 0 
      });
    }

    logStep("Found raffles to archive", { count: rafflesToArchive.length });

    const results = [];

    for (const raffle of rafflesToArchive) {
      try {
        logStep("Archiving raffle", { 
          id: raffle.id, 
          title: raffle.title,
          drawDate: raffle.draw_date 
        });

        // Call the archive_raffle function
        const { data: archiveResult, error: archiveError } = await supabase
          .rpc('archive_raffle', { p_raffle_id: raffle.id });

        if (archiveError) {
          logStep("Archive error", { raffleId: raffle.id, error: archiveError.message });
          results.push({ 
            raffleId: raffle.id, 
            title: raffle.title,
            success: false, 
            error: archiveError.message 
          });
          continue;
        }

        if (!archiveResult?.success) {
          logStep("Archive failed", { raffleId: raffle.id, result: archiveResult });
          results.push({ 
            raffleId: raffle.id, 
            title: raffle.title,
            success: false, 
            error: archiveResult?.error || 'Unknown error' 
          });
          continue;
        }

        // Notify organization admins about the archival
        const { data: orgUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('organization_id', raffle.organization_id)
          .in('role', ['owner', 'admin']);

        if (orgUsers && orgUsers.length > 0) {
          await supabase.from('notifications').insert(
            orgUsers.map(u => ({
              user_id: u.user_id,
              organization_id: raffle.organization_id,
              type: 'raffle_archived',
              title: '📦 Sorteo Archivado',
              message: `"${raffle.title}" ha sido archivado automáticamente. Se liberaron ${archiveResult.orders_deleted || 0} órdenes del almacenamiento.`,
              link: `/dashboard/raffles/${raffle.id}`,
              metadata: {
                raffle_id: raffle.id,
                orders_deleted: archiveResult.orders_deleted,
                tickets_deleted: archiveResult.tickets_deleted,
              },
            }))
          );
        }

        logStep("Raffle archived successfully", { 
          raffleId: raffle.id,
          ordersDeleted: archiveResult.orders_deleted,
          ticketsDeleted: archiveResult.tickets_deleted
        });

        results.push({ 
          raffleId: raffle.id, 
          title: raffle.title,
          success: true,
          ordersDeleted: archiveResult.orders_deleted,
          ticketsDeleted: archiveResult.tickets_deleted
        });

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logStep("Error processing raffle", { raffleId: raffle.id, error: errorMsg });
        results.push({ 
          raffleId: raffle.id, 
          title: raffle.title,
          success: false, 
          error: errorMsg 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalOrdersDeleted = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.ordersDeleted || 0), 0);
    const totalTicketsDeleted = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.ticketsDeleted || 0), 0);

    logStep("Auto-archive completed", { 
      successCount, 
      failCount,
      totalOrdersDeleted,
      totalTicketsDeleted
    });

    return corsJsonResponse(req, {
      success: true,
      message: `Archived ${successCount} raffles`,
      successCount,
      failCount,
      totalOrdersDeleted,
      totalTicketsDeleted,
      results,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return corsJsonResponse(req, {
      success: false,
      error: errorMessage,
    }, 500);
  }
});
