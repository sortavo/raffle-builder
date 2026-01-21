import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch {
    return null;
  }
}

// Issue M7: Timeout wrapper for heavy processing to avoid Stripe timeout
function withTimeout<T>(promise: Promise<T>, ms: number, eventId: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Processing timeout for event ${eventId}`)), ms)
    )
  ]);
}

// Events that should be processed asynchronously to avoid Stripe timeout
const ASYNC_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

// Bug #6: Typed helper for organization lookup with standardized cascaded search
interface OrganizationResult {
  id: string;
  subscription_tier?: string | null;
  subscription_status?: string | null;
}

async function findOrganizationByPaymentContext(
  supabase: SupabaseClient,
  customerId: string,
  customerEmail: string,
  subscriptionMetadata: { organization_id?: string } | undefined,
  eventId: string,
  handlerName: string
): Promise<OrganizationResult | null> {
  // 1. Try by metadata organization_id (most reliable for new subscriptions)
  const orgIdFromMeta = subscriptionMetadata?.organization_id;
  if (orgIdFromMeta) {
    const { data: orgByMeta } = await supabase
      .from("organizations")
      .select("id, subscription_tier, subscription_status")
      .eq("id", orgIdFromMeta)
      .single();
    if (orgByMeta) {
      logStep(`${handlerName}: Org found by metadata`, { orgId: orgByMeta.id, eventId }, "DEBUG");
      return orgByMeta;
    }
  }

  // 2. Try by stripe_customer_id (reliable for renewals)
  const { data: orgByCustomer } = await supabase
    .from("organizations")
    .select("id, subscription_tier, subscription_status")
    .eq("stripe_customer_id", customerId)
    .single();
  if (orgByCustomer) {
    logStep(`${handlerName}: Org found by stripe_customer_id`, { orgId: orgByCustomer.id, eventId }, "DEBUG");
    return orgByCustomer;
  }

  // 3. Try by organization email
  const { data: orgByEmail } = await supabase
    .from("organizations")
    .select("id, subscription_tier, subscription_status")
    .eq("email", customerEmail)
    .single();
  if (orgByEmail) {
    logStep(`${handlerName}: Org found by org email`, { orgId: orgByEmail.id, eventId }, "DEBUG");
    return orgByEmail;
  }

  // 4. Try by profile email -> organization_id
  const { data: profileData } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("email", customerEmail)
    .single();
  
  if (profileData?.organization_id) {
    const { data: orgByProfile } = await supabase
      .from("organizations")
      .select("id, subscription_tier, subscription_status")
      .eq("id", profileData.organization_id)
      .single();
    if (orgByProfile) {
      logStep(`${handlerName}: Org found via profile`, { orgId: orgByProfile.id, eventId }, "DEBUG");
      return orgByProfile;
    }
  }

  logStep(`${handlerName}: Org not found`, { customerEmail, customerId, orgIdFromMeta, eventId }, "WARN");
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
                         !Deno.env.get("ENVIRONMENT");
    
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

    // CRITICAL: Always verify webhook signature
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

    // Bug #1: Atomic insert - handle unique constraint violation (23505) as duplicate
    const { error: insertError } = await supabaseAdmin.from("stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
      created_at: new Date().toISOString()
    });

    // PostgreSQL error code 23505 = unique_violation
    if (insertError) {
      if (insertError.code === "23505") {
        logStep("Duplicate event detected via constraint", { 
          eventId: event.id, 
          eventType: event.type 
        }, "DEBUG");
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Other insert errors should not block processing but log them
      logStep("Failed to record event", { 
        eventId: event.id, 
        error: insertError.message,
        code: insertError.code 
      }, "WARN");
    }

    logStep("Event recorded", { eventId: event.id, eventType: event.type });

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
          
          return new Response(
            JSON.stringify({ received: true, queued: true, jobId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          logStep("Failed to queue event, falling back to sync", { 
            eventId: event.id, 
            error 
          }, "WARN");
        }
      } catch (queueError) {
        logStep("Queue error, falling back to sync", { 
          eventId: event.id, 
          error: String(queueError) 
        }, "WARN");
      }
    }

    // Handle different event types (sync fallback or non-async events)
    const startTime = Date.now();
    logStep("Processing event", { eventId: event.id, eventType: event.type });
    
    switch (event.type) {
      // Issue M7: Wrap heavy handlers with timeout to avoid Stripe 30s timeout
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await withTimeout(
          handleSubscriptionChange(supabaseAdmin, stripe, subscription, event.id),
          25000, // 25 seconds (leave margin for Stripe's 30s timeout)
          event.id
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await withTimeout(
          handleSubscriptionCanceled(supabaseAdmin, stripe, subscription, event.id),
          25000,
          event.id
        );
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

      // Issue 3: Handle 3D Secure / SCA payments that require additional action
      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentActionRequired(supabaseAdmin, stripe, invoice, event.id);
        break;
      }

      case "customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerUpdated(supabaseAdmin, customer, event.id);
        break;
      }

      // Issue M4: Handle customer deletion - clear Stripe references
      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(supabaseAdmin, customer, event.id);
        break;
      }

      // Issue M18: Handle charge refunds for audit logging
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(supabaseAdmin, charge, event.id);
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

async function handleSubscriptionChange(
  supabase: SupabaseClient,
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

  // Use standardized helper for organization lookup
  const org = await findOrganizationByPaymentContext(
    supabase,
    customerId,
    email,
    subscription.metadata as { organization_id?: string },
    eventId,
    "handleSubscriptionChange"
  );

  if (!org) {
    logStep("Organization not found by any method", { 
      email, 
      customerId,
      orgIdFromMeta: subscription.metadata?.organization_id,
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

  // Issue 12: Validate subscription items exist before processing
  const subscriptionItems = subscription.items.data;

  if (subscriptionItems.length === 0) {
    logStep("Subscription has no items", { subscriptionId: subscription.id, eventId }, "WARN");
    return;
  }

  if (subscriptionItems.length > 1) {
    logStep("Subscription has multiple items, using first", {
      subscriptionId: subscription.id,
      itemCount: subscriptionItems.length,
      eventId
    }, "WARN");
  }

  const priceItem = subscriptionItems[0];
  if (!priceItem?.price?.product) {
    logStep("Price item has no product", { subscriptionId: subscription.id, eventId }, "WARN");
    return;
  }

  const productId = priceItem.price.product as string;
  const priceId = priceItem.price.id;
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

  // Bug #3: Map Stripe status to our status (including incomplete)
  let subscriptionStatus: "active" | "canceled" | "past_due" | "trial" | "incomplete" = "active";
  if (subscription.status === "canceled") {
    subscriptionStatus = "canceled";
  } else if (subscription.status === "past_due") {
    subscriptionStatus = "past_due";
  } else if (subscription.status === "trialing") {
    subscriptionStatus = "trial";
  } else if (subscription.status === "incomplete" || subscription.status === "incomplete_expired") {
    subscriptionStatus = "incomplete";
    logStep("Subscription incomplete - payment required", {
      subscriptionId: subscription.id,
      stripeStatus: subscription.status,
      eventId
    }, "WARN");
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

  // Bug #2: Throw error on DB failure to trigger Stripe retry
  if (updateError) {
    logStep("Failed to update organization", { 
      orgId: org.id,
      error: updateError.message,
      errorCode: updateError.code,
      eventId,
    }, "ERROR");
    throw new Error(`Critical DB error: Failed to update organization ${org.id} - ${updateError.message}`);
  }
  
  logStep("Organization updated successfully", {
    eventId,
    orgId: org.id,
    previousTier: org.subscription_tier,
    newTier: tier,
    previousStatus: org.subscription_status,
    newStatus: subscriptionStatus,
    period: subscriptionPeriod,
  });

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

async function handleSubscriptionCanceled(
  supabase: SupabaseClient,
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

  // Use standardized helper for organization lookup
  const org = await findOrganizationByPaymentContext(
    supabase,
    customerId,
    email,
    subscription.metadata as { organization_id?: string },
    eventId,
    "handleSubscriptionCanceled"
  );

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

  // Bug #2: Throw error on DB failure to trigger Stripe retry
  if (updateError) {
    logStep("Failed to update org on cancellation", { 
      orgId: org.id, 
      error: updateError.message,
      eventId,
    }, "ERROR");
    throw new Error(`Critical DB error: Failed to cancel subscription for org ${org.id} - ${updateError.message}`);
  }
  
  logStep("Subscription canceled, reverted to basic", { 
    orgId: org.id,
    previousTier: org.subscription_tier,
    eventId,
  });

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

async function handlePaymentSucceeded(
  supabase: SupabaseClient,
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

  // Use standardized helper for organization lookup
  const org = await findOrganizationByPaymentContext(
    supabase,
    customerId,
    customer.email,
    undefined, // No subscription metadata on invoice
    eventId,
    "handlePaymentSucceeded"
  );

  if (!org) {
    logStep("PaymentSuccess: Organization not found by any method", { 
      email: customer.email, 
      customerId,
      eventId,
    }, "WARN");
    return;
  }

  // Update status to active if it was past_due
  const { error: updateError } = await supabase
    .from("organizations")
    .update({ subscription_status: "active" })
    .eq("id", org.id)
    .eq("subscription_status", "past_due");

  if (updateError) {
    logStep("Failed to update org status on payment success", { error: updateError.message, eventId }, "ERROR");
    throw new Error(`Critical DB error: Failed to update org status - ${updateError.message}`);
  }

  logStep("Payment recorded", { orgId: org.id, eventId });
}

async function handlePaymentFailed(
  supabase: SupabaseClient,
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

  // Use standardized helper for organization lookup
  const org = await findOrganizationByPaymentContext(
    supabase,
    customerId,
    customer.email,
    undefined, // No subscription metadata on invoice
    eventId,
    "handlePaymentFailed"
  );

  if (!org) {
    logStep("PaymentFailed: Organization not found by any method", { email: customer.email, customerId, eventId }, "WARN");
    return;
  }

  // Update status to past_due
  const { error: updateError } = await supabase
    .from("organizations")
    .update({ subscription_status: "past_due" })
    .eq("id", org.id);

  // Bug #2: Throw error on DB failure to trigger Stripe retry
  if (updateError) {
    logStep("Failed to mark org as past_due", { error: updateError.message, eventId }, "ERROR");
    throw new Error(`Critical DB error: Failed to mark org ${org.id} as past_due - ${updateError.message}`);
  }
  
  logStep("Organization marked as past_due", { orgId: org.id, eventId });

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

// Issue 3: Handler for 3D Secure / SCA payments that require additional action
async function handlePaymentActionRequired(
  supabase: SupabaseClient,
  stripe: Stripe,
  invoice: Stripe.Invoice,
  eventId: string
) {
  if (!invoice.subscription) {
    logStep("Invoice has no subscription for action required", { invoiceId: invoice.id, eventId }, "DEBUG");
    return;
  }

  logStep("handlePaymentActionRequired started", {
    eventId,
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  });

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) return;

  const org = await findOrganizationByPaymentContext(
    supabase,
    customerId,
    customer.email,
    undefined,
    eventId,
    "handlePaymentActionRequired"
  );

  if (!org) return;

  // Create notification for user to complete payment
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
      type: "payment_pending",
      title: "Acción requerida para completar pago",
      message: "Tu banco requiere verificación adicional. Por favor completa el pago para mantener tu suscripción activa.",
      link: invoice.hosted_invoice_url || "/dashboard/settings",
    });

    if (notifError) {
      logStep("Failed to create payment action notification", { error: notifError.message, eventId }, "WARN");
    }
  }

  logStep("Payment action required notification created", { orgId: org.id, eventId });
}

async function handleCustomerUpdated(
  supabase: SupabaseClient,
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

// Issue M4: Handler for customer deletion - clear Stripe references
async function handleCustomerDeleted(
  supabase: SupabaseClient,
  customer: Stripe.Customer,
  eventId: string
) {
  logStep("handleCustomerDeleted started", {
    eventId,
    customerId: customer.id,
    email: customer.email,
  });

  // Find organization by stripe_customer_id
  const { data: org } = await supabase
    .from("organizations")
    .select("id, subscription_tier")
    .eq("stripe_customer_id", customer.id)
    .single();

  if (!org) {
    logStep("Customer deleted but no org found", { customerId: customer.id, eventId }, "DEBUG");
    return;
  }

  // Clear Stripe references and reset to basic
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_status: "canceled",
      subscription_tier: "basic",
    })
    .eq("id", org.id);

  if (updateError) {
    logStep("Failed to clear customer references", { error: updateError.message, eventId }, "ERROR");
    throw new Error(`Failed to handle customer deletion: ${updateError.message}`);
  }

  logStep("Customer deleted, org references cleared", { orgId: org.id, eventId });
}

// Issue M18: Handler for charge refunds - audit logging
async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  eventId: string
) {
  logStep("handleChargeRefunded started", {
    eventId,
    chargeId: charge.id,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
  });

  // Log to billing_audit_log for compliance
  const { error } = await supabase.from("billing_audit_log").insert({
    actor_type: "stripe_webhook",
    action: "refund_processed",
    resource_type: "charge",
    resource_id: charge.id,
    new_values: {
      amount_refunded: charge.amount_refunded,
      refunded: charge.refunded,
    },
    stripe_event_id: eventId,
  });

  if (error) {
    logStep("Failed to log refund to audit", { error: error.message, eventId }, "WARN");
  }

  logStep("Refund logged to audit", { chargeId: charge.id, eventId });
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
    case "incomplete":
      return "Pago requerido";
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
    case "incomplete":
      return "Tu suscripción requiere un pago para activarse. Por favor, completa el pago.";
    default:
      return "Tu suscripción ha sido actualizada.";
  }
}

// Handler for trial ending soon (3 days before trial ends)
async function handleTrialWillEnd(
  supabase: SupabaseClient,
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

  // Use standardized helper for organization lookup
  const org = await findOrganizationByPaymentContext(
    supabase,
    customerId,
    customer.email,
    subscription.metadata as { organization_id?: string },
    eventId,
    "handleTrialWillEnd"
  );

  if (!org) {
    logStep("TrialWillEnd: Organization not found by any method", { email: customer.email, customerId, eventId }, "WARN");
    return;
  }

  // Calculate days remaining
  const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const daysRemaining = trialEndDate 
    ? Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 3;

  const tierName = (org.subscription_tier || "Basic").charAt(0).toUpperCase() + 
                   (org.subscription_tier || "basic").slice(1);

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
      type: "trial_ending",
      title: `Tu prueba de ${tierName} termina pronto`,
      message: `Tu período de prueba termina en ${daysRemaining} días. Agrega un método de pago para continuar disfrutando del plan ${tierName}.`,
      link: "/dashboard/settings",
    });
    
    if (notifError) {
      logStep("Failed to create trial ending notification", { error: notifError.message, eventId }, "WARN");
    } else {
      logStep("Trial ending notification created", { 
        orgId: org.id, 
        daysRemaining,
        eventId,
      });
    }
  }
}
