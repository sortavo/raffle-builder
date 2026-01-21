/**
 * Correlation ID middleware for distributed tracing
 * Provides structured JSON logging with correlation IDs for request tracing
 */

export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function getCorrelationId(req: Request): string {
  // Check if correlation ID was passed from another service
  const existingId = req.headers.get('x-correlation-id') ||
                     req.headers.get('x-request-id');
  return existingId || generateCorrelationId();
}

export interface RequestContext {
  correlationId: string;
  startTime: number;
  userId?: string;
  orgId?: string;
  functionName: string;
}

export function createRequestContext(req: Request, functionName: string): RequestContext {
  return {
    correlationId: getCorrelationId(req),
    startTime: Date.now(),
    functionName,
  };
}

export function enrichContext(
  ctx: RequestContext, 
  data: { userId?: string; orgId?: string }
): RequestContext {
  return { ...ctx, ...data };
}

/**
 * Structured logger with correlation ID
 * Outputs JSON for easy parsing in log aggregation systems
 */
export function createLogger(ctx: RequestContext) {
  const baseFields = () => ({
    correlationId: ctx.correlationId,
    function: ctx.functionName,
    ...(ctx.userId && { userId: ctx.userId }),
    ...(ctx.orgId && { orgId: ctx.orgId }),
    timestamp: new Date().toISOString(),
  });

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'INFO',
        message,
        ...baseFields(),
        ...data,
      }));
    },

    warn: (message: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: 'WARN',
        message,
        ...baseFields(),
        ...data,
      }));
    },

    error: (message: string, error?: Error | null, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({
        level: 'ERROR',
        message,
        error: error?.message,
        stack: error?.stack?.slice(0, 1000),
        ...baseFields(),
        ...data,
      }));
    },

    duration: () => Date.now() - ctx.startTime,
  };
}

export type Logger = ReturnType<typeof createLogger>;
