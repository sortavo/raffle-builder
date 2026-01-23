# Changelog - 2026-01-22

## Resumen
Sesión de limpieza de código muerto que causó interrupciones temporales en producción. Todos los problemas fueron resueltos.

---

## Cambios Críticos

### Funciones SQL Eliminadas (NO RESTAURAR)
Las siguientes funciones fueron eliminadas porque ya no se usan:

```
- get_virtual_tickets_optimized
- get_virtual_tickets_v2
- reserve_virtual_tickets
- reserve_virtual_tickets_resilient
- reserve_tickets_v (versión anterior)
- atomic_reserve_tickets_v (versión anterior)
- check_tickets_available_v
- confirm_order_sale_v
- cancel_order_and_release_v
- generate_ticket_batch
- get_available_blocks
- initialize_ticket_blocks
- sync_raffle_blocks
- sync_blocks_incremental
- get_ticket_counts_from_blocks
- search_virtual_tickets
- get_public_tickets (versión anterior)
- get_raffle_stats_fast
- refresh_raffle_stats
- cleanup_expired_orders
- upsert_customer_from_order
- update_customer_on_order_sold
```

### Tablas Eliminadas (NO RESTAURAR)
```
- customers (datos ahora se derivan de orders)
- ticket_block_status
- ticket_reservation_status_old
- admin_simulations
- archived_raffle_summary
- billing_audit_log
- payment_failures
- stripe_events
- subscription_events
- refund_requests
- refund_audit_log
- dunning_emails
- coupon_usage
- rate_limit_entries
- system_alerts
- system_settings
```

---

## Funciones Activas (USAR ESTAS)

| Función | Descripción |
|---------|-------------|
| `atomic_reserve_tickets` | Reserva atómica de boletos con advisory lock |
| `reserve_tickets_v2` | Versión alternativa de reserva |
| `compress_ticket_indices` | Comprime array de índices a rangos JSONB |
| `get_secure_order_by_reference` | Obtiene orden por código de referencia |
| `confirm_order_sale_v2` | Confirma venta de orden |
| `generate_reference_code` | Genera código de 8 caracteres alfanuméricos |

---

## Cambios en Formato de Datos

### Códigos de Referencia
- **Antes:** `ORD-DA74FAE8` (12 caracteres con prefijo)
- **Ahora:** `DA74FAE8` (8 caracteres sin prefijo)

Los códigos existentes con prefijo `ORD-` siguen siendo válidos.

---

## Bugs Corregidos

### 1. Notificaciones de Telegram para aprobación de pagos
- **Problema:** `payment_proof_uploaded` no enviaba notificaciones
- **Causa:** Bug en mapeo de preferencias generaba `notify_payment_proof_proof`
- **Solución:** Mapeo explícito en `telegram-notify/index.ts`

### 2. Triggers huérfanos
- **Problema:** Triggers referenciaban tablas eliminadas
- **Solución:** Eliminados en migraciones `080000` y `094000`

### 3. Bucket de comprobantes de pago
- **Problema:** Bucket `payment-proofs` fue eliminado accidentalmente
- **Solución:** Recreado en migración `095000`

---

## Verificación Post-Deploy

Ejecutar estas pruebas antes de dar por terminado:

```bash
# 1. Probar reserva de boletos
curl -X POST ".../rpc/atomic_reserve_tickets" -d '{...}'

# 2. Verificar código sin prefijo
# Debe devolver: "reference_code": "XXXXXXXX" (8 chars)

# 3. Probar notificación de Telegram
curl -X POST ".../functions/v1/telegram-notify" \
  -d '{"type": "payment_proof_uploaded", ...}'
# Debe devolver: {"success": true, "sent": true}
```

---

## Contacto
Para dudas sobre estos cambios, revisar el historial de commits del 2026-01-22.
