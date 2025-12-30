import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUBSCRIPTION-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error(`Authentication error: ${userError?.message || "No user found"}`);
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("No organization found for user");
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Organization not found");
    }

    logStep("Organization found", {
      orgId: org.id,
      tier: org.subscription_tier,
      status: org.subscription_status,
    });

    // If there's a Stripe subscription, verify with Stripe
    let stripeData = null;
    if (org.stripe_subscription_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        
        try {
          const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
          
          // Safe timestamp conversion to prevent "Invalid time value" errors
          let currentPeriodEndISO: string | null = null;
          if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
            try {
              const date = new Date(subscription.current_period_end * 1000);
              if (!isNaN(date.getTime())) {
                currentPeriodEndISO = date.toISOString();
              }
            } catch {
              currentPeriodEndISO = null;
            }
          }
          
          stripeData = {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: currentPeriodEndISO,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          };
          logStep("Stripe subscription retrieved", stripeData);
        } catch (stripeError) {
          logStep("Stripe subscription not found", { error: String(stripeError) });
        }
      }
    }

    return new Response(JSON.stringify({
      organization: {
        id: org.id,
        name: org.name,
        subscription_tier: org.subscription_tier,
        subscription_status: org.subscription_status,
        subscription_period: org.subscription_period,
        max_active_raffles: org.max_active_raffles,
        max_tickets_per_raffle: org.max_tickets_per_raffle,
        templates_available: org.templates_available,
        trial_ends_at: org.trial_ends_at,
        stripe_customer_id: org.stripe_customer_id,
        stripe_subscription_id: org.stripe_subscription_id,
      },
      stripe: stripeData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
