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

  const ctx = createRequestContext(req, 'list-invoices');
  const log = createLogger(ctx);

  try {
    log.info("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
    if (!user?.email) throw new Error("User not authenticated");
    
    const enrichedCtx = enrichContext(ctx, { userId: user.id });
    const enrichedLog = createLogger(enrichedCtx);
    enrichedLog.info("User authenticated");

    // Get user's organization
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error("Could not find user's organization");
    }

    const { data: org } = await supabaseClient
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", profile.organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      enrichedLog.info("No Stripe customer found");
      return corsJsonResponse(req, { invoices: [] }, 200);
    }

    const finalCtx = enrichContext(enrichedCtx, { orgId: profile.organization_id });
    const finalLog = createLogger(finalCtx);

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

    // Issue 4: Parse request body for pagination params
    const body = await req.json().catch(() => ({}));
    const { limit = 12, starting_after } = body;

    // Fetch invoices with pagination support
    const invoicesParams: Stripe.InvoiceListParams = {
      customer: org.stripe_customer_id,
      limit: Math.min(limit, 100), // Max 100 per Stripe API
    };

    if (starting_after) {
      invoicesParams.starting_after = starting_after;
    }

    const invoices = await stripe.invoices.list(invoicesParams);

    finalLog.info("Fetched invoices", { count: invoices.data.length, hasMore: invoices.has_more });

    const formattedInvoices = invoices.data.map((inv: Stripe.Invoice) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      amount_due: inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      period_start: inv.period_start,
      period_end: inv.period_end,
      invoice_pdf: inv.invoice_pdf,
      hosted_invoice_url: inv.hosted_invoice_url,
      description: inv.lines.data[0]?.description || "Suscripción",
    }));

    finalLog.info("Request completed", { durationMs: log.duration() });

    return corsJsonResponse(req, { 
      invoices: formattedInvoices,
      has_more: invoices.has_more,
      next_cursor: invoices.data.length > 0 ? invoices.data[invoices.data.length - 1].id : null,
    }, 200);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    await captureException(err, {
      functionName: 'list-invoices',
      correlationId: ctx.correlationId,
    });
    
    log.error("Unhandled error", err, { durationMs: log.duration() });
    return corsJsonResponse(req, { error: err.message }, 500);
  }
});
