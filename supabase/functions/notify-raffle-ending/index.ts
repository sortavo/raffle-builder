// ============================================================================
// Notify Raffle Ending Edge Function
// ============================================================================
// Sends Telegram notifications for raffles ending in 24 hours
// Recommended schedule: Daily at 10AM via cron job

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-RAFFLE-ENDING] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting raffle ending notification check");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Find raffles ending in the next 24-25 hours (to catch the 24h window)
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: endingRaffles, error: fetchError } = await supabase
      .from('raffles')
      .select(`
        id,
        title,
        organization_id,
        end_date,
        total_tickets,
        ticket_price
      `)
      .eq('status', 'active')
      .gte('end_date', in24Hours.toISOString())
      .lt('end_date', in25Hours.toISOString());

    if (fetchError) {
      logStep("Error fetching ending raffles", { error: fetchError.message });
      throw fetchError;
    }

    if (!endingRaffles || endingRaffles.length === 0) {
      logStep("No raffles ending in 24 hours");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No raffles ending soon",
        notified: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found raffles ending soon", { count: endingRaffles.length });

    let notifiedCount = 0;

    for (const raffle of endingRaffles) {
      try {
        // Get sold ticket count from orders
        const { count: soldCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('raffle_id', raffle.id)
          .eq('status', 'sold');

        // Check if we already notified today for this raffle
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'raffle_ending')
          .eq('metadata->>raffle_id', raffle.id)
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (existingNotif) {
          logStep("Already notified for raffle today", { raffleId: raffle.id });
          continue;
        }

        // Send Telegram notification
        const { error: telegramError } = await supabase.functions.invoke('telegram-notify', {
          body: {
            type: 'raffle_ending',
            organizationId: raffle.organization_id,
            raffleId: raffle.id,
            data: {
              raffleName: raffle.title,
              soldCount: soldCount || 0,
              totalCount: raffle.total_tickets,
            },
          },
        });

        if (telegramError) {
          logStep("Telegram notify failed", { raffleId: raffle.id, error: telegramError.message });
        }

        // Also create in-app notification for the organizer
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
              type: 'raffle_ending',
              title: '⏰ Sorteo por Terminar',
              message: `"${raffle.title}" termina en 24 horas. ${soldCount || 0}/${raffle.total_tickets} boletos vendidos.`,
              link: `/dashboard/raffles/${raffle.id}`,
              metadata: {
                raffle_id: raffle.id,
                raffle_title: raffle.title,
                sold_count: soldCount || 0,
                total_count: raffle.total_tickets,
              },
            }))
          );
        }

        notifiedCount++;
        logStep("Notification sent", { 
          raffleId: raffle.id, 
          title: raffle.title,
          soldCount: soldCount || 0,
          totalCount: raffle.total_tickets,
        });
      } catch (err) {
        logStep("Error processing raffle", { 
          raffleId: raffle.id, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }

    logStep("Completed", { notified: notifiedCount, total: endingRaffles.length });

    return new Response(JSON.stringify({
      success: true,
      notified: notifiedCount,
      total: endingRaffles.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
