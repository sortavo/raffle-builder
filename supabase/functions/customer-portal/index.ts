import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";
import { stripeOperation, isStripeCircuitOpen } from "../_shared/stripe-client.ts";

// Issue M15: Origin validation whitelist
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
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Only allow specific lovable.app patterns
  const lovablePreviewPattern = /^https:\/\/[a-z0-9]+-preview--[a-z0-9-]+\.lovable\.app$/;
  if (lovablePreviewPattern.test(origin)) return true;

  const lovablePublishedPattern = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
  if (lovablePublishedPattern.test(origin)) return true;

  const lovableProjectPattern = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;
  if (lovableProjectPattern.test(origin)) return true;
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'customer-portal');
  const log = createLogger(ctx);

  try {
    log.info("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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

    // L10: Check circuit breaker before making Stripe calls
    if (await isStripeCircuitOpen()) {
      enrichedLog.warn("Stripe circuit open - portal unavailable");
      return corsJsonResponse(req, {
        error: "El portal de pagos está temporalmente no disponible. Intenta de nuevo en unos minutos.",
        circuitOpen: true,
      }, 503);
    }

    // R1: Use stripeOperation with circuit breaker - Find customer
    const customers = await stripeOperation<Stripe.ApiList<Stripe.Customer>>(
      (stripe) => stripe.customers.list({ email: user.email, limit: 1 }),
      'customers.list'
    );
    
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    
    const customerId = customers.data[0].id;
    enrichedLog.info("Found Stripe customer", { customerId });

    // Issue M15: Validate origin before using in return_url
    const rawOrigin = req.headers.get("origin");
    const returnUrl = isAllowedOrigin(rawOrigin)
      ? `${rawOrigin}/dashboard/subscription`
      : "https://sortavo.com/dashboard/subscription";
    
    // L5: Specific error handling for portal session creation
    // R1: Use stripeOperation with circuit breaker
    let portalSession: Stripe.BillingPortal.Session;
    try {
      portalSession = await stripeOperation<Stripe.BillingPortal.Session>(
        (stripe) => stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        }),
        'billingPortal.sessions.create'
      );
    } catch (stripeError: unknown) {
      const error = stripeError as { message?: string; code?: string };
      enrichedLog.error("Failed to create portal session", null, {
        error: error.message,
        code: error.code
      });

      if (error.code === 'resource_missing') {
        throw new Error("No se encontró tu cuenta de facturación. Contacta soporte.");
      }
      throw new Error("Error al abrir el portal de facturación. Intenta de nuevo.");
    }
    
    enrichedLog.info("Portal session created", { sessionId: portalSession.id, durationMs: log.duration() });

    return corsJsonResponse(req, { url: portalSession.url }, 200);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'customer-portal',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
