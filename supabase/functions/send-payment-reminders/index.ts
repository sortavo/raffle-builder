import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Format ticket numbers from order's ticket_ranges and lucky_indices
function formatTicketNumbers(
  order: { ticket_ranges: { s: number; e: number }[]; lucky_indices?: number[] },
  numberingConfig: { start_number?: number; step?: number } | null,
  totalTickets: number
): string[] {
  const startNumber = numberingConfig?.start_number ?? 1;
  const step = numberingConfig?.step ?? 1;
  const maxTicketNum = startNumber + ((totalTickets - 1) * step);
  const digits = Math.max(String(maxTicketNum).length, 1);
  
  const tickets: string[] = [];
  
  // Expand ranges
  for (const range of order.ticket_ranges || []) {
    for (let i = range.s; i <= range.e && tickets.length < 10; i++) {
      const num = startNumber + (i * step);
      tickets.push(String(num).padStart(digits, '0'));
    }
  }
  
  // Add lucky indices
  for (const idx of order.lucky_indices || []) {
    if (tickets.length >= 10) break;
    const num = startNumber + (idx * step);
    tickets.push(String(num).padStart(digits, '0'));
  }
  
  return tickets;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting payment reminders job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find orders that:
    // 1. Are still reserved (not expired, not sold)
    // 2. Have no payment proof uploaded
    // 3. Are expiring within the next 30 minutes
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select(`
        id,
        reference_code,
        ticket_count,
        ticket_ranges,
        lucky_indices,
        buyer_name,
        buyer_email,
        reserved_at,
        reserved_until,
        raffle_id,
        raffles!inner (
          id,
          title,
          slug,
          organization_id,
          numbering_config,
          total_tickets,
          organizations!inner (
            slug
          )
        )
      `)
      .eq("status", "reserved")
      .is("payment_proof_url", null)
      .lt("reserved_until", thirtyMinutesFromNow.toISOString())
      .gt("reserved_until", now.toISOString());

    if (fetchError) {
      console.error("Error fetching pending orders:", fetchError);
      throw fetchError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log("No pending reservations need reminders");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders needed", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingOrders.length} orders needing reminders`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const order of pendingOrders) {
      const buyerEmail = order.buyer_email;
      if (!buyerEmail) continue;
      
      const buyerName = order.buyer_name || "Participante";
      const raffle = order.raffles as any;
      const raffleTitle = raffle?.title || "Sorteo";
      const orgSlug = raffle?.organizations?.slug || "";
      const raffleSlug = raffle?.slug || "";
      const reservedUntil = new Date(order.reserved_until!);
      
      // Calculate minutes remaining
      const minutesRemaining = Math.max(0, Math.round((reservedUntil.getTime() - now.getTime()) / 60000));
      
      // Format ticket numbers from ranges
      const ticketNumbers = formatTicketNumbers(
        { ticket_ranges: order.ticket_ranges as any, lucky_indices: order.lucky_indices as any },
        raffle?.numbering_config,
        raffle?.total_tickets || 1000
      );
      
      // Build payment URL
      const baseUrl = Deno.env.get("SITE_URL") || "https://sortavo.com";
      const paymentUrl = orgSlug && raffleSlug 
        ? `${baseUrl}/${orgSlug}/${raffleSlug}`
        : `${baseUrl}/r/${raffleSlug}`;

      try {
        // Send reminder email
        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: buyerEmail,
            subject: `⏰ ¡${minutesRemaining} minutos para completar tu pago!`,
            template: "payment_reminder",
            data: {
              buyer_name: buyerName,
              raffle_title: raffleTitle,
              ticket_numbers: ticketNumbers,
              ticket_count: order.ticket_count,
              minutes_remaining: minutesRemaining,
              payment_url: paymentUrl,
              reference_code: order.reference_code,
            },
          },
        });

        if (emailError) {
          console.error(`Error sending reminder to ${buyerEmail}:`, emailError);
          errors.push(`${buyerEmail}: ${emailError.message}`);
        } else {
          console.log(`Reminder sent to ${buyerEmail} for ${order.ticket_count} tickets`);
          sentCount++;
        }
      } catch (err) {
        console.error(`Exception sending reminder to ${buyerEmail}:`, err);
        errors.push(`${buyerEmail}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    console.log(`Payment reminders completed: ${sentCount} sent, ${errors.length} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sentCount} payment reminders`,
        sent: sentCount,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Payment reminders job failed:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
