# Códigos de Error - Sistema de Suscripciones

## Resumen

Este documento describe los códigos de error y mensajes del sistema de suscripciones Stripe.

## Errores HTTP

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| 400 | Bad Request | Parámetros inválidos, firma webhook inválida |
| 401 | Unauthorized | Token JWT faltante o inválido |
| 403 | Forbidden | Usuario sin permisos (no es owner/admin) |
| 404 | Not Found | Recurso no existe (org, subscription, etc.) |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Error | Error del servidor |
| 503 | Service Unavailable | Circuit breaker abierto, Stripe no disponible |

## Errores de Stripe (Mapeados a Español)

### Errores de Tarjeta

| Código Stripe | Mensaje Usuario | Descripción |
|---------------|-----------------|-------------|
| `card_declined` | "Tu tarjeta fue rechazada" | Banco rechazó la transacción |
| `insufficient_funds` | "Fondos insuficientes" | Sin saldo disponible |
| `expired_card` | "Tu tarjeta ha expirado" | Tarjeta vencida |
| `incorrect_cvc` | "El código de seguridad es incorrecto" | CVV/CVC inválido |
| `processing_error` | "Error procesando el pago" | Error temporal de Stripe |
| `incorrect_number` | "El número de tarjeta es incorrecto" | Número inválido |

### Errores de Autenticación

| Código Stripe | Mensaje Usuario | Descripción |
|---------------|-----------------|-------------|
| `authentication_required` | "Se requiere autenticación adicional" | 3D Secure requerido |
| `payment_intent_authentication_failure` | "La autenticación falló" | 3D Secure falló |

### Errores de Suscripción

| Código Stripe | Mensaje Usuario | Descripción |
|---------------|-----------------|-------------|
| `resource_missing` | "No se encontró tu cuenta de facturación" | Customer no existe |
| `subscription_payment_intent_requires_action` | "Se requiere acción adicional" | Pago pendiente de confirmación |

## Errores Internos del Sistema

### Errores de Webhook

| Código | Mensaje | Acción |
|--------|---------|--------|
| `WEBHOOK_SECRET_REQUIRED` | "Webhook secret not configured" | Configurar `STRIPE_WEBHOOK_SECRET` |
| `INVALID_SIGNATURE` | "Invalid signature" | Verificar webhook secret |
| `DUPLICATE_EVENT` | `{ received: true, duplicate: true }` | Evento ya procesado (normal) |

### Errores de Autenticación

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "No authorization header provided" | Falta header Authorization | Incluir JWT en header |
| "Authentication error: ..." | Token inválido o expirado | Re-autenticar usuario |
| "User not authenticated" | Usuario no encontrado | Verificar sesión |

### Errores de Organización

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "Could not find user's organization" | Usuario sin org | Completar onboarding |
| "No organization found" | Org no existe | Verificar ID |
| "Not authorized to manage subscription" | Rol insuficiente | Requiere owner/admin |

### Errores de Suscripción

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "No active subscription found" | Sin suscripción | Crear checkout primero |
| "Subscription is not active" | Status != active/trialing | Resolver pago fallido |
| "No Stripe customer found" | Customer no existe | Usuario sin historial de pagos |

### Errores de Rate Limit

| Respuesta | Causa | Headers |
|-----------|-------|---------|
| `{ error: "Rate limit exceeded", retryAfter: N }` | Demasiadas requests | `Retry-After: N` |
| `{ error: "...", blockedBy: "org" }` | Límite de organización | - |
| `{ error: "...", blockedBy: "user" }` | Límite de usuario | - |

### Errores de Circuit Breaker

| Respuesta | Causa | Recuperación |
|-----------|-------|--------------|
| `{ error: "El portal de pagos está temporalmente no disponible", circuitOpen: true }` | Stripe API falló múltiples veces | Esperar ~30 segundos |

## Códigos de Base de Datos

| Código PostgreSQL | Significado | Contexto |
|-------------------|-------------|----------|
| `23505` | Unique violation | Evento duplicado (normal en webhooks) |
| `23503` | FK violation | Referencia a registro inexistente |
| `42501` | RLS violation | Sin permisos para la operación |

## Manejo de Errores en Frontend

```typescript
// Ejemplo de manejo de errores
const { data, error } = await supabase.functions.invoke("upgrade-subscription", {
  body: { priceId }
});

if (error) {
  // Error de red o función
  toast.error("Error de conexión. Intenta de nuevo.");
  return;
}

if (data?.error) {
  // Error de negocio (ya traducido al español)
  toast.error(data.error);
  return;
}

if (data?.circuitOpen) {
  // Circuit breaker abierto
  toast.error("Servicio temporalmente no disponible. Intenta en unos minutos.");
  return;
}

// Éxito
toast.success("Suscripción actualizada");
```

## Logging de Errores

Todos los errores se registran con:
- **Correlation ID**: Para tracing entre servicios
- **Timestamp**: Hora exacta del error
- **Context**: userId, orgId, requestId
- **Stack trace**: Solo en logs del servidor (nunca al cliente)

Los errores CRITICAL se envían automáticamente a Sentry (si configurado).
