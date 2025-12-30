import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] [${timestamp}] ${step}${detailsStr}`);
};

// Map Stripe product IDs to subscription tiers
// Includes both PRODUCTION and TEST mode product IDs
const PRODUCT_TO_TIER: Record<string, "basic" | "pro" | "premium" | "enterprise"> = {
  // Production IDs
  "prod_Tf5pTKxFYtPfd4": "basic",
  "prod_Tf5tsw8mmJQneA": "pro",
  "prod_Tf5uiAAHV2WZNF": "premium",
  "prod_ThHMyhLAztHnsu": "enterprise",
  "prod_ThHMbFCP3wSrq8": "enterprise",
  // Test IDs
  "prod_ThK1EiE0AtKCIM": "basic",
  "prod_ThK1JlY6NKTIFS": "basic",  // Annual
  "prod_ThK1LTy6UcPdrl": "pro",
  "prod_ThK1C9kzAMf4h9": "pro",     // Annual
  "prod_ThK1L4ZhLIMS0C": "premium",
  "prod_ThK1pF8uFNd4yB": "premium", // Annual
  "prod_ThK18K9yms0nxs": "enterprise",
  "prod_ThK1X1RtiwN326": "enterprise", // Annual
};

// Subscription limits by tier
const TIER_LIMITS = {
  basic: { maxActiveRaffles: 2, maxTicketsPerRaffle: 2000, templatesAvailable: 1 },
  pro: { maxActiveRaffles: 7, maxTicketsPerRaffle: 30000, templatesAvailable: 6 },
  premium: { maxActiveRaffles: 15, maxTicketsPerRaffle: 100000, templatesAvailable: 6 },
  enterprise: { maxActiveRaffles: 999, maxTicketsPerRaffle: 10000000, templatesAvailable: 6 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook request received", { 
      method: req.method,
      hasSignature: !!req.headers.get("stripe-signature"),
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const isProduction = Deno.env.get("ENVIRONMENT") === "production" || 
                         !Deno.env.get("ENVIRONMENT"); // Default to production-like behavior
    
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not configured");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    
    // CRITICAL: In production, webhook secret is MANDATORY
    if (!webhookSecret && isProduction) {
      logStep("CRITICAL: STRIPE_WEBHOOK_SECRET not configured in production - rejecting request");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // CRITICAL: Always verify webhook signature in production
    if (webhookSecret) {
      if (!signature) {
        logStep("ERROR: Missing stripe-signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified", { eventType: event.type });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errorMessage });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Only allow unverified webhooks in development
      logStep("WARNING: Processing webhook without signature verification (development mode only)");
      event = JSON.parse(body);
    }

    // Check for duplicate events
    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("event_id", event.id)
      .single();

    if (existingEvent) {
      logStep("Duplicate event, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the event
    await supabaseAdmin.from("stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
    });

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabaseAdmin, stripe, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(supabaseAdmin, stripe, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabaseAdmin, stripe, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseAdmin, stripe, invoice);
        break;
      }

      case "customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerUpdated(supabaseAdmin, customer);
        break;
      }

      case "payment_method.attached":
      case "payment_method.detached": {
        logStep("Payment method event received", { eventType: event.type });
        // These events are informational - the customer portal handles card management
        break;
      }

      default:
        logStep("Unhandled event type", { eventType: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionChange(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  logStep("Handling subscription change", {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer,
  });

  const customerId = typeof subscription.customer === "string" 
    ? subscription.customer 
    : subscription.customer.id;

  // Get customer email
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    logStep("Customer was deleted, skipping");
    return;
  }

  const email = customer.email;
  if (!email) {
    logStep("No email found for customer", { customerId });
    return;
  }

  // Find organization by email
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("email", email)
    .single();

  if (orgError || !org) {
    logStep("Organization not found", { email, error: orgError?.message });
    return;
  }

  // Determine tier from product
  const productId = subscription.items.data[0]?.price?.product as string;
  const tier = PRODUCT_TO_TIER[productId] || "basic";
  const limits = TIER_LIMITS[tier];

  // Determine billing period
  const priceInterval = subscription.items.data[0]?.price?.recurring?.interval;
  const subscriptionPeriod = priceInterval === "year" ? "annual" : "monthly";

  // Map Stripe status to our status
  let subscriptionStatus: "active" | "canceled" | "past_due" | "trial" = "active";
  if (subscription.status === "canceled") {
    subscriptionStatus = "canceled";
  } else if (subscription.status === "past_due") {
    subscriptionStatus = "past_due";
  } else if (subscription.status === "trialing") {
    subscriptionStatus = "trial";
  }

  // Update organization
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      subscription_tier: tier,
      subscription_status: subscriptionStatus,
      subscription_period: subscriptionPeriod,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      max_active_raffles: limits.maxActiveRaffles,
      max_tickets_per_raffle: limits.maxTicketsPerRaffle,
      templates_available: limits.templatesAvailable,
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
    })
    .eq("id", org.id);

  if (updateError) {
    logStep("Failed to update organization", { error: updateError.message });
  } else {
    logStep("Organization updated successfully", {
      orgId: org.id,
      tier,
      status: subscriptionStatus,
      period: subscriptionPeriod,
    });
  }

  // Create notification for the user
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (profile) {
    await supabase.from("notifications").insert({
      user_id: profile.id,
      organization_id: org.id,
      type: "subscription",
      title: getSubscriptionNotificationTitle(subscription.status, tier),
      message: getSubscriptionNotificationMessage(subscription.status, tier),
      link: "/dashboard/settings",
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCanceled(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  logStep("Handling subscription cancellation", {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) return;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("email", customer.email)
    .single();

  if (!org) return;

  // Reset to basic tier limits
  const basicLimits = TIER_LIMITS.basic;

  await supabase
    .from("organizations")
    .update({
      subscription_tier: "basic",
      subscription_status: "canceled",
      stripe_subscription_id: null,
      max_active_raffles: basicLimits.maxActiveRaffles,
      max_tickets_per_raffle: basicLimits.maxTicketsPerRaffle,
      templates_available: basicLimits.templatesAvailable,
    })
    .eq("id", org.id);

  logStep("Subscription canceled, reverted to basic", { orgId: org.id });

  // Create cancellation notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (profile) {
    await supabase.from("notifications").insert({
      user_id: profile.id,
      organization_id: org.id,
      type: "subscription",
      title: "Suscripción cancelada",
      message: "Tu suscripción ha sido cancelada. Has vuelto al plan Basic.",
      link: "/dashboard/settings",
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentSucceeded(
  supabase: any,
  stripe: Stripe,
  invoice: Stripe.Invoice
) {
  if (!invoice.subscription) return;

  logStep("Payment succeeded", {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    amount: invoice.amount_paid,
  });

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) return;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("email", customer.email)
    .single();

  if (!org) return;

  // Update status to active if it was past_due
  await supabase
    .from("organizations")
    .update({ subscription_status: "active" })
    .eq("id", org.id)
    .eq("subscription_status", "past_due");

  logStep("Payment recorded", { orgId: org.id });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentFailed(
  supabase: any,
  stripe: Stripe,
  invoice: Stripe.Invoice
) {
  if (!invoice.subscription) return;

  logStep("Payment failed", {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    attemptCount: invoice.attempt_count,
  });

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) return;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("email", customer.email)
    .single();

  if (!org) return;

  // Update status to past_due
  await supabase
    .from("organizations")
    .update({ subscription_status: "past_due" })
    .eq("id", org.id);

  logStep("Organization marked as past_due", { orgId: org.id });

  // Create notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (profile) {
    await supabase.from("notifications").insert({
      user_id: profile.id,
      organization_id: org.id,
      type: "payment_failed",
      title: "Pago fallido",
      message: `No pudimos procesar tu pago. Por favor, actualiza tu método de pago para evitar la suspensión del servicio.`,
      link: "/dashboard/settings",
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCustomerUpdated(
  supabase: any,
  customer: Stripe.Customer
) {
  if (!customer.email) return;

  logStep("Customer updated", {
    customerId: customer.id,
    email: customer.email,
  });

  // Update stripe_customer_id if not set
  await supabase
    .from("organizations")
    .update({ stripe_customer_id: customer.id })
    .eq("email", customer.email)
    .is("stripe_customer_id", null);
}

function getSubscriptionNotificationTitle(status: string, tier: string): string {
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  
  switch (status) {
    case "active":
      return `Plan ${tierName} activado`;
    case "trialing":
      return `Prueba de ${tierName} iniciada`;
    case "past_due":
      return "Pago pendiente";
    default:
      return "Actualización de suscripción";
  }
}

function getSubscriptionNotificationMessage(status: string, tier: string): string {
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  
  switch (status) {
    case "active":
      return `Tu plan ${tierName} está activo. ¡Disfruta de todas las funciones!`;
    case "trialing":
      return `Tu período de prueba del plan ${tierName} ha comenzado.`;
    case "past_due":
      return "Tu pago está pendiente. Por favor, actualiza tu método de pago.";
    default:
      return "Tu suscripción ha sido actualizada.";
  }
}
