import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString();

    console.log(`Looking for completed raffles older than ${cutoffDate}`);

    // Find raffles that are completed, older than 90 days, and not yet archived
    const { data: rafflesToArchive, error: fetchError } = await supabase
      .from("raffles")
      .select("id, title, organization_id, draw_date")
      .eq("status", "completed")
      .lt("draw_date", cutoffDate)
      .is("archived_at", null)
      .limit(10); // Process in batches

    if (fetchError) {
      console.error("Error fetching raffles:", fetchError);
      throw fetchError;
    }

    if (!rafflesToArchive || rafflesToArchive.length === 0) {
      console.log("No raffles to archive");
      return new Response(
        JSON.stringify({ message: "No raffles to archive", archived: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${rafflesToArchive.length} raffles to archive`);

    const results: { raffleId: string; title: string; ordersDeleted: number; success: boolean; error?: string }[] = [];

    for (const raffle of rafflesToArchive) {
      try {
        console.log(`Processing raffle: ${raffle.id} - ${raffle.title}`);

        // 1. Check if archived_raffle_summary exists
        const { data: existingSummary } = await supabase
          .from("archived_raffle_summary")
          .select("raffle_id")
          .eq("raffle_id", raffle.id)
          .single();

        // 2. If no summary exists, create one before deleting orders
        if (!existingSummary) {
          console.log(`Creating archive summary for raffle ${raffle.id}`);

          // Get order stats before deleting
          const { data: orderStats } = await supabase
            .from("orders")
            .select("ticket_count, status, order_total, buyer_city")
            .eq("raffle_id", raffle.id);

          const stats = {
            tickets_sold: 0,
            tickets_reserved: 0,
            total_revenue: 0,
            unique_buyers: new Set<string>(),
            buyer_cities: {} as Record<string, number>,
          };

          orderStats?.forEach((order) => {
            if (order.status === "sold") {
              stats.tickets_sold += order.ticket_count || 0;
              stats.total_revenue += order.order_total || 0;
            } else if (order.status === "reserved" || order.status === "pending") {
              stats.tickets_reserved += order.ticket_count || 0;
            }
            if (order.buyer_city) {
              stats.buyer_cities[order.buyer_city] = (stats.buyer_cities[order.buyer_city] || 0) + 1;
            }
          });

          // Get winners
          const { data: winners } = await supabase
            .from("raffle_draws")
            .select("prize_name, ticket_number, winner_name, winner_email, drawn_at")
            .eq("raffle_id", raffle.id);

          // Insert summary
          const { error: summaryError } = await supabase
            .from("archived_raffle_summary")
            .insert({
              raffle_id: raffle.id,
              tickets_sold: stats.tickets_sold,
              tickets_reserved: stats.tickets_reserved,
              total_revenue: stats.total_revenue,
              unique_buyers: orderStats?.length || 0,
              buyer_cities: stats.buyer_cities,
              winners: winners || [],
              draw_executed_at: raffle.draw_date,
            });

          if (summaryError) {
            console.error(`Error creating summary for raffle ${raffle.id}:`, summaryError);
            // Continue anyway - we still want to try archiving
          }
        }

        // 3. Delete orders for this raffle (customers table remains untouched!)
        const { count: deletedCount, error: deleteError } = await supabase
          .from("orders")
          .delete({ count: "exact" })
          .eq("raffle_id", raffle.id);

        if (deleteError) {
          console.error(`Error deleting orders for raffle ${raffle.id}:`, deleteError);
          results.push({
            raffleId: raffle.id,
            title: raffle.title,
            ordersDeleted: 0,
            success: false,
            error: deleteError.message,
          });
          continue;
        }

        console.log(`Deleted ${deletedCount} orders for raffle ${raffle.id}`);

        // 4. Mark raffle as archived
        const { error: updateError } = await supabase
          .from("raffles")
          .update({ archived_at: new Date().toISOString() })
          .eq("id", raffle.id);

        if (updateError) {
          console.error(`Error updating raffle ${raffle.id}:`, updateError);
          results.push({
            raffleId: raffle.id,
            title: raffle.title,
            ordersDeleted: deletedCount || 0,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        console.log(`Successfully archived raffle ${raffle.id}`);
        results.push({
          raffleId: raffle.id,
          title: raffle.title,
          ordersDeleted: deletedCount || 0,
          success: true,
        });
      } catch (err) {
        console.error(`Error processing raffle ${raffle.id}:`, err);
        results.push({
          raffleId: raffle.id,
          title: raffle.title,
          ordersDeleted: 0,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalOrdersDeleted = results.reduce((sum, r) => sum + r.ordersDeleted, 0);

    console.log(`Archive complete: ${successCount}/${results.length} raffles archived, ${totalOrdersDeleted} orders deleted`);

    return new Response(
      JSON.stringify({
        message: `Archived ${successCount} raffles`,
        archived: successCount,
        ordersDeleted: totalOrdersDeleted,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Archive error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
