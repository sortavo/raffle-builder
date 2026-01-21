# Edge Functions - Shared Configuration

This directory contains shared utilities and configuration files used across all Supabase Edge Functions.

## Variables de Entorno Requeridas

### Stripe (Obligatorias)
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe | `sk_live_...` o `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook | `whsec_...` |

### Supabase (Automáticas)
| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase (auto-inyectada) |
| `SUPABASE_ANON_KEY` | Clave pública anónima (auto-inyectada) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio para bypass de RLS (auto-inyectada) |

### Opcionales
| Variable | Descripción | Uso |
|----------|-------------|-----|
| `UPSTASH_REDIS_REST_URL` | URL de Redis para colas | Procesamiento async de webhooks |
| `UPSTASH_REDIS_REST_TOKEN` | Token de autenticación de Upstash | Procesamiento async de webhooks |
| `INTERNAL_FUNCTION_SECRET` | Secreto para llamadas entre funciones | Autenticación interna |

### Demo Account Security (Opcional)
| Variable | Descripción | Uso |
|----------|-------------|-----|
| `DEMO_ACCOUNT_PASSWORD` | Contraseña para cuentas demo (si no se configura, se genera una aleatoria segura) | Creación de cuentas demo |
| `DEMO_CREATION_SECRET` | Secreto para autenticar llamadas internas de creación de demos | Autenticación de API interna |

## Archivos Compartidos

### Core
| Archivo | Descripción |
|---------|-------------|
| `stripe-config.ts` | IDs de productos/precios, límites por tier, versión de API |
| `stripe-client.ts` | Cliente Stripe con circuit breaker integrado |
| `cors.ts` | Manejo centralizado de CORS para todas las funciones |

### Seguridad y Auth
| Archivo | Descripción |
|---------|-------------|
| `admin-auth.ts` | Autenticación y validación de administradores |
| `role-validator.ts` | Validación de roles para acciones de billing (owner/admin) |

### Resiliencia
| Archivo | Descripción |
|---------|-------------|
| `circuit-breaker.ts` | Circuit breaker para protección contra fallos de Stripe |
| `job-queue.ts` | Cola de trabajos async para webhooks pesados (Upstash) |
| `rate-limiter.ts` | Rate limiting en memoria |
| `tenant-rate-limiter.ts` | Rate limiting persistente por organización (Redis) |
| `persistent-rate-limiter.ts` | Rate limiter con persistencia en Redis |

### Observabilidad
| Archivo | Descripción |
|---------|-------------|
| `audit-logger.ts` | Logging de eventos de billing para compliance |
| `correlation.ts` | IDs de correlación y logging estructurado |
| `sentry.ts` | Integración con Sentry para error tracking |

### Utilidades
| Archivo | Descripción |
|---------|-------------|
| `error-mapper.ts` | Traducción de errores Stripe a mensajes en español |
| `errors.ts` | Clases de error personalizadas |
| `db-utils.ts` | Utilidades para operaciones de base de datos |
| `atomic-updates.ts` | Updates atómicos para webhooks (transacciones) |
| `redis-client.ts` | Cliente Redis para Upstash |
| `vercel-config.ts` | Configuración para dominios personalizados |

## Configuración de Stripe

Los productos y precios están definidos en `stripe-config.ts`:

### Tiers Disponibles
- **Basic**: $49/mes, 2 rifas, 2,000 boletos, 3 plantillas
- **Pro**: $149/mes, 7 rifas, 30,000 boletos, 6 plantillas
- **Premium**: $299/mes, 15 rifas, 100,000 boletos, 9 plantillas
- **Enterprise**: $499/mes, ilimitado

### Exportaciones Principales
```typescript
import { 
  STRIPE_API_VERSION,     // Versión de API de Stripe
  PRODUCT_TO_TIER,        // Mapeo product_id -> tier
  TIER_LIMITS,            // Límites por tier
  BASIC_PRICE_IDS,        // IDs de precios del plan básico
  TIER_MRR_CENTS,         // MRR en centavos por tier
} from "./_shared/stripe-config.ts";
```

## Uso de CORS

```typescript
import { 
  getCorsHeaders,       // Headers CORS para la respuesta
  handleCorsPrelight,   // Manejador de OPTIONS
  corsJsonResponse      // Respuesta JSON con CORS
} from "./_shared/cors.ts";
```

## Audit Logging

```typescript
import { 
  logBillingAction,      // Log de acciones de billing
  logSubscriptionEvent,  // Log de eventos de suscripción
  calculateMrrChange     // Cálculo de cambio en MRR
} from "./_shared/audit-logger.ts";
```

## Circuit Breaker (Stripe API)

```typescript
import { stripeOperation, isStripeCircuitOpen } from "./_shared/stripe-client.ts";

// Operación protegida con circuit breaker
const customer = await stripeOperation<Stripe.Customer>(
  (stripe) => stripe.customers.retrieve(customerId),
  'customers.retrieve'
);

// Verificar estado antes de operación
if (await isStripeCircuitOpen()) {
  return corsJsonResponse(req, { error: "Stripe no disponible" }, 503);
}
```

## Correlation IDs y Logging

```typescript
import { createRequestContext, enrichContext, createLogger } from "./_shared/correlation.ts";

const ctx = createRequestContext(req, 'my-function');
const log = createLogger(ctx);

log.info("Starting", { userId });
log.warn("Something odd", { detail });
log.error("Failed", error);
```

## Error Mapping

```typescript
import { mapStripeError } from "./_shared/error-mapper.ts";

try {
  // operación Stripe
} catch (error) {
  const userMessage = mapStripeError(error); // Retorna mensaje en español
  return corsJsonResponse(req, { error: userMessage }, 500);
}
```

## Role Validation

```typescript
import { canManageSubscription } from "./_shared/role-validator.ts";

const roleCheck = await canManageSubscription(supabase, userId, orgId);
if (!roleCheck.isValid) {
  return corsJsonResponse(req, { error: roleCheck.error }, 403);
}
```

## Tenant Rate Limiting

```typescript
import { checkTenantRateLimit, TENANT_RATE_LIMITS } from "./_shared/tenant-rate-limiter.ts";

const result = await checkTenantRateLimit(
  redisUrl, redisToken,
  organizationId, userId,
  TENANT_RATE_LIMITS.SUBSCRIPTION
);

if (!result.allowed) {
  return tenantRateLimitResponse(result, corsHeaders);
}
```

## Sentry Integration

```typescript
import { captureException } from "./_shared/sentry.ts";

try {
  // operación
} catch (error) {
  await captureException(error, {
    functionName: 'my-function',
    correlationId: ctx.correlationId,
  });
}
```

## Notas Importantes

1. **NUNCA** usar variables `VITE_*` en edge functions
2. **SIEMPRE** usar `STRIPE_API_VERSION` en lugar de hardcodear la versión
3. **SIEMPRE** validar origins para funciones que aceptan requests del frontend
4. **SIEMPRE** usar circuit breaker para llamadas a Stripe (`stripeOperation`)
5. **SIEMPRE** incluir correlation IDs en logs para tracing
6. Las claves de servicio de Supabase se inyectan automáticamente
