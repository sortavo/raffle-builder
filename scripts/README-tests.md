# Sortavo - Stripe Test Suite

## Overview

Este directorio contiene tests automatizados para validar las funciones de Stripe.

## Tests Disponibles

### 1. Unit Tests (Rápidos, sin datos reales)
```bash
node scripts/test-stripe-functions.mjs
```

Valida:
- ✅ Funciones responden correctamente
- ✅ Autenticación requerida
- ✅ Validación de inputs
- ✅ Seguridad de webhooks (firma requerida)

### 2. Integration Tests (Completos, crea datos de prueba)
```bash
STRIPE_SECRET_KEY=sk_test_xxx \
SUPABASE_SERVICE_ROLE_KEY=xxx \
node scripts/test-stripe-integration.mjs
```

Valida:
- ✅ Trial de 7 días para plan Basic
- ✅ Upgrade con prorrateo
- ✅ Downgrade sin cargo inmediato
- ✅ Límites por tier (raffles, tickets, templates)
- ✅ Cancelación (inmediata y al final del período)
- ✅ Idempotencia de webhooks
- ✅ Audit log de billing

## Variables de Entorno Requeridas

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `STRIPE_SECRET_KEY` | API key de Stripe (TEST) | https://dashboard.stripe.com/test/apikeys |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | https://supabase.com/dashboard/project/xxx/settings/api |

## Ejecución en CI/CD

Agregar a `.github/workflows/test.yml`:

```yaml
- name: Run Stripe Unit Tests
  run: node scripts/test-stripe-functions.mjs

- name: Run Stripe Integration Tests
  env:
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: node scripts/test-stripe-integration.mjs
```

## Tests con Stripe CLI (Webhooks reales)

Para probar webhooks con eventos reales de Stripe:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escuchar webhooks y reenviarlos
stripe listen --forward-to https://xnwqrgumstikdmsxtame.supabase.co/functions/v1/stripe-webhook

# En otra terminal, disparar eventos
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted
```

## Matriz de Cobertura

| Escenario | Unit Test | Integration Test | E2E (Manual) |
|-----------|:---------:|:----------------:|:------------:|
| Función responde | ✅ | - | - |
| Auth requerida | ✅ | - | - |
| Firma webhook | ✅ | - | - |
| Trial 7 días Basic | - | ✅ | ✅ |
| Upgrade prorrateo | - | ✅ | ✅ |
| Downgrade sin cargo | - | ✅ | ✅ |
| Límites por tier | - | ✅ | ✅ |
| Cancelación | - | ✅ | ✅ |
| Idempotencia | - | ✅ | - |
| Audit log | - | ✅ | - |
| UI checkout flow | - | - | ✅ |
| Emails enviados | - | - | ✅ |
