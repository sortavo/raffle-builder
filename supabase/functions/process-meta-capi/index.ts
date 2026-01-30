import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MetaCapiEvent {
  id: string;
  event_type: string;
  event_data: {
    orderId?: string;
    raffleId?: string;
    raffleName?: string;
    value?: number;
    currency?: string;
    ticketCount?: number;
    buyerEmail?: string;
    buyerPhone?: string;
    buyerName?: string;
    buyerCity?: string;
    eventSourceUrl?: string;
    pixelId?: string;
    [key: string]: unknown;
  };
  organization_id: string | null;
  created_at: string;
}

// Hash user data for Meta CAPI (SHA256)
async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Normalize phone number for hashing
function normalizePhone(phone: string): string {
  // Remove all non-numeric characters except +
  let normalized = phone.replace(/[^\d+]/g, "");
  // Ensure it has country code (default to Mexico +52)
  if (!normalized.startsWith("+")) {
    if (normalized.startsWith("52")) {
      normalized = "+" + normalized;
    } else {
      normalized = "+52" + normalized;
    }
  }
  return normalized;
}

// Build Meta CAPI event payload
async function buildMetaEvent(
  event: MetaCapiEvent,
  accessToken: string
): Promise<{
  pixelId: string;
  payload: Record<string, unknown>;
}> {
  const data = event.event_data;
  const eventTime = Math.floor(new Date(event.created_at).getTime() / 1000);

  // User data hashing
  const userData: Record<string, string> = {};

  if (data.buyerEmail) {
    userData.em = await hashData(data.buyerEmail);
  }
  if (data.buyerPhone) {
    userData.ph = await hashData(normalizePhone(data.buyerPhone));
  }
  if (data.buyerName) {
    const names = data.buyerName.trim().split(/\s+/);
    if (names.length > 0) {
      userData.fn = await hashData(names[0]);
    }
    if (names.length > 1) {
      userData.ln = await hashData(names[names.length - 1]);
    }
  }
  if (data.buyerCity) {
    userData.ct = await hashData(data.buyerCity);
  }
  // Default country to Mexico
  userData.country = await hashData("mx");

  // Map internal event types to Meta standard events
  const eventNameMap: Record<string, string> = {
    PageView: "PageView",
    Lead: "Lead",
    StartTrial: "StartTrial",
    Subscribe: "Subscribe",
    Purchase: "Purchase",
    ViewContent: "ViewContent",
    CompleteRegistration: "CompleteRegistration",
  };

  const eventName = eventNameMap[event.event_type] || event.event_type;

  // Build custom data based on event type
  const customData: Record<string, unknown> = {};

  if (data.value !== undefined) {
    customData.value = data.value;
    customData.currency = data.currency || "MXN";
  }

  if (data.orderId) {
    customData.order_id = data.orderId;
  }

  if (data.raffleId) {
    customData.content_ids = [data.raffleId];
    customData.content_type = "product";
  }

  if (data.raffleName) {
    customData.content_name = data.raffleName;
  }

  if (data.ticketCount) {
    customData.num_items = data.ticketCount;
  }

  // Use organization's pixel or fallback to Sortavo's
  const pixelId = data.pixelId || Deno.env.get("SORTAVO_META_PIXEL_ID") || "1215706887335413";

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_source_url: data.eventSourceUrl || "https://www.sortavo.com",
        action_source: "website",
        user_data: userData,
        custom_data: Object.keys(customData).length > 0 ? customData : undefined,
      },
    ],
    access_token: accessToken,
  };

  return { pixelId, payload };
}

// Send event to Meta CAPI
async function sendToMetaCapi(
  pixelId: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta CAPI error:", result);
      return {
        success: false,
        error: result.error?.message || `HTTP ${response.status}`,
      };
    }

    console.log("Meta CAPI success:", result);
    return { success: true };
  } catch (error) {
    console.error("Meta CAPI fetch error:", error);
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("META_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "META_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch pending events from queue (max 50 per run)
    const { data: events, error: fetchError } = await supabase
      .from("meta_capi_queue")
      .select("*")
      .is("processed_at", null)
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching queue:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending events", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${events.length} Meta CAPI events`);

    let processed = 0;
    let failed = 0;

    for (const event of events as MetaCapiEvent[]) {
      try {
        const { pixelId, payload } = await buildMetaEvent(event, accessToken);
        const result = await sendToMetaCapi(pixelId, payload);

        if (result.success) {
          // Mark as processed
          await supabase
            .from("meta_capi_queue")
            .update({ processed_at: new Date().toISOString(), error: null })
            .eq("id", event.id);
          processed++;
        } else {
          // Increment retry count and store error
          await supabase
            .from("meta_capi_queue")
            .update({
              retry_count: (event as unknown as { retry_count: number }).retry_count + 1,
              error: result.error,
            })
            .eq("id", event.id);
          failed++;
        }
      } catch (err) {
        console.error(`Error processing event ${event.id}:`, err);
        await supabase
          .from("meta_capi_queue")
          .update({
            retry_count: (event as unknown as { retry_count: number }).retry_count + 1,
            error: String(err),
          })
          .eq("id", event.id);
        failed++;
      }
    }

    console.log(`Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ processed, failed, total: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-meta-capi:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
