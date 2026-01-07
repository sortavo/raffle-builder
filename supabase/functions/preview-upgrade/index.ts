import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PREVIEW-UPGRADE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
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
    const { priceId, planName, currentPlanName } = await req.json();
    if (!priceId) throw new Error("priceId is required");
    logStep("Request parsed", { priceId, planName, currentPlanName });

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
      .select("stripe_subscription_id, stripe_customer_id, subscription_tier")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Could not find organization");
    }
    logStep("Found organization", { 
      subscriptionId: org.stripe_subscription_id,
      customerId: org.stripe_customer_id,
      currentTier: org.subscription_tier
    });

    if (!org.stripe_subscription_id || !org.stripe_customer_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve current subscription to get subscription item ID and current price
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    logStep("Retrieved subscription", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPriceId: subscription.items.data[0]?.price.id
    });

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      throw new Error("No subscription item found");
    }

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

    // Calculate next billing date
    const nextBillingDate = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    // For downgrades: no proration, change applies at next billing cycle
    if (isDowngrade) {
      logStep("Downgrade detected - returning simplified preview");
      
      const response = {
        amount_due: 0,
        currency: currentPrice.currency || "usd",
        proration_details: {
          credit: 0,
          debit: 0,
          items: [],
        },
        effective_date: nextBillingDate, // Change applies at period end
        next_billing_date: nextBillingDate,
        new_plan_name: planName || "Nuevo Plan",
        old_plan_name: currentPlanName || org.subscription_tier || "Plan Actual",
        is_downgrade: true,
        message: "El cambio se aplicará al final de tu período actual. No hay cargos ni devoluciones.",
      };

      return corsJsonResponse(req, response, 200);
    }

    // For upgrades: get proration details
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: org.stripe_customer_id,
      subscription: org.stripe_subscription_id,
      subscription_items: [{
        id: subscriptionItemId,
        price: priceId,
      }],
      subscription_proration_behavior: "always_invoice",
    });
    logStep("Retrieved upcoming invoice", {
      amountDue: upcomingInvoice.amount_due,
      currency: upcomingInvoice.currency,
      linesCount: upcomingInvoice.lines.data.length
    });

    // Parse line items to get proration details
    let creditAmount = 0;
    let debitAmount = 0;
    const prorationItems: { description: string; amount: number }[] = [];

    for (const line of upcomingInvoice.lines.data) {
      if (line.proration) {
        if (line.amount < 0) {
          creditAmount += Math.abs(line.amount);
        } else {
          debitAmount += line.amount;
        }
        prorationItems.push({
          description: line.description || "Proration",
          amount: line.amount,
        });
      }
    }

    const response = {
      amount_due: upcomingInvoice.amount_due, // in cents
      currency: upcomingInvoice.currency,
      proration_details: {
        credit: creditAmount,
        debit: debitAmount,
        items: prorationItems,
      },
      effective_date: new Date().toISOString(),
      next_billing_date: nextBillingDate,
      new_plan_name: planName || "Nuevo Plan",
      old_plan_name: currentPlanName || org.subscription_tier || "Plan Actual",
      is_downgrade: false,
    };

    logStep("Preview calculated successfully", {
      amountDue: response.amount_due,
      credit: creditAmount,
      debit: debitAmount,
      isDowngrade: false
    });

    return corsJsonResponse(req, response, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
