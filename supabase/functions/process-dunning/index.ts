import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { logBillingAction, logSubscriptionEvent } from "../_shared/audit-logger.ts";
import { STRIPE_API_VERSION } from "../_shared/stripe-config.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-DUNNING] ${step}${detailsStr}`);
};

// Dunning email types in order of escalation
const DUNNING_SEQUENCE = [
  'first_notice',
  'second_notice', 
  'final_notice',
  'suspension_warning',
  'account_suspended',
] as const;

// Issue M5: Email sending with retry and exponential backoff
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmailWithRetry(
  supabase: any,
  emailData: { template: string; to: string; data: Record<string, unknown> },
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase.functions.invoke('send-email', { body: emailData });
      if (!error) return true;
      logStep(`Email send attempt ${attempt} failed`, { error: error.message });
    } catch (err) {
      logStep(`Email send attempt ${attempt} threw`, { error: String(err) });
    }
    if (attempt < maxRetries) {
      // R6: Exponential backoff with jitter
      const baseDelay = 1000 * attempt;
      const jitter = Math.random() * 500; // 0-500ms jitter
      await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
    }
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  // CRITICAL: Verify this is called from cron (service role) or admin
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!authHeader || !serviceRoleKey) {
    logStep("Missing authorization", { hasAuth: !!authHeader });
    return corsJsonResponse(req, { error: "Unauthorized" }, 401);
  }
  
  const token = authHeader.replace("Bearer ", "");
  if (token !== serviceRoleKey) {
    logStep("Invalid authorization token");
    return corsJsonResponse(req, { error: "Unauthorized" }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Dunning processor started");
    const requestId = crypto.randomUUID().slice(0, 8);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

    // Get all unresolved payment failures
    const { data: failures, error: fetchError } = await supabaseAdmin
      .from("payment_failures")
      .select(`
        *,
        organizations (
          id, 
          email, 
          name, 
          subscription_tier, 
          subscription_status,
          stripe_subscription_id,
          suspended
        )
      `)
      .is("resolved_at", null)
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch payment failures: ${fetchError.message}`);
    }

    logStep("Found unresolved payment failures", { count: failures?.length || 0 });

    if (!failures || failures.length === 0) {
      return corsJsonResponse(req, { 
        success: true, 
        processed: 0,
        message: "No unresolved payment failures" 
      }, 200);
    }

    // P6: Get dunning config - specific columns only
    const { data: dunningConfigs } = await supabaseAdmin
      .from("dunning_config")
      .select("subscription_tier, grace_period_days, suspension_after_days, cancellation_after_days, retry_schedule, email_schedule");

    type DunningConfig = {
      subscription_tier: string;
      grace_period_days: number;
      suspension_after_days: number;
      cancellation_after_days: number;
      retry_schedule: number[];
      email_schedule: Record<string, number>;
    };

    const configByTier = (dunningConfigs || []).reduce((acc, config) => {
      acc[config.subscription_tier] = config as DunningConfig;
      return acc;
    }, {} as Record<string, DunningConfig>);

    // P4: Batch load all dunning emails for all failures upfront (avoid N+1)
    const failureIds = failures.map(f => f.id);
    const { data: allSentEmails } = await supabaseAdmin
      .from("dunning_emails")
      .select("payment_failure_id, email_type")
      .in("payment_failure_id", failureIds);

    // Group sent emails by failure ID for O(1) lookup
    const sentEmailsByFailure = (allSentEmails || []).reduce((acc, email) => {
      if (!acc[email.payment_failure_id]) {
        acc[email.payment_failure_id] = new Set<string>();
      }
      acc[email.payment_failure_id].add(email.email_type);
      return acc;
    }, {} as Record<string, Set<string>>);

    let processed = 0;
    let suspended = 0;
    let retried = 0;
    let emailsSent = 0;

    for (const failure of failures) {
      const org = failure.organizations;
      if (!org) {
        logStep("Skipping failure - no organization", { failureId: failure.id });
        continue;
      }

      const tier = org.subscription_tier || 'basic';
      const config = configByTier[tier] || configByTier['basic'] || {
        grace_period_days: 7,
        suspension_after_days: 14,
        cancellation_after_days: 30,
        retry_schedule: [1, 3, 5, 7],
        email_schedule: { first_notice: 0, second_notice: 3, final_notice: 7, suspension_warning: 10 },
      };

      const daysSinceFailure = Math.floor(
        (Date.now() - new Date(failure.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      logStep("Processing failure", { 
        failureId: failure.id,
        orgId: org.id,
        tier,
        daysSinceFailure,
        attemptCount: failure.attempt_count,
      });

      // Check if we should retry payment
      const retrySchedule = config.retry_schedule as number[];
      const shouldRetry = retrySchedule.some((day, index) => 
        day === daysSinceFailure && failure.attempt_count === index + 1
      );

      if (shouldRetry && org.stripe_subscription_id) {
        try {
          logStep("Attempting payment retry", { subscriptionId: org.stripe_subscription_id });

          // Get the latest invoice for this subscription
          const invoices = await stripe.invoices.list({
            subscription: org.stripe_subscription_id,
            status: 'open',
            limit: 1,
          });

          if (invoices.data.length > 0) {
            const invoice = invoices.data[0];
            // R4: Add idempotency key for payment retry
            const idempotencyKey = `dunning_pay_${invoice.id}_${Date.now()}`;
            await stripe.invoices.pay(invoice.id, {}, { idempotencyKey });
            
            // Mark as resolved if payment succeeds
            await supabaseAdmin
              .from("payment_failures")
              .update({
                resolved_at: new Date().toISOString(),
                resolution: 'paid',
                attempt_count: failure.attempt_count + 1,
              })
              .eq("id", failure.id);

            retried++;
            logStep("Payment retry succeeded", { invoiceId: invoice.id });

            await logBillingAction(supabaseAdmin, {
              organizationId: org.id,
              actorType: 'system',
              action: 'payment_succeeded',
              resourceType: 'invoice',
              resourceId: invoice.id,
              metadata: { via: 'dunning_retry', attempt: failure.attempt_count + 1 },
              requestId,
            });

            continue;
          }
        } catch (retryError) {
          const errorMessage = retryError instanceof Error ? retryError.message : String(retryError);
          logStep("Payment retry failed", { error: errorMessage });

          // Update attempt count
          await supabaseAdmin
            .from("payment_failures")
            .update({ attempt_count: failure.attempt_count + 1 })
            .eq("id", failure.id);
        }
      }

      // Determine which dunning email to send
      const emailSchedule = config.email_schedule as Record<string, number>;
      // P4: Use pre-loaded emails instead of querying in loop
      const sentTypes = sentEmailsByFailure[failure.id] || new Set<string>();
      let emailToSend: typeof DUNNING_SEQUENCE[number] | null = null;

      for (const emailType of DUNNING_SEQUENCE) {
        const scheduledDay = emailSchedule[emailType];
        if (scheduledDay !== undefined && daysSinceFailure >= scheduledDay && !sentTypes.has(emailType)) {
          emailToSend = emailType;
          break;
        }
      }

      if (emailToSend) {
        logStep("Sending dunning email", { type: emailToSend, orgId: org.id });

        // Record the email (actual sending would be done via send-email function)
        await supabaseAdmin.from("dunning_emails").insert({
          payment_failure_id: failure.id,
          organization_id: org.id,
          email_type: emailToSend,
          sent_to: org.email,
        });

        // Issue M5: Call send-email function with retry logic
        const emailSent = await sendEmailWithRetry(supabaseAdmin, {
          template: `dunning_${emailToSend}`,
          to: org.email,
          data: {
            organizationName: org.name,
            amountDue: (failure.amount_cents / 100).toFixed(2),
            currency: failure.currency?.toUpperCase() || 'USD',
            daysSinceFailure,
            updatePaymentUrl: `https://sortavo.com/dashboard/subscription?update_payment=true`,
          },
        });

        if (!emailSent) {
          logStep("All email attempts failed", { type: emailToSend, orgId: org.id });
        }

        await logBillingAction(supabaseAdmin, {
          organizationId: org.id,
          actorType: 'system',
          action: 'dunning_email_sent',
          resourceType: 'invoice',
          resourceId: failure.stripe_invoice_id,
          metadata: { email_type: emailToSend, days_since_failure: daysSinceFailure },
          requestId,
        });

        emailsSent++;
      }

      // Check if we should suspend the account
      if (daysSinceFailure >= config.suspension_after_days && !org.suspended) {
        logStep("Suspending account", { orgId: org.id, daysSinceFailure });

        await supabaseAdmin
          .from("organizations")
          .update({ 
            suspended: true,
            subscription_status: 'past_due',
          })
          .eq("id", org.id);

        await logBillingAction(supabaseAdmin, {
          organizationId: org.id,
          actorType: 'system',
          action: 'account_suspended',
          resourceType: 'organization',
          resourceId: org.id,
          metadata: { reason: 'payment_failure', days_overdue: daysSinceFailure },
          requestId,
        });

        await logSubscriptionEvent(supabaseAdmin, {
          organizationId: org.id,
          eventType: 'subscription_canceled',
          fromTier: tier,
          toTier: null,
          metadata: { reason: 'payment_failure_suspension' },
        });

        suspended++;
      }

      // Check if we should cancel the subscription entirely
      if (daysSinceFailure >= config.cancellation_after_days && org.stripe_subscription_id) {
        logStep("Canceling subscription", { orgId: org.id, daysSinceFailure });

        try {
          await stripe.subscriptions.cancel(org.stripe_subscription_id);

          await supabaseAdmin
            .from("payment_failures")
            .update({
              resolved_at: new Date().toISOString(),
              resolution: 'canceled',
            })
            .eq("id", failure.id);

          // Reset org to basic tier
          await supabaseAdmin
            .from("organizations")
            .update({
              subscription_tier: 'basic',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
              max_active_raffles: 2,
              max_tickets_per_raffle: 2000,
              templates_available: 3,
            })
            .eq("id", org.id);

        } catch (cancelError) {
          logStep("Failed to cancel subscription", { 
            error: cancelError instanceof Error ? cancelError.message : String(cancelError) 
          });
        }
      }

      processed++;
    }

    logStep("Dunning process completed", { processed, retried, emailsSent, suspended });

    return corsJsonResponse(req, {
      success: true,
      processed,
      retried,
      emailsSent,
      suspended,
    }, 200);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return corsJsonResponse(req, { error: errorMessage }, 500);
  }
});
