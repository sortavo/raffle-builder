import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { STRIPE_API_VERSION } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-PAYMENT-METHOD] ${step}${detailsStr}`);
};

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
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get organization with Stripe customer ID
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) throw new Error("No organization found");

    const { data: org } = await supabaseClient
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", profile.organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      logStep("No Stripe customer found");
      return corsJsonResponse(req, { payment_method: null }, 200);
    }

    logStep("Found Stripe customer", { customerId: org.stripe_customer_id });

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

    // Get customer's default payment method
    const customer = await stripe.customers.retrieve(org.stripe_customer_id) as Stripe.Customer;
    
    if (customer.deleted) {
      return corsJsonResponse(req, { payment_method: null }, 200);
    }

    let paymentMethod = null;
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

    if (defaultPaymentMethodId) {
      const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId as string);
      
      // L2: Validate payment method type before accessing card properties
      if (pm.type !== 'card') {
        logStep("Payment method is not a card", { type: pm.type });
        return corsJsonResponse(req, { 
          payment_method: null,
          message: "El método de pago no es una tarjeta"
        }, 200);
      }
      
      const card = pm.card!;
      paymentMethod = {
        id: pm.id,
        brand: card.brand,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
      };
      logStep("Found payment method", { brand: card.brand, last4: card.last4 });
    } else {
      // Try to get from subscriptions (active or trialing)
      const subscriptions = await stripe.subscriptions.list({
        customer: org.stripe_customer_id,
        limit: 5,
      });

      // Find active or trialing subscription
      const validSub = subscriptions.data.find((s: Stripe.Subscription) => 
        s.status === "active" || s.status === "trialing"
      );

      if (validSub) {
        const pmId = validSub.default_payment_method;
        
        if (pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId as string);
          // L2: Validate payment method type before accessing card properties
          if (pm.type === 'card' && pm.card) {
            const card = pm.card;
            paymentMethod = {
              id: pm.id,
              brand: card.brand,
              last4: card.last4,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
            };
            logStep("Found payment method from subscription", { brand: card.brand, last4: card.last4 });
          }
        }
      }
    }

    return corsJsonResponse(req, { payment_method: paymentMethod }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
