# 🗄️ Script de Migración SQL Completo

Este script exporta toda la estructura de la base de datos para migración a un nuevo proyecto Supabase.

## Instrucciones

1. Copiar el contenido relevante
2. Ejecutar en el SQL Editor del nuevo proyecto Supabase
3. Seguir el orden indicado (extensiones → tipos → tablas → funciones → políticas)

---

## Parte 1: Extensiones

```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Parte 2: Tipos Enumerados

```sql
-- Crear tipos enumerados (valores exactos del schema actual)
CREATE TYPE public.subscription_tier AS ENUM ('basic', 'pro', 'premium', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trial');
CREATE TYPE public.subscription_period AS ENUM ('monthly', 'annual');
CREATE TYPE public.raffle_status AS ENUM ('draft', 'active', 'paused', 'completed', 'canceled');
CREATE TYPE public.draw_method AS ENUM ('lottery_nacional', 'manual', 'random_org');
CREATE TYPE public.ticket_number_format AS ENUM ('sequential', 'prefixed', 'random');
CREATE TYPE public.ticket_status AS ENUM ('available', 'reserved', 'sold', 'canceled');
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');
```

---

## Parte 3: Tablas Core

### organizations
```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#2563EB',
  slug TEXT UNIQUE,
  description TEXT,
  
  -- Subscription
  subscription_tier subscription_tier DEFAULT 'basic',
  subscription_status subscription_status DEFAULT 'trial',
  subscription_period subscription_period DEFAULT 'monthly',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Limits
  max_active_raffles INTEGER DEFAULT 2,
  max_tickets_per_raffle INTEGER DEFAULT 2000,
  templates_available INTEGER DEFAULT 1,
  
  -- Location
  country_code TEXT DEFAULT 'MX',
  currency_code TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'America/Mexico_City',
  city TEXT,
  address TEXT,
  
  -- Social
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  whatsapp_number TEXT,
  whatsapp_numbers TEXT[] DEFAULT '{}',
  emails TEXT[] DEFAULT '{}',
  phones TEXT[] DEFAULT '{}',
  
  -- Branding
  cover_image_url TEXT,
  cover_media JSONB DEFAULT '[]',
  favicon_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  custom_css TEXT,
  white_label_enabled BOOLEAN DEFAULT false,
  powered_by_visible BOOLEAN DEFAULT true,
  
  -- Tracking
  tracking_enabled BOOLEAN DEFAULT false,
  tracking_gtm_id TEXT,
  tracking_ga4_id TEXT,
  tracking_meta_pixel_id TEXT,
  tracking_tiktok_pixel_id TEXT,
  tracking_custom_scripts TEXT,
  
  -- Meta
  onboarding_completed BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  suspended BOOLEAN DEFAULT false,
  years_experience INTEGER,
  total_raffles_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);
```

### profiles
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  invited_by UUID,
  accepted_invite_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
```

### user_roles
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
```

### raffles
```sql
CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID,
  
  -- Basic Info
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  status raffle_status DEFAULT 'draft',
  
  -- Prize
  prize_name TEXT NOT NULL,
  prize_value NUMERIC,
  prize_images TEXT[] DEFAULT '{}',
  prize_video_url TEXT,
  prize_terms TEXT,
  prize_display_mode TEXT DEFAULT 'hierarchical',
  prizes JSONB DEFAULT '[]',
  
  -- Tickets
  total_tickets INTEGER NOT NULL,
  ticket_price NUMERIC NOT NULL,
  currency_code TEXT DEFAULT 'MXN',
  ticket_number_format ticket_number_format DEFAULT 'sequential',
  numbering_config JSONB DEFAULT '{"mode": "sequential", "start_number": 1, "pad_enabled": true, "pad_width": null, "pad_char": "0"}',
  
  -- Limits
  max_tickets_per_person INTEGER DEFAULT 0,
  max_tickets_per_purchase INTEGER DEFAULT 0,
  min_tickets_per_purchase INTEGER DEFAULT 1,
  reservation_time_minutes INTEGER DEFAULT 15,
  
  -- Draw
  draw_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  draw_method draw_method DEFAULT 'manual',
  lottery_digits INTEGER,
  lottery_draw_number TEXT,
  close_sale_hours_before INTEGER DEFAULT 0,
  livestream_url TEXT,
  auto_publish_result BOOLEAN DEFAULT false,
  
  -- Winner
  winner_announced BOOLEAN DEFAULT false,
  winner_ticket_number TEXT,
  winner_data JSONB,
  
  -- Features
  allow_individual_sale BOOLEAN DEFAULT true,
  lucky_numbers_enabled BOOLEAN DEFAULT false,
  lucky_numbers_config JSONB,
  
  -- Design
  template_id TEXT DEFAULT 'modern',
  customization JSONB DEFAULT '{}',
  
  -- Search
  search_vector tsvector,
  
  -- Archive
  archived_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_raffles_org ON public.raffles(organization_id);
CREATE INDEX idx_raffles_status ON public.raffles(status);
CREATE INDEX idx_raffles_slug ON public.raffles(slug);
CREATE INDEX idx_raffles_search ON public.raffles USING gin(search_vector);
```

### orders
```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Buyer Info
  buyer_id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  
  -- Tickets (Compressed Storage)
  ticket_ranges JSONB NOT NULL DEFAULT '[]',  -- [{s: 0, e: 99}, {s: 150, e: 199}]
  lucky_indices INTEGER[] DEFAULT '{}',       -- [5, 23, 77] for lucky numbers
  ticket_count INTEGER NOT NULL,
  
  -- Payment
  payment_method TEXT,
  payment_proof_url TEXT,
  order_total NUMERIC,
  reference_code TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'reserved',  -- reserved, pending, sold, canceled
  reserved_at TIMESTAMPTZ DEFAULT now(),
  reserved_until TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  canceled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_raffle ON public.orders(raffle_id);
CREATE INDEX idx_orders_org ON public.orders(organization_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_reference ON public.orders(reference_code);
CREATE INDEX idx_orders_buyer_email ON public.orders(buyer_email);
CREATE INDEX idx_orders_reserved_until ON public.orders(reserved_until) WHERE status = 'reserved';
```

### raffle_packages
```sql
CREATE TABLE public.raffle_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  label TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_raffle_packages_raffle ON public.raffle_packages(raffle_id);
```

### raffle_draws
```sql
CREATE TABLE public.raffle_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  
  -- Prize
  prize_id TEXT NOT NULL,
  prize_name TEXT NOT NULL,
  prize_value NUMERIC,
  
  -- Winner
  ticket_id UUID,
  ticket_number TEXT NOT NULL,
  winner_name TEXT,
  winner_email TEXT,
  winner_phone TEXT,
  winner_city TEXT,
  
  -- Draw Info
  draw_method TEXT NOT NULL,
  draw_type TEXT NOT NULL DEFAULT 'pre_draw',
  draw_metadata JSONB DEFAULT '{}',
  scheduled_date TIMESTAMPTZ,
  drawn_at TIMESTAMPTZ DEFAULT now(),
  
  -- Announcement
  announced BOOLEAN DEFAULT false,
  announced_at TIMESTAMPTZ,
  winner_notified BOOLEAN DEFAULT false,
  winner_notified_at TIMESTAMPTZ,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_raffle_draws_raffle ON public.raffle_draws(raffle_id);
```

### payment_methods
```sql
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Bank Transfer
  bank_name TEXT,
  bank_select_value TEXT,
  account_number TEXT,
  card_number TEXT,
  clabe TEXT,
  account_holder TEXT,
  
  -- Digital
  paypal_email TEXT,
  paypal_link TEXT,
  payment_link TEXT,
  
  -- Custom
  custom_label TEXT,
  custom_identifier TEXT,
  custom_identifier_label TEXT,
  custom_qr_url TEXT,
  instructions TEXT,
  
  -- Location/Schedule
  country VARCHAR(2) DEFAULT 'MX',
  currency VARCHAR(3) DEFAULT 'MXN',
  location TEXT,
  schedule TEXT,
  
  -- Grouping
  group_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_methods_org ON public.payment_methods(organization_id);
```

---

## Parte 4: Tablas Adicionales

```sql
-- coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE SET NULL,
  
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  min_purchase NUMERIC,
  
  active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- coupon_usage
CREATE TABLE public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  ticket_id UUID,
  user_email TEXT,
  discount_applied NUMERIC NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- notification_preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  ticket_sold BOOLEAN DEFAULT true,
  payment_pending BOOLEAN DEFAULT true,
  payment_approved BOOLEAN DEFAULT true,
  raffle_completed BOOLEAN DEFAULT true,
  raffle_ending_soon BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- audit_log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  organization_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  changes JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- analytics_events
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  raffle_id UUID REFERENCES public.raffles(id),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- custom_domains
CREATE TABLE public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  is_primary BOOLEAN DEFAULT false,
  verification_method TEXT DEFAULT 'dns_txt',
  verification_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  ssl_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- team_invitations
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- telegram_connections
CREATE TABLE public.telegram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  link_code TEXT,
  link_code_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  notify_ticket_reserved BOOLEAN DEFAULT true,
  notify_payment_proof BOOLEAN DEFAULT true,
  notify_payment_approved BOOLEAN DEFAULT false,
  notify_payment_rejected BOOLEAN DEFAULT false,
  notify_reservation_expired BOOLEAN DEFAULT false,
  notify_raffle_ending BOOLEAN DEFAULT true,
  notify_winner_selected BOOLEAN DEFAULT true,
  notify_daily_summary BOOLEAN DEFAULT false,
  daily_summary_hour INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- telegram_buyer_links
CREATE TABLE public.telegram_buyer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  verified_at TIMESTAMPTZ,
  notify_reservation BOOLEAN DEFAULT true,
  notify_payment_approved BOOLEAN DEFAULT true,
  notify_payment_rejected BOOLEAN DEFAULT true,
  notify_payment_reminder BOOLEAN DEFAULT true,
  notify_draw_reminder BOOLEAN DEFAULT true,
  notify_winner BOOLEAN DEFAULT true,
  notify_announcements BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- platform_admins
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- admin_simulations
CREATE TABLE public.admin_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  simulated_user_id UUID NOT NULL,
  simulated_org_id UUID NOT NULL REFERENCES public.organizations(id),
  mode TEXT NOT NULL DEFAULT 'readonly',
  actions_taken JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- stripe_events
CREATE TABLE public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- system_alerts
CREATE TABLE public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- system_settings
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- raffle_custom_numbers
CREATE TABLE public.raffle_custom_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  ticket_index INTEGER NOT NULL,
  custom_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(raffle_id, ticket_index)
);

-- archived_raffle_summary
CREATE TABLE public.archived_raffle_summary (
  raffle_id UUID PRIMARY KEY REFERENCES public.raffles(id) ON DELETE CASCADE,
  tickets_sold INTEGER DEFAULT 0,
  tickets_reserved INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  unique_buyers INTEGER DEFAULT 0,
  winners JSONB DEFAULT '[]',
  top_buyers JSONB DEFAULT '[]',
  sales_by_day JSONB DEFAULT '{}',
  sales_by_hour JSONB DEFAULT '{}',
  buyer_cities JSONB DEFAULT '{}',
  draw_executed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Parte 5: Vistas (Con Security Invoker)

```sql
-- Vista pública de sorteos (SECURITY INVOKER para respetar RLS)
CREATE OR REPLACE VIEW public.public_raffles
WITH (security_invoker = true)
AS
SELECT 
  r.id, r.organization_id, r.title, r.slug, r.description, r.category,
  r.prize_name, r.prize_value, r.prize_images, r.prize_video_url, r.prize_terms, 
  r.prize_display_mode, r.prizes,
  r.ticket_price, r.total_tickets, r.currency_code,
  r.draw_date, r.draw_method, r.lottery_digits, r.lottery_draw_number,
  r.start_date, r.status, r.template_id, r.customization,
  r.reservation_time_minutes, r.max_tickets_per_person, r.max_tickets_per_purchase,
  r.close_sale_hours_before, r.livestream_url,
  r.allow_individual_sale, r.lucky_numbers_enabled,
  r.winner_announced, r.winner_ticket_number,
  r.created_at, r.updated_at
FROM public.raffles r
WHERE r.status IN ('active', 'completed');

-- Vista pública de dominios (SECURITY INVOKER para respetar RLS)
CREATE OR REPLACE VIEW public.public_custom_domains
WITH (security_invoker = true)
AS
SELECT cd.id, cd.organization_id, cd.domain, cd.verified, cd.is_primary, cd.created_at
FROM public.custom_domains cd
WHERE cd.verified = true;

-- Vista materializada de estadísticas (acceso restringido via RPC)
CREATE MATERIALIZED VIEW public.raffle_stats_mv AS
SELECT 
  r.id as raffle_id,
  r.organization_id,
  r.title,
  r.status,
  r.ticket_price,
  r.total_tickets,
  r.draw_date,
  r.created_at,
  COALESCE(SUM(CASE WHEN o.status = 'sold' THEN o.ticket_count ELSE 0 END), 0) as sold_count,
  COALESCE(SUM(CASE WHEN o.status IN ('reserved', 'pending') THEN o.ticket_count ELSE 0 END), 0) as reserved_count,
  COALESCE(SUM(CASE WHEN o.status = 'sold' THEN o.order_total ELSE 0 END), 0) as revenue,
  COUNT(DISTINCT CASE WHEN o.status = 'sold' THEN o.buyer_email END) as unique_buyers
FROM public.raffles r
LEFT JOIN public.orders o ON o.raffle_id = r.id
WHERE r.archived_at IS NULL
GROUP BY r.id;

CREATE UNIQUE INDEX ON public.raffle_stats_mv (raffle_id);

-- IMPORTANTE: Revocar acceso directo a raffle_stats_mv
-- El acceso debe ser solo via funciones RPC con control de acceso
REVOKE SELECT ON public.raffle_stats_mv FROM anon;
REVOKE SELECT ON public.raffle_stats_mv FROM authenticated;
GRANT SELECT ON public.raffle_stats_mv TO service_role;
```

---

## Parte 6: Habilitar RLS

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_buyer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_custom_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_raffle_summary ENABLE ROW LEVEL SECURITY;
```

---

## Notas Importantes

1. **Ejecutar en orden**: Extensiones → Tipos → Tablas Core → Tablas Adicionales → Vistas → RLS
2. **Las políticas RLS** se deben crear después de las funciones helper
3. **Los triggers** se deben crear después de las tablas
4. **Regenerar tipos TypeScript** después de la migración:
   ```bash
   supabase gen types typescript --project-id TU_PROJECT > src/integrations/supabase/types.ts
   ```
