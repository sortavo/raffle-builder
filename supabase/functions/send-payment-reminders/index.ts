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
    console.log("Starting payment reminders job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find reservations that:
    // 1. Are still reserved (not expired, not sold)
    // 2. Have no payment proof uploaded
    // 3. Have been reserved for more than 30% of the reservation time (to give them a chance)
    // 4. Are expiring within the next 30 minutes
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: pendingTickets, error: fetchError } = await supabase
      .from("tickets")
      .select(`
        id,
        ticket_number,
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
      console.error("Error fetching pending tickets:", fetchError);
      throw fetchError;
    }

    if (!pendingTickets || pendingTickets.length === 0) {
      console.log("No pending reservations need reminders");
      return new Response(
        JSON.stringify({ success: true, message: "No reminders needed", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pendingTickets.length} tickets needing reminders`);

    // Group tickets by buyer email and raffle
    const groupedByBuyer = new Map<string, typeof pendingTickets>();
    
    for (const ticket of pendingTickets) {
      if (!ticket.buyer_email) continue;
      
      const key = `${ticket.buyer_email}-${ticket.raffle_id}`;
      if (!groupedByBuyer.has(key)) {
        groupedByBuyer.set(key, []);
      }
      groupedByBuyer.get(key)!.push(ticket);
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const [key, tickets] of groupedByBuyer) {
      const firstTicket = tickets[0];
      const buyerEmail = firstTicket.buyer_email;
      const buyerName = firstTicket.buyer_name || "Participante";
      const raffleTitle = (firstTicket.raffles as any)?.title || "Sorteo";
      const orgSlug = (firstTicket.raffles as any)?.organizations?.slug || "";
      const raffleSlug = (firstTicket.raffles as any)?.slug || "";
      const reservedUntil = new Date(firstTicket.reserved_until!);
      
      // Calculate minutes remaining
      const minutesRemaining = Math.max(0, Math.round((reservedUntil.getTime() - now.getTime()) / 60000));
      
      const ticketNumbers = tickets.map(t => t.ticket_number);
      
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
              minutes_remaining: minutesRemaining,
              payment_url: paymentUrl,
            },
          },
        });

        if (emailError) {
          console.error(`Error sending reminder to ${buyerEmail}:`, emailError);
          errors.push(`${buyerEmail}: ${emailError.message}`);
        } else {
          console.log(`Reminder sent to ${buyerEmail} for ${ticketNumbers.length} tickets`);
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
