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

## Archivos Compartidos

| Archivo | Descripción |
|---------|-------------|
| `stripe-config.ts` | IDs de productos/precios, límites por tier, versión de API |
| `cors.ts` | Manejo centralizado de CORS para todas las funciones |
| `audit-logger.ts` | Logging de eventos de billing para compliance |
| `admin-auth.ts` | Autenticación y validación de administradores |
| `job-queue.ts` | Cola de trabajos async para webhooks pesados |
| `rate-limiter.ts` | Limitación de rate para protección contra abusos |

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

## Notas Importantes

1. **NUNCA** usar variables `VITE_*` en edge functions
2. **SIEMPRE** usar `STRIPE_API_VERSION` en lugar de hardcodear la versión
3. **SIEMPRE** validar origins para funciones que aceptan requests del frontend
4. Las claves de servicio de Supabase se inyectan automáticamente
