import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting notification cleanup job...");

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff date (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`Deleting read notifications older than: ${cutoffDate}`);

    // Delete read notifications older than 30 days
    const { data, error, count } = await supabase
      .from("notifications")
      .delete()
      .eq("read", true)
      .lt("created_at", cutoffDate)
      .select("id");

    if (error) {
      console.error("Error deleting notifications:", error);
      throw error;
    }

    const deletedCount = data?.length || 0;
    console.log(`Successfully deleted ${deletedCount} old notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${deletedCount} read notifications older than 30 days`,
        deletedCount,
        cutoffDate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Cleanup job failed:", errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
