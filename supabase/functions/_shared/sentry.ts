/**
 * Lightweight Sentry client for Deno Edge Functions
 * Uses HTTP API since the full SDK doesn't work in Deno
 */

const SENTRY_DSN = Deno.env.get("SENTRY_DSN");

interface SentryContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  correlationId?: string;
  functionName?: string;
}

/**
 * Capture an exception and send to Sentry
 * Non-blocking - won't throw if Sentry fails
 */
export async function captureException(
  error: Error,
  context?: SentryContext
): Promise<void> {
  if (!SENTRY_DSN) {
    console.warn("[SENTRY] DSN not configured, skipping error capture");
    return;
  }

  try {
    // Parse DSN: https://KEY@HOST.ingest.sentry.io/PROJECT
    const dsnMatch = SENTRY_DSN.match(/https:\/\/(.+)@(.+)\.ingest\.sentry\.io\/(\d+)/);
    if (!dsnMatch) {
      console.error("[SENTRY] Invalid DSN format");
      return;
    }

    const [, publicKey, , projectId] = dsnMatch;
    const sentryUrl = `https://sentry.io/api/${projectId}/store/`;

    const event: Record<string, unknown> = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      level: 'error',
      platform: 'javascript',
      server_name: 'supabase-edge-functions',
      environment: Deno.env.get("ENVIRONMENT") || 'production',
      message: {
        formatted: error.message,
      },
      exception: {
        values: [{
          type: error.name,
          value: error.message,
          stacktrace: {
            frames: parseStackTrace(error.stack || ''),
          },
        }],
      },
      tags: {
        function_name: context?.functionName || 'unknown',
        correlation_id: context?.correlationId || 'unknown',
        runtime: 'deno',
        ...context?.tags,
      },
      extra: context?.extra,
    };

    const response = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(event),
    });

    if (response.ok) {
      console.log(`[SENTRY] Error captured: ${error.message.slice(0, 100)}`);
    } else {
      console.warn(`[SENTRY] Failed to send: ${response.status}`);
    }
  } catch (sentryError) {
    // Don't let Sentry errors break the application
    console.error("[SENTRY] Failed to capture error:", sentryError);
  }
}

/**
 * Parse a stack trace into Sentry's frame format
 */
function parseStackTrace(stack: string): Array<{ filename: string; lineno: number; function: string }> {
  const frames: Array<{ filename: string; lineno: number; function: string }> = [];
  const lines = stack.split('\n').slice(1); // Skip first line (error message)

  for (const line of lines) {
    const match = line.match(/at (.+?) \((.+?):(\d+):\d+\)/);
    if (match) {
      frames.push({
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3], 10),
      });
    }
  }

  return frames.reverse(); // Sentry expects oldest frame first
}

/**
 * Capture an exception and then rethrow it
 * Useful for catch blocks where you want to log but not swallow the error
 */
export async function captureAndRethrow(
  error: Error,
  context?: SentryContext
): Promise<never> {
  await captureException(error, context);
  throw error;
}
