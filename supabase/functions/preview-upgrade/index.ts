import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { STRIPE_API_VERSION } from "../_shared/stripe-config.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'preview-upgrade');
  const log = createLogger(ctx);

  try {
    log.info("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    log.info("Stripe key verified");

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
    
    const enrichedCtx = enrichContext(ctx, { userId: user.id });
    const enrichedLog = createLogger(enrichedCtx);
    enrichedLog.info("User authenticated", { email: user.email });

    // Get request body
    const { priceId, planName, currentPlanName } = await req.json();
    if (!priceId) throw new Error("priceId is required");
    enrichedLog.info("Request parsed", { priceId, planName, currentPlanName });

    // Get user's organization with subscription info
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("Could not find user's organization");
    }
    
    const finalCtx = enrichContext(enrichedCtx, { orgId: profile.organization_id });
    const finalLog = createLogger(finalCtx);
    finalLog.info("Found profile");

    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("stripe_subscription_id, stripe_customer_id, subscription_tier")
      .eq("id", profile.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error("Could not find organization");
    }
    finalLog.info("Found organization", { 
      subscriptionId: org.stripe_subscription_id,
      customerId: org.stripe_customer_id,
      currentTier: org.subscription_tier
    });

    if (!org.stripe_subscription_id || !org.stripe_customer_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

    // Retrieve current subscription to get subscription item ID and current price
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    finalLog.info("Retrieved subscription", { 
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
    
    // Detect if user is in trial period
    const isInTrial = subscription.status === "trialing";
    
    finalLog.info("Price comparison", { 
      currentPriceId,
      currentAmount,
      newPriceId: priceId,
      newAmount,
      isDowngrade,
      isInTrial,
      trialEnd: subscription.trial_end,
    });

    // Calculate next billing date
    const nextBillingDate = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    // For trial upgrades: show full price of new plan (trial will end immediately)
    if (isInTrial && !isDowngrade) {
      finalLog.info("Trial upgrade - returning full price preview");
      
      // Calculate new billing date based on plan interval (30 days for monthly, 1 year for annual)
      const newPriceRecurring = newPrice.recurring;
      const interval = newPriceRecurring?.interval || "month";
      const nextBilling = new Date();
      if (interval === "year") {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      } else {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      }

      const response = {
        amount_due: newPrice.unit_amount || 0, // Full price of new plan
        currency: newPrice.currency || "usd",
        proration_details: {
          credit: 0,
          debit: 0,
          items: [],
        },
        effective_date: new Date().toISOString(),
        next_billing_date: nextBilling.toISOString(),
        new_plan_name: planName || "Nuevo Plan",
        old_plan_name: "Basic (Prueba Gratuita)",
        is_downgrade: false,
        is_trial_upgrade: true,
        trial_message: "Tu período de prueba terminará y se cobrará el precio completo del nuevo plan inmediatamente.",
      };

      finalLog.info("Request completed", { durationMs: log.duration() });
      return corsJsonResponse(req, response, 200);
    }

    // For downgrades: no proration, change applies at next billing cycle
    if (isDowngrade) {
      finalLog.info("Downgrade detected - returning simplified preview");
      
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

      finalLog.info("Request completed", { durationMs: log.duration() });
      return corsJsonResponse(req, response, 200);
    }

    // For upgrades: get proration details using createPreview (API 2025-08-27.basil)
    const previewInvoice = await stripe.invoices.createPreview({
      customer: org.stripe_customer_id,
      subscription: org.stripe_subscription_id,
      subscription_details: {
        items: [{
          id: subscriptionItemId,
          price: priceId,
        }],
        proration_behavior: "always_invoice",
      },
    });
    finalLog.info("Retrieved invoice preview", {
      amountDue: previewInvoice.amount_due,
      currency: previewInvoice.currency,
      linesCount: previewInvoice.lines.data.length
    });

    // Parse line items to get proration details
    let creditAmount = 0;
    let debitAmount = 0;
    const prorationItems: { description: string; amount: number }[] = [];

    for (const line of previewInvoice.lines.data) {
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
      amount_due: previewInvoice.amount_due, // in cents
      currency: previewInvoice.currency,
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

    finalLog.info("Preview calculated successfully", {
      amountDue: response.amount_due,
      credit: creditAmount,
      debit: debitAmount,
      isDowngrade: false,
      durationMs: log.duration()
    });

    return corsJsonResponse(req, response, 200);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'preview-upgrade',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
