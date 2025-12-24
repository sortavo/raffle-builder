import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan tiers
const PRODUCT_TO_TIER: Record<string, string> = {
  "prod_Tf5pTKxFYtPfd4": "basic",
  "prod_Tf5pa9W3qgWVFB": "basic",
  "prod_Tf5tsw8mmJQneA": "pro",
  "prod_Tf5tT8tG04qFOn": "pro",
  "prod_Tf5uiAAHV2WZNF": "premium",
  "prod_Tf5uRIGm04Ihh3": "premium",
};

const TIER_LIMITS: Record<string, { maxActiveRaffles: number; maxTicketsPerRaffle: number; templatesAvailable: number }> = {
  basic: { maxActiveRaffles: 2, maxTicketsPerRaffle: 2000, templatesAvailable: 1 },
  pro: { maxActiveRaffles: 15, maxTicketsPerRaffle: 30000, templatesAvailable: 6 },
  premium: { maxActiveRaffles: 999, maxTicketsPerRaffle: 100000, templatesAvailable: 6 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: null,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let tier = null;
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const productId = subscription.items.data[0].price.product as string;
      tier = PRODUCT_TO_TIER[productId] || "basic";
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        tier, 
        endDate: subscriptionEnd 
      });

      // Update organization with subscription info
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const limits = TIER_LIMITS[tier];
        await supabaseClient
          .from("organizations")
          .update({
            subscription_tier: tier,
            subscription_status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSubscriptionId,
            max_active_raffles: limits.maxActiveRaffles,
            max_tickets_per_raffle: limits.maxTicketsPerRaffle,
            templates_available: limits.templatesAvailable,
          })
          .eq("id", profile.organization_id);
        logStep("Organization updated", { organizationId: profile.organization_id });
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
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
