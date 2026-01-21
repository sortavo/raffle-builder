import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { BASIC_PRICE_IDS } from "../_shared/stripe-config.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";
import { stripeOperation } from "../_shared/stripe-client.ts";

// Bug #4: Origin validation whitelist
const ALLOWED_ORIGINS = [
  "https://sortavo.com",
  "https://www.sortavo.com",
  "https://app.sortavo.com",
  "https://sortavo-hub.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

// L4: Stricter CORS patterns for lovable.app subdomains
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Only allow specific lovable.app patterns (preview deployments)
  // Format: https://{project-id}-preview--{uuid}.lovable.app
  const lovablePreviewPattern = /^https:\/\/[a-z0-9]+-preview--[a-z0-9-]+\.lovable\.app$/;
  if (lovablePreviewPattern.test(origin)) return true;

  // Published apps: https://{project-slug}.lovable.app
  const lovablePublishedPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  if (lovablePublishedPattern.test(origin)) return true;

  // Lovableproject.com for development
  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (lovableProjectPattern.test(origin)) return true;
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'create-checkout');
  const log = createLogger(ctx);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    log.info("Function started");

    // Issue M1: Reject invalid origins instead of silent fallback
    const rawOrigin = req.headers.get("origin");
    if (!isAllowedOrigin(rawOrigin)) {
      log.warn("Origin rejected", { rawOrigin });
      return corsJsonResponse(req, { error: "Origin not allowed" }, 403);
    }
    const safeOrigin = rawOrigin!;
    
    log.info("Origin validated", { safeOrigin });

    // Detect Stripe mode from secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : "test";
    log.info("Stripe mode detected", { mode: stripeMode });

    const { priceId } = await req.json();
    if (!priceId) {
      throw new Error("Price ID is required");
    }
    
    // Issue 1: Validate priceId against known products (account ANwomfV97e)
    const VALID_PRICE_IDS = [
      "price_1Sr9iWANwomfV97eI7ojW9KR", // basic monthly
      "price_1Sr9jsANwomfV97efJQopwlu", // basic annual
      "price_1Sr9iYANwomfV97eTKTKJ4nA", // pro monthly
      "price_1Sr9jtANwomfV97eMAVPLDMq", // pro annual
      "price_1Sr9iaANwomfV97eKjea9Y3w", // premium monthly
      "price_1Sr9jvANwomfV97eQLYGvWDB", // premium annual
      "price_1Sr9ibANwomfV97eZafLddgu", // enterprise monthly
      "price_1Sr9jxANwomfV97eUbwB9owr", // enterprise annual
    ];
    
    if (!VALID_PRICE_IDS.includes(priceId)) {
      log.warn("Invalid price ID rejected", { priceId });
      throw new Error("Invalid price ID");
    }
    
    log.info("Price ID validated", { priceId });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    const enrichedCtx = enrichContext(ctx, { userId: user.id });
    const enrichedLog = createLogger(enrichedCtx);
    enrichedLog.info("User authenticated", { email: user.email });

    // Get user's organization_id from profile
    const { data: userProfile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    
    const organizationId = userProfile?.organization_id;
    enrichedLog.info("Organization ID retrieved", { organizationId });

    // R1: Use stripeOperation with circuit breaker - Check for existing customer
    const customers = await stripeOperation(
      (stripe) => stripe.customers.list({ email: user.email, limit: 1 }),
      'customers.list'
    );
    
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      enrichedLog.info("Found existing customer", { customerId });
      
      // CRITICAL: Check for existing active subscriptions to prevent duplicates
      const activeSubscriptions = await stripeOperation(
        (stripe) => stripe.subscriptions.list({ customer: customerId!, status: "active", limit: 1 }),
        'subscriptions.list.active'
      );
      
      if (activeSubscriptions.data.length > 0) {
        enrichedLog.warn("BLOCKED: User already has active subscription", {
          existingSubscriptionId: activeSubscriptions.data[0].id,
        });
        throw new Error(
          "Ya tienes una suscripción activa. Usa 'Cambiar plan' para modificar tu suscripción."
        );
      }
      
      // Also check for trialing subscriptions
      const trialingSubscriptions = await stripeOperation(
        (stripe) => stripe.subscriptions.list({ customer: customerId!, status: "trialing", limit: 1 }),
        'subscriptions.list.trialing'
      );
      
      if (trialingSubscriptions.data.length > 0) {
        enrichedLog.warn("BLOCKED: User has trialing subscription", {
          existingSubscriptionId: trialingSubscriptions.data[0].id,
        });
        throw new Error(
          "Ya tienes una suscripción en período de prueba. Usa 'Cambiar plan' para modificar tu suscripción."
        );
      }
      
      // Issue 2: Also check for past_due subscriptions (still have access)
      const pastDueSubscriptions = await stripeOperation(
        (stripe) => stripe.subscriptions.list({ customer: customerId!, status: "past_due", limit: 1 }),
        'subscriptions.list.past_due'
      );

      if (pastDueSubscriptions.data.length > 0) {
        enrichedLog.warn("BLOCKED: User has past_due subscription", {
          existingSubscriptionId: pastDueSubscriptions.data[0].id,
        });
        throw new Error(
          "Tienes un pago pendiente. Por favor actualiza tu método de pago antes de continuar."
        );
      }

      // Check for incomplete subscriptions (payment required)
      const incompleteSubscriptions = await stripeOperation(
        (stripe) => stripe.subscriptions.list({ customer: customerId!, status: "incomplete", limit: 1 }),
        'subscriptions.list.incomplete'
      );

      if (incompleteSubscriptions.data.length > 0) {
        enrichedLog.warn("BLOCKED: User has incomplete subscription", {
          existingSubscriptionId: incompleteSubscriptions.data[0].id,
        });
        throw new Error(
          "Tienes una suscripción pendiente de pago. Completa el pago o cancela antes de crear una nueva."
        );
      }
      
      enrichedLog.info("No existing subscription found, proceeding with checkout");
    }

    // Check if this is a Basic plan (gets 7 day trial)
    const isBasicPlan = BASIC_PRICE_IDS.includes(priceId);
    enrichedLog.info("Plan type determined", { priceId, isBasicPlan, trialDays: isBasicPlan ? 7 : 0, stripeMode });
    
    // O2: Add idempotency key for Stripe operations
    const idempotencyKey = `checkout_${organizationId || user.id}_${priceId}_${Date.now()}`;

    // R1: Use stripeOperation with circuit breaker - Create checkout session
    const session = await stripeOperation(
      (stripe) => stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${safeOrigin}/onboarding?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${safeOrigin}/onboarding?step=3&canceled=true`,
        metadata: {
          user_id: user.id,
          organization_id: organizationId,
          stripe_mode: stripeMode,
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            organization_id: organizationId,
          },
          ...(isBasicPlan && { trial_period_days: 7 }),
        },
      }, { idempotencyKey }),
      'checkout.sessions.create'
    );

    enrichedLog.info("Checkout session created", { 
      sessionId: session.id, 
      stripeMode, 
      origin: safeOrigin,
      idempotencyKey,
      durationMs: log.duration()
    });

    return corsJsonResponse(req, { url: session.url }, 200);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'create-checkout',
      correlationId: ctx.correlationId,
    });

    log.error("Error", err, { durationMs: log.duration() });

    // Issue M2: Map specific errors to user-friendly messages
    let userMessage = "Error al procesar. Intenta de nuevo.";
    if (err.message.includes("Price ID") || err.message.includes("Invalid price")) {
      userMessage = "Plan inválido seleccionado.";
    } else if (err.message.includes("authenticated")) {
      userMessage = "Debes iniciar sesión para continuar.";
    } else if (err.message.includes("suscripción") || err.message.includes("pago pendiente")) {
      userMessage = err.message; // Already user-friendly Spanish messages
    }

    return corsJsonResponse(req, { error: userMessage }, 500);
  }
});
