import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { priceId } = await req.json();
    if (!priceId) throw new Error("priceId is required");
    logStep("Request parsed", { priceId });

    // Get user's organization with subscription info
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("Could not find user's organization");
    }
    logStep("Found profile", { organizationId: profile.organization_id });

    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Could not find organization");
    }
    logStep("Found organization", { 
      subscriptionId: org.stripe_subscription_id,
      customerId: org.stripe_customer_id 
    });

    if (!org.stripe_subscription_id) {
      throw new Error("No active subscription found. Please create a new subscription.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve current subscription
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    logStep("Retrieved subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      itemsCount: subscription.items.data.length
    });

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      throw new Error(`Subscription is not active. Current status: ${subscription.status}`);
    }

    // Get the subscription item ID (assuming single item subscription)
    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new Error("No subscription item found");
    }
    logStep("Found subscription item", { subscriptionItemId });

    // Get current and new prices to determine if it's an upgrade or downgrade
    const currentPriceId = subscription.items.data[0]?.price.id;
    const currentPrice = await stripe.prices.retrieve(currentPriceId);
    const newPrice = await stripe.prices.retrieve(priceId);
    
    const currentAmount = currentPrice.unit_amount || 0;
    const newAmount = newPrice.unit_amount || 0;
    const isDowngrade = newAmount < currentAmount;
    
    logStep("Price comparison", { 
      currentPriceId,
      currentAmount,
      newPriceId: priceId,
      newAmount,
      isDowngrade
    });

    // Update the subscription with the new price
    // For upgrades: charge the difference immediately (always_invoice)
    // For downgrades: no proration, change applies at next billing cycle (none)
    const updatedSubscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{
        id: subscriptionItemId,
        price: priceId,
      }],
      proration_behavior: isDowngrade ? "none" : "always_invoice",
    });
    logStep("Subscription updated successfully", { 
      newStatus: updatedSubscription.status,
      newPriceId: priceId,
      prorationBehavior: isDowngrade ? "none" : "always_invoice"
    });

    // Get the latest invoice to show what was charged (only relevant for upgrades)
    let amountCharged = 0;
    let currency = "usd";
    
    if (!isDowngrade) {
      const latestInvoice = await stripe.invoices.list({
        subscription: org.stripe_subscription_id,
        limit: 1,
      });
      
      amountCharged = latestInvoice.data[0]?.amount_paid || 0;
      currency = latestInvoice.data[0]?.currency || "usd";
      logStep("Fetched invoice details", { amountCharged, currency });
    }

    const nextBillingDate = updatedSubscription.current_period_end 
      ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
      : null;

    logStep("Upgrade completed", { isDowngrade, amountCharged, nextBillingDate });

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
        },
        is_downgrade: isDowngrade,
        amount_charged: amountCharged,
        currency: currency,
        next_billing_date: nextBillingDate,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
