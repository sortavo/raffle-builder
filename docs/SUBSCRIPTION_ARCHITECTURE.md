# Arquitectura del Sistema de Suscripciones

## Resumen

El sistema de suscripciones de Sortavo utiliza Stripe como procesador de pagos, con una arquitectura event-driven que sincroniza el estado entre Stripe y la base de datos local.

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Subscription │  │   Pricing    │  │   Invoice    │  │   Payment    │     │
│  │   Settings   │  │     Page     │  │   History    │  │    Method    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE FUNCTIONS                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   customer   │  │    create    │  │    list      │  │     get      │     │
│  │    portal    │  │   checkout   │  │   invoices   │  │   payment    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │    method    │     │
│         │                 │                 │          └──────┬───────┘     │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐         │             │
│  │   upgrade    │  │    cancel    │  │  reactivate  │         │             │
│  │ subscription │  │ subscription │  │ subscription │         │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │             │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STRIPE API                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Billing    │  │   Checkout   │  │  Subscript.  │  │   Invoices   │     │
│  │    Portal    │  │   Sessions   │  │     API      │  │     API      │     │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  └──────────────┘     │
└─────────────────────────────────────────────┼───────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STRIPE WEBHOOKS                                    │
│                                                                              │
│  checkout.session.completed ──┐                                              │
│  customer.subscription.*    ──┼──► stripe-webhook ──► Supabase DB           │
│  invoice.payment_*          ──┤         │                                    │
│  customer.*                 ──┘         ▼                                    │
│                              ┌──────────────────┐                            │
│                              │  Async Queue     │ (Upstash Redis)            │
│                              │  (heavy events)  │                            │
│                              └──────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. Edge Functions de Suscripción

| Función | Propósito | Auth | Rate Limit |
|---------|-----------|------|------------|
| `create-checkout` | Crear sesión de pago | JWT | 5/min/org |
| `customer-portal` | Abrir portal de Stripe | JWT | 10/min/org |
| `upgrade-subscription` | Cambiar plan | JWT + Role | 3/min/org |
| `cancel-subscription` | Cancelar suscripción | JWT + Role | 3/min/org |
| `reactivate-subscription` | Reactivar cancelada | JWT + Role | 3/min/org |
| `preview-upgrade` | Preview de proration | JWT | 10/min/org |
| `list-invoices` | Listar facturas | JWT | 20/min/org |
| `get-payment-method` | Obtener tarjeta | JWT | 20/min/org |
| `stripe-webhook` | Procesar eventos | Signature | N/A |
| `process-dunning` | Recovery de pagos | Service Role | Cron |

### 2. Módulos Compartidos (_shared/)

| Módulo | Responsabilidad |
|--------|-----------------|
| `stripe-config.ts` | Mapeo de productos, tiers, límites, precios |
| `stripe-client.ts` | Cliente Stripe con circuit breaker |
| `circuit-breaker.ts` | Protección contra fallos de Stripe |
| `error-mapper.ts` | Traducción de errores Stripe → español |
| `audit-logger.ts` | Logging de compliance para billing |
| `correlation.ts` | IDs de correlación para tracing |
| `role-validator.ts` | Validación de roles para acciones de billing |
| `tenant-rate-limiter.ts` | Rate limiting por organización |
| `atomic-updates.ts` | Updates atómicos para webhooks |

### 3. Tablas de Base de Datos

```sql
-- Principales
organizations          -- subscription_tier, stripe_customer_id, etc.
stripe_events          -- Idempotencia de webhooks
billing_audit_log      -- Audit trail de billing
subscription_events    -- Analytics de suscripciones

-- Dunning/Recovery
payment_failures       -- Pagos fallidos
dunning_emails         -- Emails de cobro enviados
dunning_config         -- Configuración por tier

-- Refunds
refund_requests        -- Solicitudes de reembolso
refund_audit_log       -- Audit de reembolsos
```

## Flujos Principales

### Nuevo Checkout

```
1. Usuario selecciona plan en frontend
2. Frontend llama create-checkout con priceId
3. Edge function:
   a. Valida usuario autenticado
   b. Obtiene/crea Stripe customer
   c. Crea Checkout Session con metadata (organization_id)
   d. Retorna URL de checkout
4. Usuario completa pago en Stripe
5. Stripe envía webhook checkout.session.completed
6. stripe-webhook:
   a. Verifica firma
   b. Deduplica evento
   c. Actualiza organizations (tier, limits, status)
   d. Crea audit log
   e. Envía notificación
```

### Upgrade de Plan

```
1. Usuario solicita upgrade
2. Frontend llama preview-upgrade para mostrar proration
3. Usuario confirma
4. Frontend llama upgrade-subscription
5. Edge function:
   a. Valida rol (owner/admin)
   b. Rate limit check
   c. Actualiza subscription en Stripe
   d. Stripe genera invoice prorrateada
6. Stripe envía webhook customer.subscription.updated
7. stripe-webhook actualiza DB con nuevo tier
```

### Pago Fallido (Dunning)

```
1. Stripe intenta cobrar invoice
2. Pago falla → webhook invoice.payment_failed
3. stripe-webhook:
   a. Crea registro en payment_failures
   b. Actualiza subscription_status = 'past_due'
4. Cron job process-dunning (diario):
   a. Lee payment_failures no resueltos
   b. Según días desde fallo:
      - Día 0: first_notice email
      - Día 3: second_notice email
      - Día 7: final_notice email
      - Día 10: suspension_warning email
      - Día 14: Suspende cuenta
      - Día 30: Cancela suscripción
   c. Intenta re-cobrar según retry_schedule
5. Si pago exitoso → webhook resuelve payment_failure
```

## Seguridad

### Autenticación por Capa

| Capa | Método |
|------|--------|
| Frontend → Edge Functions | JWT (Supabase Auth) |
| Edge Functions → Stripe | API Secret Key |
| Stripe → Webhook | Signature Verification |
| Cron Jobs | Service Role Key |

### Validaciones de Seguridad

- **Multi-tenancy**: Todas las queries filtran por `organization_id`
- **Role-based**: Solo owners/admins pueden modificar suscripciones
- **Origin validation**: CORS whitelist para customer-portal
- **Rate limiting**: Por organización Y por usuario
- **Circuit breaker**: Protección contra cascading failures

## Resiliencia

### Circuit Breaker (Stripe API)

```
Estados: CLOSED → OPEN → HALF_OPEN → CLOSED

- CLOSED: Operación normal
- OPEN: Stripe falló 5+ veces en 1 min → rechaza requests
- HALF_OPEN: Después de 30s, permite 1 request de prueba
- Si prueba exitosa → CLOSED
```

### Retry Strategy

| Componente | Estrategia |
|------------|------------|
| Webhook processing | Stripe retry automático (hasta 3 días) |
| Email sending | Exponential backoff (3 intentos) |
| Stripe API calls | Circuit breaker + idempotency keys |
| DB operations | Throw error → Stripe retry |

## Observabilidad

### Logging

- **Correlation IDs**: Cada request tiene ID único para tracing
- **Structured logs**: JSON con contexto (orgId, userId, eventId)
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **PCI compliance**: Sanitización de datos sensibles

### Métricas Clave

- MRR (Monthly Recurring Revenue) por tier
- Churn rate mensual
- Payment failure rate
- Webhook processing time
- Circuit breaker state

### Audit Trail

Todas las acciones de billing se registran en `billing_audit_log`:
- Actor (user, admin, system, stripe_webhook)
- Acción (subscription_created, payment_failed, etc.)
- Valores anteriores y nuevos
- Request ID para correlación

## Configuración de Tiers

```typescript
// stripe-config.ts
TIER_LIMITS = {
  basic:      { maxActiveRaffles: 2,   maxTicketsPerRaffle: 2000,     templates: 3 },
  pro:        { maxActiveRaffles: 7,   maxTicketsPerRaffle: 30000,    templates: 6 },
  premium:    { maxActiveRaffles: 15,  maxTicketsPerRaffle: 100000,   templates: 9 },
  enterprise: { maxActiveRaffles: 999, maxTicketsPerRaffle: 10000000, templates: 9 },
}
```

## Variables de Entorno

### Requeridas
- `STRIPE_SECRET_KEY` - API key de Stripe
- `STRIPE_WEBHOOK_SECRET` - Secreto para verificar webhooks

### Opcionales (para features avanzados)
- `UPSTASH_REDIS_REST_URL` - Para procesamiento async de webhooks
- `UPSTASH_REDIS_REST_TOKEN` - Auth de Upstash
- `SENTRY_DSN` - Para error tracking (si configurado)
