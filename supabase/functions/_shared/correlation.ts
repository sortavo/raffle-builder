/**
 * Correlation ID middleware for distributed tracing
 * Provides structured JSON logging with correlation IDs for request tracing
 */

// C1 PCI DSS: Patterns to redact from logs for security compliance
const SENSITIVE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Card numbers (PAN) - 13-19 digits
  { pattern: /\b\d{13,19}\b/g, replacement: '[CARD_REDACTED]' },
  // CVV/CVC patterns near keywords
  { pattern: /\b\d{3,4}\b(?=\s*(cvv|cvc|csv|security.?code))/gi, replacement: '[CVV_REDACTED]' },
  // Emails - partial redaction (keep domain visible for debugging)
  { pattern: /\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g, replacement: '[EMAIL]@$2' },
];

// E8: Expanded sensitive field list for enhanced log sanitization
const SENSITIVE_FIELD_NAMES = [
  'card_number', 'pan', 'cvv', 'cvc', 'security_code',
  'card', 'credit_card', 'debit_card', 'account_number',
  'password', 'secret', 'token', 'api_key', 'private_key',
  'last4', 'exp_month', 'exp_year', 'fingerprint', 'routing_number',
  'ssn', 'tax_id', 'bank_account'
];

/**
 * C1 PCI DSS: Sanitize log data to prevent sensitive information exposure
 * Redacts card numbers, CVV, and partially masks emails
 */
export function sanitizeLogData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    let sanitized = data as string;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized as T;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item)) as T;
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as object)) {
      const keyLower = key.toLowerCase();
      // Fully redact known sensitive field names
      if (SENSITIVE_FIELD_NAMES.some(name => keyLower.includes(name))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized as T;
  }
  
  return data;
}

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
    // C1 PCI DSS: All log methods now sanitize data automatically
    info: (message: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({
        level: 'INFO',
        message,
        ...baseFields(),
        ...sanitizeLogData(data),
      }));
    },

    warn: (message: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({
        level: 'WARN',
        message,
        ...baseFields(),
        ...sanitizeLogData(data),
      }));
    },

    error: (message: string, error?: Error | null, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({
        level: 'ERROR',
        message,
        error: sanitizeLogData(error?.message),
        stack: error?.stack?.slice(0, 1000),
        ...baseFields(),
        ...sanitizeLogData(data),
      }));
    },

    duration: () => Date.now() - ctx.startTime,
  };
}

export type Logger = ReturnType<typeof createLogger>;
