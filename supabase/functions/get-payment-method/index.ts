import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { createRequestContext, enrichContext, createLogger } from "../_shared/correlation.ts";
import { captureException } from "../_shared/sentry.ts";
import { stripeOperation } from "../_shared/stripe-client.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const ctx = createRequestContext(req, 'get-payment-method');
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
    if (!user?.email) throw new Error("User not authenticated");
    
    const enrichedCtx = enrichContext(ctx, { userId: user.id });
    const enrichedLog = createLogger(enrichedCtx);
    enrichedLog.info("User authenticated");

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
      enrichedLog.info("No Stripe customer found");
      return corsJsonResponse(req, { payment_method: null }, 200);
    }

    const finalCtx = enrichContext(enrichedCtx, { orgId: profile.organization_id });
    const finalLog = createLogger(finalCtx);
    finalLog.info("Found Stripe customer", { customerId: org.stripe_customer_id });

    // R1: Use stripeOperation with circuit breaker - Get customer's default payment method
    const customer = await stripeOperation<Stripe.Customer | Stripe.DeletedCustomer>(
      (stripe) => stripe.customers.retrieve(org.stripe_customer_id!),
      'customers.retrieve'
    );
    
    if ((customer as Stripe.DeletedCustomer).deleted) {
      return corsJsonResponse(req, { payment_method: null }, 200);
    }
    
    const activeCustomer = customer as Stripe.Customer;

    let paymentMethod = null;
    const defaultPaymentMethodId = activeCustomer.invoice_settings?.default_payment_method;

    if (defaultPaymentMethodId) {
      const pm = await stripeOperation<Stripe.PaymentMethod>(
        (stripe) => stripe.paymentMethods.retrieve(defaultPaymentMethodId as string),
        'paymentMethods.retrieve'
      );
      
      // L2: Validate payment method type before accessing card properties
      if (pm.type !== 'card') {
        finalLog.info("Payment method is not a card", { type: pm.type });
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
      // S5: Remove sensitive last4 from logs (still returned in response for UI)
      finalLog.info("Found payment method", { brand: card.brand, hasCard: true });
    } else {
      // Try to get from subscriptions (active or trialing)
      const subscriptions = await stripeOperation<Stripe.ApiList<Stripe.Subscription>>(
        (stripe) => stripe.subscriptions.list({ customer: org.stripe_customer_id!, limit: 5 }),
        'subscriptions.list'
      );

      // Find active or trialing subscription
      const validSub = subscriptions.data.find((s: Stripe.Subscription) => 
        s.status === "active" || s.status === "trialing"
      );

      if (validSub) {
        const pmId = validSub.default_payment_method;
        
        if (pmId) {
          const pm = await stripeOperation<Stripe.PaymentMethod>(
            (stripe) => stripe.paymentMethods.retrieve(pmId as string),
            'paymentMethods.retrieve.fromSub'
          );
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
            // S5: Remove sensitive last4 from logs (still returned in response for UI)
            finalLog.info("Found payment method from subscription", { brand: card.brand, hasCard: true });
          }
        }
      }
    }

    finalLog.info("Request completed", { hasPaymentMethod: !!paymentMethod, durationMs: log.duration() });

    return corsJsonResponse(req, { payment_method: paymentMethod }, 200);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'get-payment-method',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
