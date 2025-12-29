import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceHealth {
  name: string;
  status: "operational" | "degraded" | "outage";
  responseTime: number;
  message?: string;
  lastChecked: string;
}

interface SystemMetrics {
  database: {
    ticketCount: number;
    raffleCount: number;
    organizationCount: number;
    activeRaffleCount: number;
  };
  performance: {
    avgDbLatency: number;
    avgAuthLatency: number;
    avgStorageLatency: number;
  };
}

const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return { result, duration };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const services: ServiceHealth[] = [];
  const now = new Date().toISOString();
  let dbLatencies: number[] = [];
  let metrics: SystemMetrics | null = null;

  // Parse query params for detailed mode
  const url = new URL(req.url);
  const detailed = url.searchParams.get('detailed') === 'true';

  console.log(`[HEALTH-CHECK] Starting health check, detailed=${detailed}`);

  // 1. Check Database with metrics
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { duration } = await measureTime(async () => {
      const { error } = await supabase.from("organizations").select("id").limit(1);
      if (error) throw error;
      return true;
    });
    dbLatencies.push(duration);

    // Get system metrics if detailed mode
    if (detailed) {
      const [ticketResult, raffleResult, orgResult, activeResult] = await Promise.all([
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('raffles').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      metrics = {
        database: {
          ticketCount: ticketResult.count || 0,
          raffleCount: raffleResult.count || 0,
          organizationCount: orgResult.count || 0,
          activeRaffleCount: activeResult.count || 0,
        },
        performance: {
          avgDbLatency: 0,
          avgAuthLatency: 0,
          avgStorageLatency: 0,
        },
      };
    }

    services.push({
      name: "Base de Datos",
      status: duration < 500 ? "operational" : duration < 2000 ? "degraded" : "outage",
      responseTime: duration,
      lastChecked: now,
    });
  } catch (error) {
    console.error("[HEALTH-CHECK] Database error:", error);
    services.push({
      name: "Base de Datos",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: now,
    });
  }

  // 2. Check Stripe API
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      services.push({
        name: "Pagos (Stripe)",
        status: "outage",
        responseTime: 0,
        message: "API key no configurada",
        lastChecked: now,
      });
    } else {
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      
      const { duration } = await measureTime(async () => {
        await stripe.balance.retrieve();
        return true;
      });

      services.push({
        name: "Pagos (Stripe)",
        status: duration < 1000 ? "operational" : duration < 3000 ? "degraded" : "outage",
        responseTime: duration,
        lastChecked: now,
      });
    }
  } catch (error) {
    console.error("[HEALTH-CHECK] Stripe error:", error);
    services.push({
      name: "Pagos (Stripe)",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: now,
    });
  }

  // 3. Check Edge Functions
  services.push({
    name: "API / Edge Functions",
    status: "operational",
    responseTime: 1,
    lastChecked: now,
  });

  // 4. Check Auth Service
  let authLatency = 0;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { duration } = await measureTime(async () => {
      const { error } = await supabase.auth.getSession();
      if (error && !error.message.includes("session")) throw error;
      return true;
    });
    authLatency = duration;

    services.push({
      name: "Autenticación",
      status: duration < 500 ? "operational" : duration < 2000 ? "degraded" : "outage",
      responseTime: duration,
      lastChecked: now,
    });
  } catch (error) {
    console.error("[HEALTH-CHECK] Auth error:", error);
    services.push({
      name: "Autenticación",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: now,
    });
  }

  // 5. Check Email Service (Resend)
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      services.push({
        name: "Email",
        status: "degraded",
        responseTime: 0,
        message: "API key no configurada",
        lastChecked: now,
      });
    } else {
      const { duration } = await measureTime(async () => {
        const response = await fetch("https://api.resend.com/domains", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok && response.status !== 401) {
          throw new Error(`HTTP ${response.status}`);
        }
        return true;
      });

      services.push({
        name: "Email",
        status: duration < 1000 ? "operational" : duration < 3000 ? "degraded" : "outage",
        responseTime: duration,
        lastChecked: now,
      });
    }
  } catch (error) {
    console.error("[HEALTH-CHECK] Email error:", error);
    services.push({
      name: "Email",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: now,
    });
  }

  // 6. Check Storage
  let storageLatency = 0;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { duration } = await measureTime(async () => {
      const { error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return true;
    });
    storageLatency = duration;

    services.push({
      name: "Almacenamiento",
      status: duration < 500 ? "operational" : duration < 2000 ? "degraded" : "outage",
      responseTime: duration,
      lastChecked: now,
    });
  } catch (error) {
    console.error("[HEALTH-CHECK] Storage error:", error);
    services.push({
      name: "Almacenamiento",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: now,
    });
  }

  // Calculate overall status
  const hasOutage = services.some(s => s.status === "outage");
  const hasDegraded = services.some(s => s.status === "degraded");
  const overallStatus = hasOutage ? "outage" : hasDegraded ? "degraded" : "operational";

  // Calculate average latencies for metrics
  if (metrics) {
    metrics.performance.avgDbLatency = dbLatencies.length > 0 
      ? Math.round(dbLatencies.reduce((a, b) => a + b, 0) / dbLatencies.length) 
      : 0;
    metrics.performance.avgAuthLatency = authLatency;
    metrics.performance.avgStorageLatency = storageLatency;
  }

  const response: {
    status: string;
    services: ServiceHealth[];
    checkedAt: string;
    version: string;
    metrics?: SystemMetrics;
  } = {
    status: overallStatus,
    services,
    checkedAt: now,
    version: "1.1.0",
  };

  if (detailed && metrics) {
    response.metrics = metrics;
  }

  console.log(`[HEALTH-CHECK] Complete. Status: ${overallStatus}, Services: ${services.length}`);

  return new Response(JSON.stringify(response), {
    headers: { 
      ...corsHeaders, 
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
    status: 200,
  });
});
