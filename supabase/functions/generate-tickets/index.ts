import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GENERATE-TICKETS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { raffle_id, force_rebuild = false } = await req.json();
    if (!raffle_id) throw new Error("raffle_id is required");
    logStep("Processing raffle", { raffle_id, force_rebuild });

    // Get raffle details
    const { data: raffle, error: raffleError } = await supabaseClient
      .from("raffles")
      .select("*")
      .eq("id", raffle_id)
      .single();

    if (raffleError) throw raffleError;
    if (!raffle) throw new Error("Raffle not found");

    const totalTickets = raffle.total_tickets;
    const format = raffle.ticket_number_format || "sequential";

    logStep("Raffle found", { total_tickets: totalTickets, format });

    // Check existing tickets
    const { count: existingCount, error: countError } = await supabaseClient
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("raffle_id", raffle_id);

    if (countError) throw countError;

    logStep("Existing tickets count", { existingCount, totalTickets });

    // If tickets already exist and match total_tickets, we're done
    if (existingCount && existingCount === totalTickets) {
      logStep("Tickets already match total_tickets", { count: existingCount });
      return new Response(
        JSON.stringify({ success: true, message: "Tickets already generated correctly", count: existingCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // If there are existing tickets but count doesn't match, check if we can rebuild
    if (existingCount && existingCount > 0 && existingCount !== totalTickets) {
      logStep("Ticket count mismatch, checking if rebuild is safe", { existingCount, totalTickets });

      // Check if any tickets are not available (sold or reserved)
      const { count: nonAvailableCount, error: nonAvailableError } = await supabaseClient
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("raffle_id", raffle_id)
        .neq("status", "available");

      if (nonAvailableError) throw nonAvailableError;

      if (nonAvailableCount && nonAvailableCount > 0 && !force_rebuild) {
        logStep("Cannot rebuild - tickets already sold/reserved", { nonAvailableCount });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `No se pueden regenerar los boletos porque ${nonAvailableCount} ya están vendidos o reservados`,
            nonAvailableCount 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Delete all existing tickets to rebuild
      logStep("Deleting existing tickets to rebuild");
      const { error: deleteError } = await supabaseClient
        .from("tickets")
        .delete()
        .eq("raffle_id", raffle_id);

      if (deleteError) {
        logStep("Error deleting tickets", { error: deleteError.message });
        throw deleteError;
      }
      logStep("Deleted existing tickets successfully");
    }

    // Generate ticket numbers
    const batchSize = 10000;
    const batches = Math.ceil(totalTickets / batchSize);
    const digits = Math.max(3, totalTickets.toString().length);

    logStep("Starting ticket generation", { totalTickets, format, batches, digits });

    let ticketNumbers: string[] = [];

    if (format === "random") {
      // Generate random unique numbers
      const numbers = new Set<number>();
      const max = totalTickets * 10;
      while (numbers.size < totalTickets) {
        numbers.add(Math.floor(Math.random() * max) + 1);
      }
      ticketNumbers = Array.from(numbers)
        .sort((a, b) => a - b)
        .map(n => n.toString().padStart(digits, "0"));
    } else if (format === "prefixed") {
      // Use organization prefix or default
      const prefix = "TKT";
      for (let i = 1; i <= totalTickets; i++) {
        ticketNumbers.push(`${prefix}-${i.toString().padStart(digits, "0")}`);
      }
    } else {
      // Sequential
      for (let i = 1; i <= totalTickets; i++) {
        ticketNumbers.push(i.toString().padStart(digits, "0"));
      }
    }

    // Insert in batches
    let insertedCount = 0;
    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, totalTickets);
      const batchNumbers = ticketNumbers.slice(start, end);

      const tickets = batchNumbers.map(ticketNumber => ({
        raffle_id,
        ticket_number: ticketNumber,
        status: "available",
      }));

      const { error: insertError } = await supabaseClient
        .from("tickets")
        .insert(tickets);

      if (insertError) {
        logStep("Batch insert error", { batch, error: insertError.message });
        throw insertError;
      }

      insertedCount += batchNumbers.length;
      logStep("Batch inserted", { batch: batch + 1, of: batches, inserted: insertedCount });
    }

    logStep("Ticket generation complete", { total: insertedCount });

    return new Response(
      JSON.stringify({ success: true, count: insertedCount, rebuilt: existingCount !== null && existingCount > 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
