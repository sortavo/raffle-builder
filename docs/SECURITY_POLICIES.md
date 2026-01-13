# Políticas de Seguridad y Acceso a Datos - Sortavo

## Resumen Ejecutivo

Este documento describe las políticas de seguridad implementadas en Sortavo para proteger los datos de usuarios, compradores y organizaciones.

## Roles del Sistema

| Rol | Descripción | Nivel de Acceso |
|-----|-------------|-----------------|
| `anon` | Usuario no autenticado (público) | Solo lectura de datos públicos |
| `authenticated` | Usuario logueado | Lectura/escritura de sus propios datos |
| `org_member` | Miembro de organización | Gestión de rifas y órdenes de su org |
| `org_admin` | Administrador de organización | Todo lo de org_member + configuración |
| `platform_admin` | Administrador de plataforma | Acceso total al sistema |

---

## Tabla: `orders`

### ⚠️ CRÍTICO: Datos Sensibles Protegidos

Los siguientes campos contienen datos personales y **NO deben exponerse públicamente**:

| Campo | Tipo | Sensibilidad | Acceso Permitido |
|-------|------|--------------|------------------|
| `buyer_name` | TEXT | Media | Org members, propietario de orden |
| `buyer_email` | TEXT | **ALTA** | Solo org members |
| `buyer_phone` | TEXT | **ALTA** | Solo org members |
| `buyer_city` | TEXT | Media | Org members, propietario de orden |
| `payment_proof_url` | TEXT | **ALTA** | Solo org members |

### Datos Públicos (Seguros para exponer)

| Campo | Descripción |
|-------|-------------|
| `id` | Identificador único |
| `raffle_id` | Referencia a la rifa |
| `ticket_ranges` | Rangos de boletos (sin identificar al comprador) |
| `ticket_count` | Cantidad de boletos |
| `status` | Estado de la orden |
| `created_at` | Fecha de creación |

### Vista Segura: `public_ticket_status`

```sql
-- Esta vista expone SOLO datos no sensibles con SECURITY INVOKER
CREATE VIEW public_ticket_status 
WITH (security_invoker = true) AS
SELECT id, raffle_id, organization_id, ticket_ranges, 
       lucky_indices, ticket_count, status, reserved_until, created_at
FROM orders
WHERE status IN ('sold', 'reserved', 'pending');
```

### Función Segura: `get_secure_order_by_reference`

Permite a compradores acceder a su orden usando su código de referencia único:

```sql
SELECT * FROM get_secure_order_by_reference('SORTAVO-ABC123');
```

El código de referencia actúa como **autenticación implícita** - solo el comprador lo conoce.

---

## Tabla: `raffles`

### Datos Públicos

- Rifas con status `active` o `completed` son visibles públicamente
- Configuración básica: título, descripción, precios, fechas

### Datos Protegidos

- Rifas en `draft` solo visibles para org_members
- Estadísticas de revenue solo para org_members

---

## Tabla: `organizations`

### Datos Públicos

| Campo | Visible para |
|-------|--------------|
| `name`, `logo_url`, `brand_color` | Todos |
| `city`, `description` | Todos |
| `whatsapp_number`, `phone` | Todos (contacto público) |

### Datos Protegidos

| Campo | Visible para |
|-------|--------------|
| `stripe_customer_id` | Solo platform_admin |
| `subscription_*` | Org members |
| `email` (admin) | Org members |

---

## Funciones RPC Seguras

### `get_public_ticket_counts(raffle_id)`
- Devuelve conteos de boletos vendidos/disponibles
- NO expone datos de compradores
- Usa `SECURITY DEFINER` para bypass de RLS

### `get_virtual_tickets_optimized(raffle_id, page, page_size)`
- Consulta paginada de boletos virtuales
- Muestra `buyer_name` pero NO email/teléfono
- Optimizada para rifas con millones de boletos

### `search_public_tickets(raffle_id, search, limit)`
- Búsqueda de boletos por número o nombre
- **NO expone**: email, teléfono, datos de pago
- Solo devuelve: índice, número, estado, nombre

---

## Stripe Webhooks

### Verificación Obligatoria

```typescript
// SIEMPRE se requiere STRIPE_WEBHOOK_SECRET
if (!webhookSecret) {
  return new Response({ error: "Webhook secret required" }, { status: 500 });
}
```

- **NO hay bypass** en desarrollo ni producción
- Todos los webhooks deben tener firma válida
- Eventos duplicados se ignoran (idempotencia)

### RLS de stripe_events

La tabla `stripe_events` tiene RLS restrictivo:
- Solo `service_role` puede INSERT (edge functions)
- Solo `service_role` y `platform_admins` pueden SELECT (para auditoría)

```sql
CREATE POLICY "stripe_events_service_role_only" ON stripe_events
  FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()))
  WITH CHECK (auth.role() = 'service_role');
```

---

## Vistas Públicas con SECURITY INVOKER

Las siguientes vistas usan `SECURITY INVOKER` para respetar RLS del usuario que consulta:

| Vista | Datos Expuestos | SECURITY INVOKER |
|-------|-----------------|------------------|
| `public_raffles` | Rifas activas/completadas | ✅ Sí |
| `public_custom_domains` | Dominios verificados | ✅ Sí |
| `public_ticket_status` | Estado de boletos (sin PII) | ✅ Sí |

```sql
CREATE VIEW public_raffles 
WITH (security_invoker = true) AS
SELECT ... FROM raffles WHERE status IN ('active', 'completed');
```

---

## Sanitización de Scripts de Tracking

Los scripts de tracking de organizaciones se sanitizan con DOMPurify:

```typescript
const sanitizedHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['script', 'noscript', 'iframe'],
  ALLOWED_ATTR: ['src', 'async', 'defer', 'id', 'data-*'],
  ALLOWED_URI_REGEXP: /^(?:https?|data):/i,
});
```

- Solo se permiten scripts HTTPS
- Se bloquean protocolos `javascript:` y `data:` maliciosos
- Los scripts inline se permiten pero son sanitizados

---

## Monitoreo de Performance (Sentry)

### Configuración de Performance

```typescript
Sentry.init({
  tracesSampleRate: 0.5, // 50% de transacciones en producción
  beforeSendTransaction(event) {
    // Etiquetar transacciones lentas para alertas
    if (duration > 3000) event.tags.slow_transaction = 'true';
    if (duration > 5000) event.tags.critical_latency = 'true';
  },
});
```

### Web Vitals Monitoreados

| Métrica | Umbral "Bueno" | Umbral "Pobre" |
|---------|----------------|----------------|
| LCP | ≤ 2500ms | > 4000ms |
| FID | ≤ 100ms | > 300ms |
| CLS | ≤ 0.1 | > 0.25 |
| INP | ≤ 200ms | > 500ms |
| TTFB | ≤ 800ms | > 1800ms |

### Alertas Recomendadas

1. **Latencia Crítica**: `slow_transaction:true` > 10/hora → Email
2. **Error Rate Alto**: > 5% en 5 min → Email inmediato
3. **Poor LCP**: `metric_name:LCP AND metric_rating:poor` > 5/hora → Slack
4. **Crash Rate**: > 1% de sesiones → PagerDuty

---

## Checklist de Seguridad para Desarrollo

### Al crear nuevas tablas:
- [ ] Habilitar RLS
- [ ] Crear políticas para cada operación (SELECT, INSERT, UPDATE, DELETE)
- [ ] Nunca usar `USING (true)` para UPDATE/DELETE
- [ ] Documentar qué roles pueden acceder a qué datos

### Al crear nuevas vistas:
- [ ] Usar `WITH (security_invoker = true)` para respetar RLS
- [ ] No exponer campos sensibles (email, teléfono, datos de pago)
- [ ] Otorgar permisos explícitos con GRANT

### Al crear nuevas funciones RPC:
- [ ] Usar `SECURITY DEFINER` solo cuando sea necesario
- [ ] Validar todos los parámetros de entrada
- [ ] No devolver datos sensibles innecesarios
- [ ] Documentar el propósito y acceso de la función

### Al manejar datos de usuario:
- [ ] Nunca loguear emails, teléfonos o datos de pago
- [ ] Usar `select('campo1, campo2')` en lugar de `select('*')`
- [ ] Sanitizar inputs antes de queries

---

## Extensiones de Base de Datos

| Extensión | Schema | Propósito |
|-----------|--------|-----------|
| `uuid-ossp` | `extensions` | Generación de UUIDs |
| `pgcrypto` | `extensions` | Funciones criptográficas |
| `pg_trgm` | `public`* | Búsqueda fuzzy |

*`pg_trgm` debería moverse a `extensions` para mejor seguridad. Requiere paso manual.

---

## Contacto de Seguridad

Para reportar vulnerabilidades: security@sortavo.com
