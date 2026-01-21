import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { BASIC_PRICE_IDS, STRIPE_API_VERSION } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Issue M1: Reject invalid origins instead of silent fallback
    const rawOrigin = req.headers.get("origin");
    if (!isAllowedOrigin(rawOrigin)) {
      logStep("Origin rejected", { rawOrigin });
      return corsJsonResponse(req, { error: "Origin not allowed" }, 403);
    }
    const safeOrigin = rawOrigin!;
    
    logStep("Origin validated", { 
      rawOrigin, 
      safeOrigin, 
      isAllowed: true 
    });

    // Detect Stripe mode from secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : "test";
    logStep("Stripe mode detected", { mode: stripeMode });

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
      logStep("Invalid price ID rejected", { priceId });
      throw new Error("Invalid price ID");
    }
    
    logStep("Price ID received and validated", { priceId });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Get user's organization_id from profile
    const { data: userProfile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    
    const organizationId = userProfile?.organization_id;
    logStep("Organization ID retrieved", { organizationId, userId: user.id });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
      
      // CRITICAL: Check for existing active subscriptions to prevent duplicates
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      
      if (activeSubscriptions.data.length > 0) {
        logStep("BLOCKED: User already has active subscription", {
          existingSubscriptionId: activeSubscriptions.data[0].id,
          customerId,
        });
        throw new Error(
          "Ya tienes una suscripción activa. Usa 'Cambiar plan' para modificar tu suscripción."
        );
      }
      
      // Also check for trialing subscriptions
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      
      if (trialingSubscriptions.data.length > 0) {
        logStep("BLOCKED: User has trialing subscription", {
          existingSubscriptionId: trialingSubscriptions.data[0].id,
          customerId,
        });
        throw new Error(
          "Ya tienes una suscripción en período de prueba. Usa 'Cambiar plan' para modificar tu suscripción."
        );
      }
      
      // Issue 2: Also check for past_due subscriptions (still have access)
      const pastDueSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "past_due",
        limit: 1,
      });

      if (pastDueSubscriptions.data.length > 0) {
        logStep("BLOCKED: User has past_due subscription", {
          existingSubscriptionId: pastDueSubscriptions.data[0].id,
          customerId,
        });
        throw new Error(
          "Tienes un pago pendiente. Por favor actualiza tu método de pago antes de continuar."
        );
      }

      // Check for incomplete subscriptions (payment required)
      const incompleteSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "incomplete",
        limit: 1,
      });

      if (incompleteSubscriptions.data.length > 0) {
        logStep("BLOCKED: User has incomplete subscription", {
          existingSubscriptionId: incompleteSubscriptions.data[0].id,
          customerId,
        });
        throw new Error(
          "Tienes una suscripción pendiente de pago. Completa el pago o cancela antes de crear una nueva."
        );
      }
      
      logStep("No existing subscription found, proceeding with checkout");
    }

    // Check if this is a Basic plan (gets 7 day trial)
    const isBasicPlan = BASIC_PRICE_IDS.includes(priceId);
    logStep("Plan type determined", { priceId, isBasicPlan, trialDays: isBasicPlan ? 7 : 0, stripeMode });
    
    const session = await stripe.checkout.sessions.create({
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
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url, stripeMode, origin: safeOrigin });

    return corsJsonResponse(req, { url: session.url }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    // Issue M2: Map specific errors to user-friendly messages
    let userMessage = "Error al procesar. Intenta de nuevo.";
    if (errorMessage.includes("Price ID") || errorMessage.includes("Invalid price")) {
      userMessage = "Plan inválido seleccionado.";
    } else if (errorMessage.includes("authenticated")) {
      userMessage = "Debes iniciar sesión para continuar.";
    } else if (errorMessage.includes("suscripción") || errorMessage.includes("pago pendiente")) {
      userMessage = errorMessage; // Already user-friendly Spanish messages
    }

    return corsJsonResponse(req, { error: userMessage }, 500);
  }
});
