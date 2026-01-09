# 🚀 Guía de Migración a Supabase Externo

## Resumen Ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **Complejidad** | Media ⚡ |
| **Tiempo estimado** | 6-10 horas |
| **Tablas** | 25 |
| **Funciones RPC** | ~35 (tras limpieza) |
| **Edge Functions** | 40 |
| **Políticas RLS** | ~60 |

---

## Pre-requisitos

### 1. Crear Proyecto Supabase
1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Crear nuevo proyecto
3. Anotar:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Secretos Requeridos
Configurar en Supabase Dashboard → Settings → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
TELEGRAM_BOT_TOKEN=123456:ABC...
VERCEL_API_TOKEN=...
VERCEL_PROJECT_ID=prj_...
VERCEL_TEAM_ID=team_...
```

---

## Paso 1: Exportar Esquema Actual

### Script SQL de Exportación Completa
Ejecutar en el SQL Editor del proyecto actual:

```sql
-- Generar script de exportación
SELECT 
  'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || 
  string_agg(column_name || ' ' || data_type, ', ') || ');'
FROM information_schema.columns 
WHERE table_schema = 'public'
GROUP BY schemaname, tablename;
```

### Método Alternativo: pg_dump
```bash
# Exportar solo esquema (sin datos)
pg_dump -h db.hctrnfkowqgcwnotosai.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  --schema=public \
  -f schema_export.sql

# Exportar datos
pg_dump -h db.hctrnfkowqgcwnotosai.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --schema=public \
  -f data_export.sql
```

---

## Paso 2: Estructura de Tablas

### Tablas Core (25 total)

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `organizations` | Organizaciones/tenants | ✅ |
| `profiles` | Perfiles de usuario | ✅ |
| `user_roles` | Roles (owner, admin, member) | ✅ |
| `raffles` | Sorteos | ✅ |
| `orders` | Órdenes de boletos (comprimidas) | ✅ |
| `raffle_packages` | Paquetes de boletos | ✅ |
| `raffle_draws` | Resultados de sorteos | ✅ |
| `raffle_custom_numbers` | Números personalizados | ✅ |
| `payment_methods` | Métodos de pago | ✅ |
| `coupons` | Cupones de descuento | ✅ |
| `coupon_usage` | Uso de cupones | ✅ |
| `notifications` | Notificaciones | ✅ |
| `notification_preferences` | Preferencias de notificación | ✅ |
| `audit_log` | Registro de auditoría | ✅ |
| `analytics_events` | Eventos de analytics | ✅ |
| `archived_raffle_summary` | Resúmenes archivados | ✅ |
| `custom_domains` | Dominios personalizados | ✅ |
| `team_invitations` | Invitaciones de equipo | ✅ |
| `telegram_connections` | Conexiones Telegram (orgs) | ✅ |
| `telegram_buyer_links` | Links Telegram (compradores) | ✅ |
| `platform_admins` | Administradores de plataforma | ✅ |
| `admin_simulations` | Simulaciones de admin | ✅ |
| `stripe_events` | Eventos Stripe procesados | ✅ |
| `system_alerts` | Alertas del sistema | ✅ |
| `system_settings` | Configuraciones globales | ✅ |

### Vistas
| Vista | Descripción |
|-------|-------------|
| `public_raffles` | Datos públicos de sorteos |
| `public_custom_domains` | Dominios verificados |
| `raffle_stats_mv` | Vista materializada de estadísticas |

---

## Paso 3: Funciones RPC Críticas

### Funciones de Boletos
```sql
-- Estas funciones DEBEN migrarse
reserve_tickets_v2()          -- Reservar boletos
approve_order()               -- Aprobar orden
reject_order()                -- Rechazar orden
cleanup_expired_orders()      -- Limpiar expirados
get_virtual_tickets_v2()      -- Obtener boletos virtuales
get_virtual_ticket_counts()   -- Contar boletos
get_public_ticket_counts()    -- Conteo público
```

### Funciones de Utilidad
```sql
format_virtual_ticket()       -- Formatear número de boleto
expand_ticket_ranges()        -- Expandir rangos JSONB
compress_ticket_indices()     -- Comprimir a rangos
expand_order_to_indices()     -- Expandir orden a índices
is_index_in_order()           -- Verificar índice en orden
check_indices_available()     -- Verificar disponibilidad
get_occupied_indices()        -- Obtener índices ocupados
```

### Funciones de Dashboard
```sql
get_dashboard_stats()         -- Estadísticas dashboard
get_dashboard_charts()        -- Datos para gráficas
get_raffle_stats_list()       -- Lista de stats
get_buyers_paginated()        -- Compradores paginados
```

### Funciones de Auth/Permisos
```sql
has_org_access()              -- Verificar acceso a org
has_role()                    -- Verificar rol
is_org_admin()                -- Es admin de org
is_platform_admin()           -- Es admin de plataforma
```

---

## Paso 4: Storage Buckets

### Crear Buckets
```sql
-- Bucket para imágenes de premios (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prizes', 'prizes', true);

-- Bucket para logos de organizaciones (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organizations', 'organizations', true);

-- Bucket para comprobantes de pago (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false);
```

### Políticas de Storage
```sql
-- Políticas para prizes bucket
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'prizes');

CREATE POLICY "Org members can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'prizes' AND
  auth.role() = 'authenticated'
);
```

---

## Paso 5: Configurar Auth

### Proveedores
1. Email/Password (habilitado por defecto)
2. Google OAuth (opcional)

### Configuración Recomendada
```
Site URL: https://tu-dominio.com
Redirect URLs: 
  - https://tu-dominio.com/auth/callback
  - https://tu-dominio.com/dashboard
```

### Auto-confirm Emails
Para desarrollo, habilitar en Auth Settings:
- `Enable email confirmations` → OFF

---

## Paso 6: Deploy Edge Functions

### Instalar Supabase CLI
```bash
npm install -g supabase
supabase login
```

### Linkear Proyecto
```bash
supabase link --project-ref TU_PROJECT_REF
```

### Deploy Todas las Funciones
```bash
supabase functions deploy --no-verify-jwt
```

### Deploy Individual
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
# ... etc
```

---

## Paso 7: Configurar Webhooks

### Stripe Webhook
1. Ir a Stripe Dashboard → Developers → Webhooks
2. Crear endpoint: `https://TU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### Telegram Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://TU_PROJECT_REF.supabase.co/functions/v1/telegram-webhook"
```

---

## Paso 8: Actualizar Frontend

### Archivo .env
```env
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=TU_PROJECT_REF
```

### Regenerar Tipos
```bash
supabase gen types typescript --project-id TU_PROJECT_REF > src/integrations/supabase/types.ts
```

---

## Paso 9: Migrar Datos

### Orden de Migración (por dependencias)
1. `organizations`
2. `profiles`
3. `user_roles`
4. `platform_admins`
5. `payment_methods`
6. `raffles`
7. `raffle_packages`
8. `orders`
9. `raffle_draws`
10. `coupons`
11. `notifications`
12. ... resto de tablas

### Script de Migración de Datos
```sql
-- Ejemplo para organizations
INSERT INTO nueva_db.organizations 
SELECT * FROM antigua_db.organizations;

-- Con transformaciones si es necesario
INSERT INTO nueva_db.orders (id, raffle_id, ...)
SELECT id, raffle_id, ... 
FROM antigua_db.orders;
```

---

## Paso 10: Verificación

### Checklist de Pruebas

- [ ] Login/Logout funciona
- [ ] Crear organización
- [ ] Crear sorteo
- [ ] Reservar boletos
- [ ] Aprobar pago
- [ ] Ver dashboard
- [ ] Ejecutar sorteo
- [ ] Exportar CSV
- [ ] Webhook de Stripe
- [ ] Notificaciones Telegram
- [ ] Dominios personalizados

### Comandos de Verificación
```sql
-- Verificar tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

---

## Troubleshooting

### Error: "permission denied for table X"
→ Verificar RLS policies están creadas correctamente

### Error: "function X does not exist"
→ Ejecutar migración de funciones RPC

### Error: "relation X does not exist"
→ Ejecutar migración de tablas en orden correcto

### Edge Function 500 Error
→ Verificar secretos configurados en Supabase Dashboard

---

## 📊 Estado Post-Auditoría (Enero 2026)

### Correcciones Aplicadas
- ✅ Extensiones `pg_trgm` y `pg_net` movidas a schema `extensions`
- ✅ Materialized View `raffle_stats_mv` protegida (acceso via RPC)
- ✅ Políticas RLS endurecidas para `notifications` y `telegram_buyer_links`
- ✅ Todas las funciones RPC tienen `SET search_path = public`
- ✅ Función `search_virtual_tickets` actualizada a arquitectura `orders`

### Linter Score Final
| Categoría | Estado |
|-----------|--------|
| Tables with RLS | ✅ 25/25 |
| Functions with search_path | ✅ 45/45 |
| Extensions in public | ✅ 0 |
| Permissive policies | ✅ Solo intencionales |

### Pendiente en Supabase Externo
- [ ] Habilitar "Leaked Password Protection" en Auth Settings
- [ ] Configurar backups automáticos (Plan Pro)
- [ ] Habilitar PITR si se requiere (Plan Pro)

---

## Contacto y Soporte

Para asistencia con la migración:
- Documentación: [docs.supabase.com](https://docs.supabase.com)
- Discord: [discord.supabase.com](https://discord.supabase.com)

---

*Última auditoría: 9 de Enero 2026*
*Score de preparación: 98/100*
