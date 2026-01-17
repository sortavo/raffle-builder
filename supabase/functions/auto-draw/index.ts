import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from '../_shared/cors.ts';

interface OrderData {
  id: string;
  ticket_count: number;
  ticket_ranges: { s: number; e: number }[];
  lucky_indices: number[];
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_city: string | null;
}

interface WinnerData {
  order_id: string;
  ticket_number: string;
  ticket_index: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_city: string | null;
  draw_method: 'manual' | 'lottery' | 'random_org';
  draw_timestamp: string;
  auto_executed: boolean;
}

// Get the ticket index at a specific position within an order
function getTicketIndexAtPosition(order: OrderData, position: number): number {
  let accumulated = 0;
  
  // First check regular ranges
  for (const range of order.ticket_ranges || []) {
    const rangeSize = range.e - range.s + 1;
    if (accumulated + rangeSize > position) {
      return range.s + (position - accumulated);
    }
    accumulated += rangeSize;
  }
  
  // Then check lucky indices
  const luckyPosition = position - accumulated;
  if (order.lucky_indices && luckyPosition < order.lucky_indices.length) {
    return order.lucky_indices[luckyPosition];
  }
  
  throw new Error('Position out of bounds');
}

function generateSecureRandomNumber(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    console.log("Starting auto-draw job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    
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
        auto_publish_result,
        numbering_config,
        total_tickets
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
      return corsJsonResponse(req, { success: true, message: "No raffles to draw", processed: 0 });
    }

    console.log(`Found ${rafflesToDraw.length} raffles to process`);

    const results = [];

    for (const raffle of rafflesToDraw) {
      try {
        console.log(`Processing raffle: ${raffle.id} - ${raffle.title}`);

        // Get all sold orders for this raffle (using orders table)
        const { data: soldOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id, ticket_count, ticket_ranges, lucky_indices, buyer_name, buyer_email, buyer_phone, buyer_city")
          .eq("raffle_id", raffle.id)
          .eq("status", "sold")
          .order("created_at", { ascending: true });

        if (ordersError) {
          console.error(`Error fetching orders for raffle ${raffle.id}:`, ordersError);
          results.push({ raffleId: raffle.id, success: false, error: ordersError.message });
          continue;
        }

        // Calculate total sold tickets
        const soldCount = soldOrders?.reduce((sum, o) => sum + (o.ticket_count || 0), 0) || 0;

        if (soldCount === 0) {
          console.log(`No sold tickets for raffle ${raffle.id}, skipping`);
          // Mark as completed without winner if no tickets sold
          await supabase
            .from("raffles")
            .update({ status: "completed" })
            .eq("id", raffle.id);
          
          results.push({ raffleId: raffle.id, success: true, noTickets: true });
          continue;
        }

        console.log(`Found ${soldCount} sold tickets across ${soldOrders?.length} orders`);

        // Select a random position from total sold tickets
        const randomOffset = generateSecureRandomNumber(soldCount);

        // Find the order and ticket at this offset
        let accumulatedCount = 0;
        let winnerOrder: OrderData | null = null;
        let positionInOrder = 0;

        for (const order of soldOrders || []) {
          const orderData = order as OrderData;
          if (accumulatedCount + orderData.ticket_count > randomOffset) {
            winnerOrder = orderData;
            positionInOrder = randomOffset - accumulatedCount;
            break;
          }
          accumulatedCount += orderData.ticket_count;
        }

        if (!winnerOrder) {
          throw new Error('Could not find winner order');
        }

        // Get the actual ticket index from the order's ranges
        const winnerTicketIndex = getTicketIndexAtPosition(winnerOrder, positionInOrder);

        // Format ticket number using the raffle's config
        const { data: formattedNumber } = await supabase.rpc('format_virtual_ticket', {
          p_index: winnerTicketIndex,
          p_config: raffle.numbering_config || {},
          p_total: raffle.total_tickets || 1000,
        });

        const ticketNumber = formattedNumber || String(winnerTicketIndex);

        const winnerData: WinnerData = {
          order_id: winnerOrder.id,
          ticket_number: ticketNumber,
          ticket_index: winnerTicketIndex,
          buyer_name: winnerOrder.buyer_name || "Anónimo",
          buyer_email: winnerOrder.buyer_email || "",
          buyer_phone: winnerOrder.buyer_phone,
          buyer_city: winnerOrder.buyer_city,
          draw_method: "random_org", // Crypto random is equivalent security
          draw_timestamp: new Date().toISOString(),
          auto_executed: true,
        };

        // Update raffle with winner
        const { error: updateError } = await supabase
          .from("raffles")
          .update({
            status: "completed",
            winner_ticket_number: ticketNumber,
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
        if (winnerOrder.buyer_email) {
          try {
            // Get organization name for email
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", raffle.organization_id)
              .single();

            // Use internal token for internal function calls
            const invokeOptions: { body: any; headers?: Record<string, string> } = {
              body: {
                to: winnerOrder.buyer_email,
                template: "winner",
                data: {
                  buyer_name: winnerOrder.buyer_name || "Participante",
                  ticket_numbers: [ticketNumber],
                  prize_name: raffle.prize_name,
                  raffle_title: raffle.title,
                  org_name: org?.name || "Organizador",
                  draw_method: "Sorteo automático",
                },
              },
            };

            // Add internal token if available
            if (internalSecret) {
              invokeOptions.headers = { 'X-Internal-Token': internalSecret };
            }

            await supabase.functions.invoke("send-email", invokeOptions);
            console.log(`Winner notification email sent to ${winnerOrder.buyer_email}`);
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

    return corsJsonResponse(req, {
      success: true,
      message: `Processed ${rafflesToDraw.length} raffles`,
      successCount,
      failCount,
      results,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Auto-draw job failed:", errorMessage);
    
    return corsJsonResponse(req, { success: false, error: errorMessage }, 500);
  }
});
