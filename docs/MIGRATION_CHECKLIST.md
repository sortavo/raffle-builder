# ✅ Checklist de Migración a Supabase Externo

> **Tiempo estimado**: 6-10 horas  
> **Complejidad**: Media  
> **Última actualización**: 9 de Enero 2026

---

## 📋 Pre-Migración (En este proyecto)

### Verificación de Estado
- [x] 25 tablas con RLS habilitado
- [x] ~52 funciones RPC con `search_path` seguro
- [x] 3 storage buckets configurados
- [x] 40 Edge Functions documentadas
- [x] 7 secretos configurados
- [x] Vistas con `security_invoker = true`
- [x] `raffle_stats_mv` protegida (solo `service_role`)

---

## 🚀 Pasos de Migración

### Paso 1: Crear Proyecto Supabase Pro
- [ ] Ir a [supabase.com/dashboard](https://supabase.com/dashboard)
- [ ] Click "New Project"
- [ ] Seleccionar región (recomendado: `us-east-1` o cercana a tus usuarios)
- [ ] Guardar credenciales:
  - [ ] `SUPABASE_URL`: `https://[PROJECT_REF].supabase.co`
  - [ ] `SUPABASE_ANON_KEY`: `eyJ...`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`: `eyJ...` (¡Mantener seguro!)
  - [ ] `DATABASE_URL`: Para `pg_dump`

### Paso 2: Ejecutar Schema SQL
- [ ] Ir a SQL Editor en Supabase Dashboard
- [ ] Copiar contenido de `docs/MIGRATION_SQL_SCHEMA.md`
- [ ] Ejecutar en orden:
  1. [ ] Parte 1: Extensiones
  2. [ ] Parte 2: Tipos Enumerados
  3. [ ] Parte 3: Tablas Core
  4. [ ] Parte 4: Tablas Adicionales
  5. [ ] Parte 5: Vistas (con `security_invoker`)
  6. [ ] Parte 6: Habilitar RLS

### Paso 3: Crear Funciones RPC
- [ ] Ejecutar funciones helper primero:
  ```sql
  -- Copiar de proyecto actual via SQL export
  -- O usar pg_dump --schema-only
  ```
- [ ] Funciones críticas:
  - [ ] `has_org_access()`
  - [ ] `has_role()`
  - [ ] `is_org_admin()`
  - [ ] `is_platform_admin()`
  - [ ] `format_virtual_ticket()`
  - [ ] `expand_ticket_ranges()`
  - [ ] `compress_ticket_indices()`

### Paso 4: Crear Storage Buckets
- [ ] Ejecutar SQL de buckets (ver `MIGRATION_GUIDE.md` → Paso 4)
- [ ] Verificar buckets creados:
  - [ ] `prize-images` (público)
  - [ ] `organization-assets` (público)
  - [ ] `payment-proofs` (privado)

### Paso 5: Configurar RLS Policies
- [ ] Ejecutar políticas de tablas (exportar del proyecto actual)
- [ ] Ejecutar políticas de storage (ver `MIGRATION_GUIDE.md`)

### Paso 6: Configurar Secretos Edge Functions
Dashboard → Settings → Edge Functions → Secrets

| Secreto | Valor | Status |
|---------|-------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | ⬜ |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | ⬜ |
| `RESEND_API_KEY` | `re_...` | ⬜ |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC...` | ⬜ |
| `VERCEL_API_TOKEN` | `...` | ⬜ |
| `VERCEL_PROJECT_ID` | `prj_...` | ⬜ |
| `VERCEL_TEAM_ID` | `team_...` (opcional) | ⬜ |

### Paso 7: Deploy Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkear proyecto
supabase link --project-ref [TU_PROJECT_REF]

# Deploy todas las funciones
cd supabase/functions
supabase functions deploy --no-verify-jwt
```

### Paso 8: Configurar Auth
Dashboard → Authentication → Providers

- [ ] Email/Password habilitado
- [ ] Site URL: `https://tu-dominio.com`
- [ ] Redirect URLs:
  - [ ] `https://tu-dominio.com/auth/callback`
  - [ ] `https://tu-dominio.com/dashboard`

Dashboard → Authentication → Settings → Password

- [ ] ⚠️ **CRÍTICO**: Habilitar "Leaked Password Protection"

### Paso 9: Configurar Webhooks

#### Stripe Webhook
1. Ir a [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
4. Eventos:
   - [ ] `checkout.session.completed`
   - [ ] `customer.subscription.created`
   - [ ] `customer.subscription.updated`
   - [ ] `customer.subscription.deleted`
   - [ ] `invoice.paid`
   - [ ] `invoice.payment_failed`
5. Copiar `Signing secret` → Actualizar `STRIPE_WEBHOOK_SECRET`

#### Telegram Webhook
```bash
curl -X POST "https://api.telegram.org/bot[BOT_TOKEN]/setWebhook" \
  -d "url=https://[PROJECT_REF].supabase.co/functions/v1/telegram-webhook"
```

### Paso 10: Migrar Datos

#### Exportar datos del proyecto actual
```bash
# Exportar datos (requiere DATABASE_URL del proyecto Cloud actual)
pg_dump -h db.hctrnfkowqgcwnotosai.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --schema=public \
  -f data_export.sql
```

#### Importar en proyecto nuevo
```bash
psql -h db.[NEW_PROJECT_REF].supabase.co \
  -U postgres \
  -d postgres \
  -f data_export.sql
```

#### Orden de importación (por dependencias)
1. `organizations`
2. `profiles`
3. `user_roles`
4. `platform_admins`
5. `payment_methods`
6. `raffles`
7. `raffle_packages`
8. `raffle_custom_numbers`
9. `orders`
10. `raffle_draws`
11. `coupons` → `coupon_usage`
12. `notifications` → `notification_preferences`
13. `audit_log`
14. `analytics_events`
15. `custom_domains`
16. `team_invitations`
17. `telegram_connections` → `telegram_buyer_links`
18. `admin_simulations`
19. `stripe_events`
20. `system_alerts` → `system_settings`
21. `archived_raffle_summary`

### Paso 11: Actualizar Frontend

#### Archivo `.env.production`
```env
VITE_SUPABASE_URL=https://[NEW_PROJECT_REF].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[NEW_ANON_KEY]
VITE_SUPABASE_PROJECT_ID=[NEW_PROJECT_REF]
```

#### Regenerar tipos TypeScript
```bash
supabase gen types typescript --project-id [NEW_PROJECT_REF] > src/integrations/supabase/types.ts
```

### Paso 12: Refrescar Vista Materializada
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.raffle_stats_mv;
```

---

## ✅ Verificación Post-Migración

### Tests Funcionales
- [ ] Login/Logout funciona
- [ ] Crear cuenta nueva
- [ ] Crear organización
- [ ] Crear sorteo con paquetes
- [ ] Reservar boletos como comprador
- [ ] Ver página pública del sorteo
- [ ] Subir comprobante de pago
- [ ] Aprobar pago (admin)
- [ ] Ver dashboard con stats
- [ ] Ejecutar sorteo manual
- [ ] Exportar CSV de compradores
- [ ] Recibir notificación Telegram
- [ ] Checkout con Stripe

### Tests de Seguridad
```sql
-- Verificar RLS activo en todas las tablas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar que raffle_stats_mv no es accesible directamente
-- (Debe dar error para anon/authenticated)
SET ROLE anon;
SELECT * FROM raffle_stats_mv LIMIT 1;
-- Expected: permission denied
```

### Verificar Edge Functions
```bash
# Health check
curl https://[PROJECT_REF].supabase.co/functions/v1/health-check

# Subscription status
curl https://[PROJECT_REF].supabase.co/functions/v1/subscription-status \
  -H "Authorization: Bearer [USER_JWT]"
```

---

## 🔧 Troubleshooting

### "permission denied for table X"
→ Ejecutar políticas RLS faltantes

### "function X does not exist"
→ Ejecutar migración de funciones RPC

### "relation X does not exist"
→ Ejecutar tablas en orden correcto (dependencias)

### Edge Function 500
→ Verificar secretos en Dashboard → Settings → Edge Functions

### Stripe webhook 401
→ Actualizar `STRIPE_WEBHOOK_SECRET` con el signing secret correcto

### Telegram no recibe mensajes
→ Verificar webhook configurado:
```bash
curl "https://api.telegram.org/bot[TOKEN]/getWebhookInfo"
```

---

## 📊 Métricas de Éxito

| Métrica | Esperado | Actual |
|---------|----------|--------|
| Tablas migradas | 25 | ⬜ |
| Funciones RPC | ~52 | ⬜ |
| Storage buckets | 3 | ⬜ |
| Edge Functions | 40 | ⬜ |
| Tests pasando | 100% | ⬜ |

---

## 🎉 Post-Migración

1. **Actualizar DNS** (si aplica dominios personalizados)
2. **Redirigir tráfico** al nuevo proyecto
3. **Monitorear logs** por 24-48 horas
4. **Configurar alertas** en Supabase Dashboard
5. **Documentar** cualquier diferencia encontrada

---

*Checklist creado: 9 de Enero 2026*
