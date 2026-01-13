# 📚 Referencia de Edge Functions

## Resumen

| Categoría | Cantidad | Descripción |
|-----------|----------|-------------|
| **Stripe/Pagos** | 8 | Checkout, webhooks, suscripciones |
| **Dominios** | 8 | Verificación, DNS, Vercel |
| **Usuarios** | 4 | Eliminación, demo accounts |
| **Notificaciones** | 5 | Email, Telegram, reminders |
| **Sorteos** | 3 | Draw, exportación |
| **Utilidades** | 5 | AI, health, misc |
| **Cron Jobs** | 7 | Tareas programadas |

---

## 🔑 Secretos Requeridos

| Secreto | Funciones que lo usan | Obligatorio |
|---------|----------------------|-------------|
| `STRIPE_SECRET_KEY` | create-checkout, stripe-webhook, cancel-subscription, etc. | ✅ |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | ✅ |
| `RESEND_API_KEY` | send-email, send-team-invite | ✅ |
| `TELEGRAM_BOT_TOKEN` | telegram-notify, telegram-webhook | ✅ |
| `VERCEL_API_TOKEN` | add-vercel-domain, remove-vercel-domain, etc. | ✅ |
| `VERCEL_PROJECT_ID` | add-vercel-domain, list-vercel-domains | ✅ |
| `VERCEL_TEAM_ID` | add-vercel-domain, list-vercel-domains | Opcional |

---

## Stripe / Pagos

### `create-checkout`
**Propósito:** Crear sesión de Stripe Checkout para suscripciones

**Método:** POST

**Headers:** Authorization (JWT)

**Body:**
```json
{
  "priceId": "price_xxx",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Secretos:** `STRIPE_SECRET_KEY`

---

### `stripe-webhook`
**Propósito:** Procesar eventos de Stripe (pagos, suscripciones)

**Método:** POST

**Headers:** `stripe-signature`

**Eventos manejados:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

**Secretos:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

### `customer-portal`
**Propósito:** Generar URL del portal de cliente Stripe

**Método:** POST

**Headers:** Authorization (JWT)

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Secretos:** `STRIPE_SECRET_KEY`

---

### `cancel-subscription`
**Propósito:** Cancelar suscripción al final del período

**Método:** POST

**Headers:** Authorization (JWT)

**Secretos:** `STRIPE_SECRET_KEY`

---

### `reactivate-subscription`
**Propósito:** Reactivar suscripción cancelada

**Método:** POST

**Headers:** Authorization (JWT)

**Secretos:** `STRIPE_SECRET_KEY`

---

### `upgrade-subscription`
**Propósito:** Cambiar plan de suscripción

**Método:** POST

**Body:**
```json
{
  "newPriceId": "price_xxx"
}
```

**Secretos:** `STRIPE_SECRET_KEY`

---

### `preview-upgrade`
**Propósito:** Calcular costo prorrateado de upgrade

**Método:** POST

**Body:**
```json
{
  "newPriceId": "price_xxx"
}
```

**Secretos:** `STRIPE_SECRET_KEY`

---

### `list-invoices`
**Propósito:** Listar facturas del cliente

**Método:** GET

**Headers:** Authorization (JWT)

**Secretos:** `STRIPE_SECRET_KEY`

---

## Dominios Personalizados

### `add-vercel-domain`
**Propósito:** Agregar dominio a Vercel

**Método:** POST

**Body:**
```json
{
  "domain": "custom.example.com"
}
```

**Secretos:** `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`

---

### `remove-vercel-domain`
**Propósito:** Eliminar dominio de Vercel

**Método:** POST

**Body:**
```json
{
  "domain": "custom.example.com"
}
```

**Secretos:** `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`

---

### `list-vercel-domains`
**Propósito:** Listar dominios configurados en Vercel

**Método:** GET

**Secretos:** `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`

---

### `verify-dns`
**Propósito:** Verificar configuración DNS de dominio

**Método:** POST

**Body:**
```json
{
  "domain": "custom.example.com"
}
```

---

### `check-domains`
**Propósito:** Verificar estado de múltiples dominios

**Método:** POST

---

### `sync-domains`
**Propósito:** Sincronizar dominios entre DB y Vercel

**Método:** POST (Cron)

**Secretos:** `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`

---

### `monitor-domains`
**Propósito:** Monitorear SSL y disponibilidad de dominios

**Método:** POST (Cron)

---

### `diagnose-vercel-access`
**Propósito:** Diagnosticar problemas de acceso a Vercel API

**Método:** GET

**Secretos:** `VERCEL_API_TOKEN`

---

## Usuarios y Organizaciones

### `delete-user`
**Propósito:** Eliminar usuario y sus datos

**Método:** POST

**Headers:** Authorization (JWT, Platform Admin)

**Body:**
```json
{
  "userId": "uuid"
}
```

---

### `delete-organization`
**Propósito:** Eliminar organización completa

**Método:** POST

**Headers:** Authorization (JWT)

---

### `delete-organization-users`
**Propósito:** Eliminar usuarios de una organización

**Método:** POST

**Headers:** Authorization (JWT, Platform Admin)

---

### `create-demo-account`
**Propósito:** Crear cuenta demo con datos de ejemplo

**Método:** POST

**Body:**
```json
{
  "email": "demo@example.com"
}
```

---

## Notificaciones

### `send-email`
**Propósito:** Enviar emails transaccionales

**Método:** POST

**Body:**
```json
{
  "to": "user@example.com",
  "subject": "...",
  "template": "payment_approved",
  "data": {}
}
```

**Secretos:** `RESEND_API_KEY`

---

### `send-team-invite`
**Propósito:** Enviar invitación de equipo por email

**Método:** POST

**Body:**
```json
{
  "email": "newmember@example.com",
  "organizationId": "uuid",
  "role": "member"
}
```

**Secretos:** `RESEND_API_KEY`

---

### `telegram-notify`
**Propósito:** Enviar notificación por Telegram

**Método:** POST

**Body:**
```json
{
  "chatId": "123456789",
  "message": "..."
}
```

**Secretos:** `TELEGRAM_BOT_TOKEN`

---

### `telegram-webhook`
**Propósito:** Recibir mensajes de Telegram bot

**Método:** POST

**Secretos:** `TELEGRAM_BOT_TOKEN`

---

### `notify-pending-approvals`
**Propósito:** Notificar sobre aprobaciones pendientes (Cron)

**Método:** POST

**Secretos:** `TELEGRAM_BOT_TOKEN`

---

## Sorteos y Boletos

### `draw-random-winner`
**Propósito:** Seleccionar ganador aleatorio

**Método:** POST

**Body:**
```json
{
  "raffleId": "uuid",
  "prizeId": "prize_1"
}
```

---

### `select-random-tickets`
**Propósito:** Seleccionar boletos aleatorios para pre-sorteo

**Método:** POST

**Body:**
```json
{
  "raffleId": "uuid",
  "count": 5
}
```

---

### `export-tickets-csv`
**Propósito:** Exportar boletos a CSV

**Método:** POST

**Body:**
```json
{
  "raffle_id": "uuid",
  "status_filter": ["sold", "reserved"]
}
```

---

### `export-buyers-csv`
**Propósito:** Exportar compradores a CSV

**Método:** POST

**Body:**
```json
{
  "raffle_id": "uuid"
}
```

---

## Utilidades

### `health-check`
**Propósito:** Verificar salud del sistema

**Método:** GET

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-08T...",
  "database": "connected"
}
```

---

### `generate-description`
**Propósito:** Generar descripción con AI

**Método:** POST

**Body:**
```json
{
  "prizeName": "iPhone 15",
  "context": "..."
}
```

---

### `generate-logo`
**Propósito:** Generar logo con AI

**Método:** POST

**Body:**
```json
{
  "organizationName": "Mi Organización",
  "style": "modern"
}
```

---

### `get-payment-method`
**Propósito:** Obtener método de pago por ID

**Método:** GET

**Query:** `?id=uuid`

---

### `submit-payment-proof`
**Propósito:** Subir comprobante de pago

**Método:** POST

**Body:**
```json
{
  "orderId": "uuid",
  "proofUrl": "https://...",
  "paymentMethod": "transfer"
}
```

---

## Cron Jobs (Tareas Programadas)

| Función | Frecuencia | Propósito |
|---------|------------|-----------|
| `auto-draw` | Diario 00:00 | Ejecutar sorteos automáticos |
| `cleanup-notifications` | Diario 03:00 | Limpiar notificaciones antiguas |
| `cleanup-expired-orders` | Cada hora | Limpiar reservaciones expiradas y órdenes abandonadas |
| `send-payment-reminders` | Diario 10:00 | Recordar pagos pendientes |
| `notify-pending-approvals` | Cada 4 horas | Alertar sobre aprobaciones |
| `check-subscription` | Diario 01:00 | Verificar suscripciones |
| `sync-domains` | Cada 6 horas | Sincronizar dominios |
| `monitor-domains` | Cada hora | Monitorear SSL |
| `archive-old-raffles` | Semanal | Archivar rifas completadas antiguas |

---

### `cleanup-expired-orders`
**Propósito:** Limpiar reservaciones expiradas y órdenes abandonadas

**Método:** POST (Cron)

**Frecuencia recomendada:** Cada hora

**Acciones:**
- Cancela reservaciones donde `reserved_until < now()`
- Elimina órdenes canceladas >7 días
- Elimina órdenes pending sin pago >30 días

**Response:**
```json
{
  "success": true,
  "expiredReservations": 5,
  "oldCancelledOrders": 12,
  "oldPendingOrders": 3,
  "totalCleaned": 20,
  "executionTimeMs": 145
}
```

---

## Archivos Compartidos (_shared/)

### `cors.ts`
Configuración CORS centralizada para todas las funciones.

```typescript
import { getCorsHeaders, handleCorsPrelight } from '../_shared/cors.ts';
```

### `stripe-config.ts`
Configuración de Stripe (tiers, precios, límites).

```typescript
import { PRODUCT_TO_TIER, TIER_LIMITS } from '../_shared/stripe-config.ts';
```

### `admin-auth.ts`
Autenticación para funciones administrativas.

```typescript
import { verifyPlatformAdmin, isCronRequest } from '../_shared/admin-auth.ts';
```

### `vercel-config.ts`
Configuración y validación de dominios Vercel.

```typescript
import { validateDomain, DOMAIN_LIMITS } from '../_shared/vercel-config.ts';
```

### `rate-limiter.ts`
Rate limiting en memoria para proteger endpoints.

```typescript
import { checkRateLimit, RATE_LIMITS } from '../_shared/rate-limiter.ts';
```

---

## Despliegue

### Deploy Individual
```bash
supabase functions deploy nombre-funcion
```

### Deploy Todas
```bash
supabase functions deploy
```

### Ver Logs
```bash
supabase functions logs nombre-funcion
```

### Secretos
```bash
supabase secrets set NOMBRE_SECRETO=valor
supabase secrets list
```
