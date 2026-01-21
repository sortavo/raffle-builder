// ============================================================================
// Health Check with Caching and Rate Limiting
// ============================================================================
// Caches results for 30 seconds to reduce API load
// Rate limits to 60 requests per minute per IP

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getQueueStats, getDlqStats } from "../_shared/job-queue.ts";
// C4 Security: Use centralized CORS with origin whitelist instead of wildcard
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

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

interface CachedResult {
  data: {
    status: string;
    services: ServiceHealth[];
    checkedAt: string;
    version: string;
    metrics?: SystemMetrics;
  };
  timestamp: number;
}

// Module-level cache (persists across warm requests within same isolate)
let cachedResult: CachedResult | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds

// Simple in-memory rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  // Cleanup old entries periodically
  if (rateLimits.size > 1000) {
    for (const [key, val] of rateLimits) {
      if (now > val.resetAt) rateLimits.delete(key);
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return { result, duration };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getCorsHeaders(req);
  const clientIP = getClientIP(req);

  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    console.log(`[HEALTH-CHECK] Rate limit exceeded for ${clientIP}`);
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 60 }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  // Parse query params
  const url = new URL(req.url);
  const detailed = url.searchParams.get('detailed') === 'true';
  const noCache = url.searchParams.get('no-cache') === 'true';
  const now = Date.now();

  // Check cache (unless no-cache requested)
  if (!noCache && cachedResult && (now - cachedResult.timestamp) < CACHE_TTL_MS) {
    const cacheAge = Math.round((now - cachedResult.timestamp) / 1000);
    console.log(`[HEALTH-CHECK] Returning cached result (${cacheAge}s old)`);
    
    return new Response(
      JSON.stringify({ ...cachedResult.data, cached: true, cacheAge }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${Math.ceil(CACHE_TTL_MS / 1000)}`,
          'X-Cache': 'HIT',
          'X-Cache-Age': cacheAge.toString(),
        },
        status: 200,
      }
    );
  }

  console.log(`[HEALTH-CHECK] Running fresh health check, detailed=${detailed}`);

  const services: ServiceHealth[] = [];
  const checkedAt = new Date().toISOString();
  const dbLatencies: number[] = [];
  let metrics: SystemMetrics | null = null;

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
      const [orderResult, raffleResult, orgResult, activeResult] = await Promise.all([
        supabase.from('orders').select('ticket_count').eq('status', 'sold'),
        supabase.from('raffles').select('*', { count: 'exact', head: true }),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      const ticketCount = (orderResult.data || []).reduce((sum, o) => sum + (o.ticket_count || 0), 0);

      metrics = {
        database: {
          ticketCount: ticketCount,
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
      lastChecked: checkedAt,
    });
  } catch (error) {
    console.error("[HEALTH-CHECK] Database error:", error);
    services.push({
      name: "Base de Datos",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: checkedAt,
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
        lastChecked: checkedAt,
      });
    } else {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      const { duration } = await measureTime(async () => {
        await stripe.balance.retrieve();
        return true;
      });

      services.push({
        name: "Pagos (Stripe)",
        status: duration < 1000 ? "operational" : duration < 3000 ? "degraded" : "outage",
        responseTime: duration,
        lastChecked: checkedAt,
      });
    }
  } catch (error) {
    console.error("[HEALTH-CHECK] Stripe error:", error);
    services.push({
      name: "Pagos (Stripe)",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: checkedAt,
    });
  }

  // 3. Check Edge Functions (self-check)
  services.push({
    name: "API / Edge Functions",
    status: "operational",
    responseTime: 1,
    lastChecked: checkedAt,
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
      lastChecked: checkedAt,
    });
  } catch (error) {
    console.error("[HEALTH-CHECK] Auth error:", error);
    services.push({
      name: "Autenticación",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: checkedAt,
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
        lastChecked: checkedAt,
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
        lastChecked: checkedAt,
      });
    }
  } catch (error) {
    console.error("[HEALTH-CHECK] Email error:", error);
    services.push({
      name: "Email",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: checkedAt,
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
      lastChecked: checkedAt,
    });
  } catch (error) {
    console.error("[HEALTH-CHECK] Storage error:", error);
    services.push({
      name: "Almacenamiento",
      status: "outage",
      responseTime: 0,
      message: error instanceof Error ? error.message : "Error de conexión",
      lastChecked: checkedAt,
    });
  }

  // 7. Check Job Queue (O4: Add queue monitoring)
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (redisUrl && redisToken) {
    try {
      const queueStartTime = performance.now();
      const stats = await getQueueStats(redisUrl, redisToken);
      const queueDuration = Math.round(performance.now() - queueStartTime);
      
      if (stats) {
        const totalPending = stats.high + stats.normal + stats.low;
        
        // Thresholds: >100 = degraded, >500 = outage
        let queueStatus: "operational" | "degraded" | "outage" = "operational";
        if (totalPending > 500) {
          queueStatus = "outage";
        } else if (totalPending > 100) {
          queueStatus = "degraded";
        }

        services.push({
          name: "Cola de Trabajos",
          status: queueStatus,
          responseTime: queueDuration,
          lastChecked: checkedAt,
          message: totalPending > 0 ? `${totalPending} trabajos pendientes` : undefined,
        });
      }
    } catch (error) {
      console.error("[HEALTH-CHECK] Job queue error:", error);
      services.push({
        name: "Cola de Trabajos",
        status: "degraded",
        responseTime: 0,
        message: "No se pudo verificar la cola",
        lastChecked: checkedAt,
      });
    }

    // 8. Check Dead Letter Queue (R7 - Failed jobs monitoring)
    try {
      const dlqStats = await getDlqStats(redisUrl, redisToken);
      if (dlqStats.count > 0) {
        let dlqStatus: "operational" | "degraded" | "outage" = "operational";
        if (dlqStats.count > 50) {
          dlqStatus = "outage";
        } else if (dlqStats.count > 10) {
          dlqStatus = "degraded";
        }

        services.push({
          name: "Dead Letter Queue",
          status: dlqStatus,
          responseTime: 0,
          lastChecked: checkedAt,
          message: `${dlqStats.count} jobs fallidos pendientes de revisión`,
        });
      }
    } catch (dlqError) {
      console.error("[HEALTH-CHECK] DLQ stats error:", dlqError);
      // Don't add to services if DLQ check fails - it's informational only
    }
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

  const responseData: {
    status: string;
    services: ServiceHealth[];
    checkedAt: string;
    version: string;
    metrics?: SystemMetrics;
    cached?: boolean;
  } = {
    status: overallStatus,
    services,
    checkedAt,
    version: "1.3.0",
  };

  if (detailed && metrics) {
    responseData.metrics = metrics;
  }

  // Cache the result
  cachedResult = {
    data: responseData,
    timestamp: Date.now(),
  };

  console.log(`[HEALTH-CHECK] Complete. Status: ${overallStatus}, Services: ${services.length}`);

  return new Response(JSON.stringify({ ...responseData, cached: false }), {
    headers: { 
      ...corsHeaders, 
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${Math.ceil(CACHE_TTL_MS / 1000)}`,
      "X-Cache": "MISS",
    },
    status: 200,
  });
});
