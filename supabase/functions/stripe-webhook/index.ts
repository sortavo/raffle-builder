import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { enqueueJob } from '../_shared/job-queue.ts';
import { PRODUCT_TO_TIER, TIER_LIMITS } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Enhanced logging with severity levels
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const logStep = (step: string, details?: Record<string, unknown>, level: LogLevel = "INFO") => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  const prefix = `[STRIPE-WEBHOOK] [${timestamp}] [${level}]`;
  
  switch (level) {
    case "ERROR":
      console.error(`${prefix} ${step}${detailsStr}`);
      break;
    case "WARN":
      console.warn(`${prefix} ${step}${detailsStr}`);
      break;
    case "DEBUG":
      console.debug(`${prefix} ${step}${detailsStr}`);
      break;
    default:
      console.log(`${prefix} ${step}${detailsStr}`);
  }
};

// Safe timestamp conversion helper to prevent "Invalid time value" errors
function safeTimestampToISO(timestamp: number | null | undefined): string | null {
  if (timestamp === null || timestamp === undefined || typeof timestamp !== 'number') {
    return null;
  }
  try {
    const date = new Date(timestamp * 1000);
    // Verify the date is valid before converting
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

// Events that should be processed asynchronously to avoid Stripe timeout
const ASYNC_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];


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
    const requestId = crypto.randomUUID().slice(0, 8);
    
    logStep("Webhook request received", { 
      requestId,
      method: req.method,
      hasSignature: !!req.headers.get("stripe-signature"),
      contentLength: req.headers.get("content-length"),
      userAgent: req.headers.get("user-agent")?.slice(0, 50),
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const isProduction = Deno.env.get("ENVIRONMENT") === "production" || 
                         !Deno.env.get("ENVIRONMENT"); // Default to production-like behavior
    
    logStep("Environment check", { 
      requestId,
      hasStripeKey: !!stripeKey,
      stripeKeyPrefix: stripeKey?.slice(0, 7),
      hasWebhookSecret: !!webhookSecret,
      isProduction,
    }, "DEBUG");
    
    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY not configured", { requestId }, "ERROR");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    
    // CRITICAL: Webhook secret is ALWAYS required - no exceptions
    // This prevents fake event injection in ANY environment
    if (!webhookSecret) {
      logStep("STRIPE_WEBHOOK_SECRET not configured - REJECTING for security", { 
        isProduction,
        hasStripeKey: !!stripeKey 
      }, "ERROR");
      return new Response(JSON.stringify({ 
        error: "Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET environment variable.",
        code: "WEBHOOK_SECRET_REQUIRED"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // CRITICAL: Always verify webhook signature - webhookSecret is guaranteed to exist here
    if (!signature) {
      logStep("Missing stripe-signature header", {}, "ERROR");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { 
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
        apiVersion: event.api_version,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { 
        error: errorMessage,
      }, "ERROR");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate events
    const { data: existingEvent, error: dupeCheckError } = await supabaseAdmin
      .from("stripe_events")
      .select("id")
      .eq("event_id", event.id)
      .single();

    if (dupeCheckError && dupeCheckError.code !== "PGRST116") {
      logStep("Error checking for duplicate event", { error: dupeCheckError.message }, "WARN");
    }

    if (existingEvent) {
      logStep("Duplicate event, skipping", { eventId: event.id, eventType: event.type }, "DEBUG");
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the event
    const { error: insertError } = await supabaseAdmin.from("stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
    });
    
    if (insertError) {
      logStep("Failed to record event", { eventId: event.id, error: insertError.message }, "WARN");
    }

    // Phase 9: Async processing for heavy events to avoid Stripe timeout
    const UPSTASH_REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const UPSTASH_REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (ASYNC_EVENTS.includes(event.type) && UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN) {
      try {
        const { jobId, success, error } = await enqueueJob(
          UPSTASH_REDIS_URL,
          UPSTASH_REDIS_TOKEN,
          'stripe-webhook-process',
          {
            eventId: event.id,
            eventType: event.type,
            eventData: event.data.object,
            livemode: event.livemode,
            receivedAt: Date.now(),
          },
          { priority: 'high', maxAttempts: 5 }
        );

        if (success) {
          logStep("Event queued for async processing", { 
            eventId: event.id, 
            eventType: event.type,
            jobId 
          });
          
          // Respond immediately to Stripe (within 100ms)
          return new Response(
            JSON.stringify({ received: true, queued: true, jobId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          logStep("Failed to queue event, falling back to sync", { 
            eventId: event.id, 
            error 
          }, "WARN");
          // Fall through to synchronous processing
        }
      } catch (queueError) {
        logStep("Queue error, falling back to sync", { 
          eventId: event.id, 
          error: String(queueError) 
        }, "WARN");
        // Fall through to synchronous processing
      }
    }

    // Handle different event types (sync fallback or non-async events)
    const startTime = Date.now();
    logStep("Processing event", { eventId: event.id, eventType: event.type });
    
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabaseAdmin, stripe, subscription, event.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(supabaseAdmin, stripe, subscription, event.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabaseAdmin, stripe, invoice, event.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseAdmin, stripe, invoice, event.id);
        break;
      }

      case "customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerUpdated(supabaseAdmin, customer, event.id);
        break;
      }

      case "payment_method.attached":
      case "payment_method.detached": {
        logStep("Payment method event received (informational)", { eventType: event.type }, "DEBUG");
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(supabaseAdmin, stripe, subscription, event.id);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          mode: session.mode,
          paymentStatus: session.payment_status,
        });
        break;
      }

      default:
        logStep("Unhandled event type", { eventType: event.type }, "DEBUG");
    }

    const processingTime = Date.now() - startTime;
    logStep("Event processed successfully", { 
      eventId: event.id, 
      eventType: event.type, 
      processingTimeMs: processingTime,
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("Unhandled error in stripe-webhook", { 
      message: errorMessage,
      stack: errorStack?.slice(0, 500),
    }, "ERROR");
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
  subscription: Stripe.Subscription,
  eventId: string
) {
  const customerId = typeof subscription.customer === "string" 
    ? subscription.customer 
    : subscription.customer.id;

  logStep("handleSubscriptionChange started", {
    eventId,
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId,
    rawCurrentPeriodEnd: subscription.current_period_end,
    currentPeriodEnd: safeTimestampToISO(subscription.current_period_end),
    rawTrialEnd: subscription.trial_end,
    trialEnd: safeTimestampToISO(subscription.trial_end),
    itemsCount: subscription.items.data.length,
  });

  // Get customer email
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    logStep("Customer was deleted, skipping", { customerId, eventId }, "WARN");
    return;
  }

  const email = customer.email;
  if (!email) {
    logStep("No email found for customer", { customerId, eventId }, "WARN");
    return;
  }

  logStep("Customer retrieved", { customerId, email, eventId }, "DEBUG");

  // Find organization using cascaded search for reliability
  let org = null;

  // 1. First try by organization_id from subscription metadata (most reliable for new subscriptions)
  const orgIdFromMeta = subscription.metadata?.organization_id;
  if (orgIdFromMeta) {
    const { data: orgByMeta } = await supabase
      .from("organizations")
      .select("id, subscription_tier, subscription_status")
      .eq("id", orgIdFromMeta)
      .single();
    if (orgByMeta) {
      org = orgByMeta;
      logStep("Organization found by metadata", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 2. If not found, try by stripe_customer_id (reliable for renewals)
  if (!org) {
    const { data: orgByCustomer } = await supabase
      .from("organizations")
      .select("id, subscription_tier, subscription_status")
      .eq("stripe_customer_id", customerId)
      .single();
    if (orgByCustomer) {
      org = orgByCustomer;
      logStep("Organization found by stripe_customer_id", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 3. If not found, try by organization email
  if (!org) {
    const { data: orgByEmail } = await supabase
      .from("organizations")
      .select("id, subscription_tier, subscription_status")
      .eq("email", email)
      .single();
    if (orgByEmail) {
      org = orgByEmail;
      logStep("Organization found by org email", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 4. If still not found, try by profile email -> get organization_id
  if (!org) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("email", email)
      .single();
    
    if (profileData?.organization_id) {
      const { data: orgByProfile } = await supabase
        .from("organizations")
        .select("id, subscription_tier, subscription_status")
        .eq("id", profileData.organization_id)
        .single();
      if (orgByProfile) {
        org = orgByProfile;
        logStep("Organization found via profile email", { orgId: org.id, profileEmail: email, eventId }, "DEBUG");
      }
    }
  }

  if (!org) {
    logStep("Organization not found by any method", { 
      email, 
      customerId,
      orgIdFromMeta,
      eventId,
    }, "WARN");
    return;
  }

  logStep("Organization resolved", { 
    orgId: org.id, 
    currentTier: org.subscription_tier,
    currentStatus: org.subscription_status,
    eventId,
  }, "DEBUG");

  // Determine tier from product
  const priceItem = subscription.items.data[0];
  const productId = priceItem?.price?.product as string;
  const priceId = priceItem?.price?.id;
  const tier = PRODUCT_TO_TIER[productId] || "basic";
  const limits = TIER_LIMITS[tier];

  logStep("Tier determined from product", { 
    productId, 
    priceId,
    tier, 
    isKnownProduct: !!PRODUCT_TO_TIER[productId],
    limits,
    eventId,
  }, "DEBUG");

  // Determine billing period
  const priceInterval = priceItem?.price?.recurring?.interval;
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

  logStep("Subscription status mapped", { 
    stripeStatus: subscription.status,
    mappedStatus: subscriptionStatus,
    period: subscriptionPeriod,
    eventId,
  }, "DEBUG");

  // Update organization
  const updatePayload = {
    subscription_tier: tier,
    subscription_status: subscriptionStatus,
    subscription_period: subscriptionPeriod,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    max_active_raffles: limits.maxActiveRaffles,
    max_tickets_per_raffle: limits.maxTicketsPerRaffle,
    templates_available: limits.templatesAvailable,
    trial_ends_at: safeTimestampToISO(subscription.trial_end),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    current_period_end: safeTimestampToISO(subscription.current_period_end),
  };

  const { error: updateError } = await supabase
    .from("organizations")
    .update(updatePayload)
    .eq("id", org.id);

  if (updateError) {
    logStep("Failed to update organization", { 
      orgId: org.id,
      error: updateError.message,
      errorCode: updateError.code,
      eventId,
    }, "ERROR");
  } else {
    logStep("Organization updated successfully", {
      eventId,
      orgId: org.id,
      previousTier: org.subscription_tier,
      newTier: tier,
      previousStatus: org.subscription_status,
      newStatus: subscriptionStatus,
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
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: profile.id,
      organization_id: org.id,
      type: "subscription",
      title: getSubscriptionNotificationTitle(subscription.status, tier),
      message: getSubscriptionNotificationMessage(subscription.status, tier),
      link: "/dashboard/settings",
    });
    
    if (notifError) {
      logStep("Failed to create notification", { error: notifError.message, eventId }, "WARN");
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionCanceled(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  eventId: string
) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  logStep("handleSubscriptionCanceled started", {
    eventId,
    subscriptionId: subscription.id,
    customerId,
    rawCanceledAt: subscription.canceled_at,
    canceledAt: safeTimestampToISO(subscription.canceled_at),
  });

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) return;

  const email = customer.email;

  // Find organization using cascaded search
  let org = null;

  // 1. First try by organization_id from subscription metadata
  const orgIdFromMeta = subscription.metadata?.organization_id;
  if (orgIdFromMeta) {
    const { data: orgByMeta } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("id", orgIdFromMeta)
      .single();
    if (orgByMeta) {
      org = orgByMeta;
      logStep("Canceled: Organization found by metadata", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 2. If not found, try by stripe_customer_id
  if (!org) {
    const { data: orgByCustomer } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("stripe_customer_id", customerId)
      .single();
    if (orgByCustomer) {
      org = orgByCustomer;
      logStep("Canceled: Organization found by stripe_customer_id", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 3. If not found, try by organization email
  if (!org) {
    const { data: orgByEmail } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("email", email)
      .single();
    if (orgByEmail) {
      org = orgByEmail;
      logStep("Canceled: Organization found by org email", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 4. If still not found, try by profile email
  if (!org) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("email", email)
      .single();
    
    if (profileData?.organization_id) {
      const { data: orgByProfile } = await supabase
        .from("organizations")
        .select("id, subscription_tier")
        .eq("id", profileData.organization_id)
        .single();
      if (orgByProfile) {
        org = orgByProfile;
        logStep("Canceled: Organization found via profile email", { orgId: org.id, eventId }, "DEBUG");
      }
    }
  }

  if (!org) {
    logStep("Canceled: Organization not found by any method", { email, customerId, eventId }, "WARN");
    return;
  }

  // Reset to basic tier limits
  const basicLimits = TIER_LIMITS.basic;

  const { error: updateError } = await supabase
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

  if (updateError) {
    logStep("Failed to update org on cancellation", { 
      orgId: org.id, 
      error: updateError.message,
      eventId,
    }, "ERROR");
  } else {
    logStep("Subscription canceled, reverted to basic", { 
      orgId: org.id,
      previousTier: org.subscription_tier,
      eventId,
    });
  }

  // Create cancellation notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (profile) {
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: profile.id,
      organization_id: org.id,
      type: "subscription",
      title: "Suscripción cancelada",
      message: "Tu suscripción ha sido cancelada. Has vuelto al plan Basic.",
      link: "/dashboard/settings",
    });
    
    if (notifError) {
      logStep("Failed to create cancellation notification", { error: notifError.message, eventId }, "WARN");
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePaymentSucceeded(
  supabase: any,
  stripe: Stripe,
  invoice: Stripe.Invoice,
  eventId: string
) {
  if (!invoice.subscription) {
    logStep("Invoice has no subscription, skipping", { invoiceId: invoice.id, eventId }, "DEBUG");
    return;
  }

  logStep("handlePaymentSucceeded started", {
    eventId,
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    billingReason: invoice.billing_reason,
  });

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) {
    logStep("Customer deleted or no email", { customerId, eventId }, "WARN");
    return;
  }

  const email = customer.email;

  // Find organization using cascaded search
  let org = null;

  // 1. First try by stripe_customer_id (most reliable for payments)
  const { data: orgByCustomer } = await supabase
    .from("organizations")
    .select("id, subscription_tier")
    .eq("stripe_customer_id", customerId)
    .single();
  if (orgByCustomer) {
    org = orgByCustomer;
    logStep("PaymentSuccess: Organization found by stripe_customer_id", { orgId: org.id, eventId }, "DEBUG");
  }

  // 2. If not found, try by organization email
  if (!org) {
    const { data: orgByEmail } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("email", email)
      .single();
    if (orgByEmail) {
      org = orgByEmail;
      logStep("PaymentSuccess: Organization found by org email", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 3. If still not found, try by profile email
  if (!org) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("email", email)
      .single();
    
    if (profileData?.organization_id) {
      const { data: orgByProfile } = await supabase
        .from("organizations")
        .select("id, subscription_tier")
        .eq("id", profileData.organization_id)
        .single();
      if (orgByProfile) {
        org = orgByProfile;
        logStep("PaymentSuccess: Organization found via profile email", { orgId: org.id, eventId }, "DEBUG");
      }
    }
  }

  if (!org) {
    logStep("PaymentSuccess: Organization not found by any method", { 
      email, 
      customerId,
      eventId,
    }, "WARN");
    return;
  }

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
  invoice: Stripe.Invoice,
  eventId: string
) {
  if (!invoice.subscription) {
    logStep("Invoice has no subscription for failed payment", { invoiceId: invoice.id, eventId }, "DEBUG");
    return;
  }

  logStep("handlePaymentFailed started", {
    eventId,
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    attemptCount: invoice.attempt_count,
    rawNextPaymentAttempt: invoice.next_payment_attempt,
    nextPaymentAttempt: safeTimestampToISO(invoice.next_payment_attempt),
  });

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) {
    logStep("No customer ID on failed invoice", { invoiceId: invoice.id, eventId }, "WARN");
    return;
  }

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) {
    logStep("Customer deleted or no email for failed payment", { customerId, eventId }, "WARN");
    return;
  }

  const email = customer.email;

  // Find organization using cascaded search
  let org = null;

  // 1. First try by stripe_customer_id
  const { data: orgByCustomer } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  if (orgByCustomer) {
    org = orgByCustomer;
    logStep("PaymentFailed: Organization found by stripe_customer_id", { orgId: org.id, eventId }, "DEBUG");
  }

  // 2. If not found, try by organization email
  if (!org) {
    const { data: orgByEmail } = await supabase
      .from("organizations")
      .select("id")
      .eq("email", email)
      .single();
    if (orgByEmail) {
      org = orgByEmail;
      logStep("PaymentFailed: Organization found by org email", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 3. If still not found, try by profile email
  if (!org) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("email", email)
      .single();
    
    if (profileData?.organization_id) {
      const { data: orgByProfile } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", profileData.organization_id)
        .single();
      if (orgByProfile) {
        org = orgByProfile;
        logStep("PaymentFailed: Organization found via profile email", { orgId: org.id, eventId }, "DEBUG");
      }
    }
  }

  if (!org) {
    logStep("PaymentFailed: Organization not found by any method", { email, customerId, eventId }, "WARN");
    return;
  }

  // Update status to past_due
  const { error: updateError } = await supabase
    .from("organizations")
    .update({ subscription_status: "past_due" })
    .eq("id", org.id);

  if (updateError) {
    logStep("Failed to mark org as past_due", { error: updateError.message, eventId }, "ERROR");
  } else {
    logStep("Organization marked as past_due", { orgId: org.id, eventId });
  }

  // Create notification
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (profile) {
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: profile.id,
      organization_id: org.id,
      type: "payment_failed",
      title: "Pago fallido",
      message: `No pudimos procesar tu pago. Por favor, actualiza tu método de pago para evitar la suspensión del servicio.`,
      link: "/dashboard/settings",
    });
    
    if (notifError) {
      logStep("Failed to create payment failed notification", { error: notifError.message, eventId }, "WARN");
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCustomerUpdated(
  supabase: any,
  customer: Stripe.Customer,
  eventId: string
) {
  if (!customer.email) {
    logStep("Customer updated but no email", { customerId: customer.id, eventId }, "DEBUG");
    return;
  }

  logStep("handleCustomerUpdated", {
    eventId,
    customerId: customer.id,
    email: customer.email,
  }, "DEBUG");

  // Update stripe_customer_id if not set
  const { error } = await supabase
    .from("organizations")
    .update({ stripe_customer_id: customer.id })
    .eq("email", customer.email)
    .is("stripe_customer_id", null);

  if (error) {
    logStep("Failed to update customer ID on org", { error: error.message, eventId }, "WARN");
  }
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

// Handler for trial ending soon (3 days before trial ends)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTrialWillEnd(
  supabase: any,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  eventId: string
) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  logStep("handleTrialWillEnd started", {
    eventId,
    subscriptionId: subscription.id,
    customerId,
    trialEnd: safeTimestampToISO(subscription.trial_end),
    status: subscription.status,
  });

  // Get customer email
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) {
    logStep("TrialWillEnd: Customer deleted or no email", { customerId, eventId }, "WARN");
    return;
  }

  const email = customer.email;

  // Find organization using cascaded search
  let org = null;

  // 1. First try by organization_id from subscription metadata
  const orgIdFromMeta = subscription.metadata?.organization_id;
  if (orgIdFromMeta) {
    const { data: orgByMeta } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("id", orgIdFromMeta)
      .single();
    if (orgByMeta) {
      org = orgByMeta;
      logStep("TrialWillEnd: Organization found by metadata", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 2. If not found, try by stripe_customer_id
  if (!org) {
    const { data: orgByCustomer } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("stripe_customer_id", customerId)
      .single();
    if (orgByCustomer) {
      org = orgByCustomer;
      logStep("TrialWillEnd: Organization found by stripe_customer_id", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 3. If not found, try by organization email
  if (!org) {
    const { data: orgByEmail } = await supabase
      .from("organizations")
      .select("id, subscription_tier")
      .eq("email", email)
      .single();
    if (orgByEmail) {
      org = orgByEmail;
      logStep("TrialWillEnd: Organization found by org email", { orgId: org.id, eventId }, "DEBUG");
    }
  }

  // 4. If still not found, try by profile email
  if (!org) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("email", email)
      .single();
    
    if (profileData?.organization_id) {
      const { data: orgByProfile } = await supabase
        .from("organizations")
        .select("id, subscription_tier")
        .eq("id", profileData.organization_id)
        .single();
      if (orgByProfile) {
        org = orgByProfile;
        logStep("TrialWillEnd: Organization found via profile email", { orgId: org.id, eventId }, "DEBUG");
      }
    }
  }

  if (!org) {
    logStep("TrialWillEnd: Organization not found by any method", { email, customerId, eventId }, "WARN");
    return;
  }

  // Calculate days remaining
  const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const daysRemaining = trialEndDate 
    ? Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 3;

  const tierName = (org.subscription_tier || "Basic").charAt(0).toUpperCase() + 
                   (org.subscription_tier || "basic").slice(1);

  // Create notification for the user
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", org.id)
    .limit(1)
    .single();

  if (profile) {
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: profile.id,
      organization_id: org.id,
      type: "subscription",
      title: "Tu prueba termina pronto",
      message: `Quedan ${daysRemaining} días de tu prueba del plan ${tierName}. Actualiza tu método de pago para continuar sin interrupciones.`,
      link: "/dashboard/subscription",
    });
    
    if (notifError) {
      logStep("Failed to create trial ending notification", { error: notifError.message, eventId }, "WARN");
    } else {
      logStep("Trial ending notification created", { 
        orgId: org.id, 
        daysRemaining,
        tier: tierName,
        eventId,
      });
    }
  }
}
