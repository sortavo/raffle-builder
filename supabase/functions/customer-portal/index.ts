import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { STRIPE_API_VERSION } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

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

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Issue M15: Validate origin before using in return_url
    const rawOrigin = req.headers.get("origin");
    const returnUrl = isAllowedOrigin(rawOrigin)
      ? `${rawOrigin}/dashboard/subscription`
      : "https://sortavo.com/dashboard/subscription";
    
    // L5: Specific error handling for portal session creation
    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
    } catch (stripeError: unknown) {
      const error = stripeError as { message?: string; code?: string };
      logStep("Failed to create portal session", {
        error: error.message,
        code: error.code
      });

      if (error.code === 'resource_missing') {
        throw new Error("No se encontró tu cuenta de facturación. Contacta soporte.");
      }
      throw new Error("Error al abrir el portal de facturación. Intenta de nuevo.");
    }
    
    logStep("Portal session created", { sessionId: portalSession.id });

    return corsJsonResponse(req, { url: portalSession.url }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
