import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WinnerData {
  ticket_id: string;
  ticket_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_city: string | null;
  draw_method: 'manual' | 'lottery' | 'random_org';
  draw_timestamp: string;
  auto_executed: boolean;
}

function generateSecureRandomNumber(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % max) + 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting auto-draw job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find raffles that are past their draw_date and still active
    const now = new Date().toISOString();
    
    const { data: rafflesToDraw, error: fetchError } = await supabase
      .from("raffles")
      .select(`
        id,
        title,
        prize_name,
        draw_method,
        draw_date,
        organization_id,
        created_by,
        auto_publish_result
      `)
      .eq("status", "active")
      .not("draw_date", "is", null)
      .lt("draw_date", now);

    if (fetchError) {
      console.error("Error fetching raffles:", fetchError);
      throw fetchError;
    }

    if (!rafflesToDraw || rafflesToDraw.length === 0) {
      console.log("No raffles to draw at this time");
      return new Response(
        JSON.stringify({ success: true, message: "No raffles to draw", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${rafflesToDraw.length} raffles to process`);

    const results = [];

    for (const raffle of rafflesToDraw) {
      try {
        console.log(`Processing raffle: ${raffle.id} - ${raffle.title}`);

        // Get all sold tickets for this raffle
        const { data: soldTickets, error: ticketsError } = await supabase
          .from("sold_tickets")
          .select("id, ticket_number, buyer_name, buyer_email, buyer_phone, buyer_city")
          .eq("raffle_id", raffle.id)
          .eq("status", "sold");

        if (ticketsError) {
          console.error(`Error fetching tickets for raffle ${raffle.id}:`, ticketsError);
          results.push({ raffleId: raffle.id, success: false, error: ticketsError.message });
          continue;
        }

        if (!soldTickets || soldTickets.length === 0) {
          console.log(`No sold tickets for raffle ${raffle.id}, skipping`);
          // Mark as completed without winner if no tickets sold
          await supabase
            .from("raffles")
            .update({ status: "completed" })
            .eq("id", raffle.id);
          
          results.push({ raffleId: raffle.id, success: true, noTickets: true });
          continue;
        }

        // Select a random winner
        const randomIndex = generateSecureRandomNumber(soldTickets.length) - 1;
        const winnerTicket = soldTickets[randomIndex];

        const winnerData: WinnerData = {
          ticket_id: winnerTicket.id,
          ticket_number: winnerTicket.ticket_number,
          buyer_name: winnerTicket.buyer_name || "Anónimo",
          buyer_email: winnerTicket.buyer_email || "",
          buyer_phone: winnerTicket.buyer_phone,
          buyer_city: winnerTicket.buyer_city,
          draw_method: "random_org", // Crypto random is equivalent security
          draw_timestamp: new Date().toISOString(),
          auto_executed: true,
        };

        // Update raffle with winner
        const { error: updateError } = await supabase
          .from("raffles")
          .update({
            status: "completed",
            winner_ticket_number: winnerTicket.ticket_number,
            winner_data: winnerData,
            winner_announced: raffle.auto_publish_result || false,
          })
          .eq("id", raffle.id);

        if (updateError) {
          console.error(`Error updating raffle ${raffle.id}:`, updateError);
          results.push({ raffleId: raffle.id, success: false, error: updateError.message });
          continue;
        }

        // Log to analytics
        await supabase.from("analytics_events").insert([{
          organization_id: raffle.organization_id,
          raffle_id: raffle.id,
          event_type: "auto_draw_executed",
          metadata: winnerData,
        }]);

        // Create notification for the organizer
        if (raffle.created_by) {
          await supabase.from("notifications").insert([{
            user_id: raffle.created_by,
            organization_id: raffle.organization_id,
            type: "raffle_completed",
            title: "Sorteo ejecutado automáticamente",
            message: `El sorteo "${raffle.title}" se ejecutó automáticamente. Ganador: ${winnerData.buyer_name} con boleto #${winnerData.ticket_number}`,
            link: `/dashboard/raffles/${raffle.id}`,
            metadata: { raffle_id: raffle.id, winner_ticket: winnerData.ticket_number },
          }]);
        }

        // Send email to winner if we have their email
        if (winnerTicket.buyer_email) {
          try {
            // Get organization name for email
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", raffle.organization_id)
              .single();

            await supabase.functions.invoke("send-email", {
              body: {
                to: winnerTicket.buyer_email,
                template: "winner",
                data: {
                  buyer_name: winnerTicket.buyer_name || "Participante",
                  ticket_numbers: [winnerTicket.ticket_number],
                  prize_name: raffle.prize_name,
                  raffle_title: raffle.title,
                  org_name: org?.name || "Organizador",
                  draw_method: "Sorteo automático",
                },
              },
            });
            console.log(`Winner notification email sent to ${winnerTicket.buyer_email}`);
          } catch (emailError) {
            console.error("Error sending winner email:", emailError);
            // Don't fail the whole process for email errors
          }
        }

        console.log(`Successfully processed raffle ${raffle.id}, winner: ${winnerData.ticket_number}`);
        results.push({ 
          raffleId: raffle.id, 
          success: true, 
          winner: winnerData.ticket_number,
          buyerName: winnerData.buyer_name 
        });

      } catch (raffleError) {
        console.error(`Error processing raffle ${raffle.id}:`, raffleError);
        results.push({ 
          raffleId: raffle.id, 
          success: false, 
          error: raffleError instanceof Error ? raffleError.message : "Unknown error" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Auto-draw completed: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${rafflesToDraw.length} raffles`,
        successCount,
        failCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Auto-draw job failed:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
