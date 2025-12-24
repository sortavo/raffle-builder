-- =====================================================
-- SORTAVO DATABASE SCHEMA - Phase 1
-- =====================================================

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');

-- Create subscription_tier enum
CREATE TYPE public.subscription_tier AS ENUM ('basic', 'pro', 'premium');

-- Create subscription_status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trial');

-- Create subscription_period enum
CREATE TYPE public.subscription_period AS ENUM ('monthly', 'annual');

-- Create raffle_status enum
CREATE TYPE public.raffle_status AS ENUM ('draft', 'active', 'paused', 'completed', 'canceled');

-- Create ticket_status enum
CREATE TYPE public.ticket_status AS ENUM ('available', 'reserved', 'sold', 'canceled');

-- Create draw_method enum
CREATE TYPE public.draw_method AS ENUM ('lottery_nacional', 'manual', 'random_org');

-- Create ticket_number_format enum
CREATE TYPE public.ticket_number_format AS ENUM ('sequential', 'prefixed', 'random');

-- =====================================================
-- TABLE: organizations
-- =====================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#2563EB',
  subscription_tier public.subscription_tier DEFAULT 'basic',
  subscription_status public.subscription_status DEFAULT 'trial',
  subscription_period public.subscription_period DEFAULT 'monthly',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  country_code TEXT DEFAULT 'MX',
  currency_code TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'America/Mexico_City',
  onboarding_completed BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  suspended BOOLEAN DEFAULT false,
  max_active_raffles INTEGER DEFAULT 2,
  max_tickets_per_raffle INTEGER DEFAULT 2000,
  templates_available INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE: user_roles (for organizers)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- =====================================================
-- TABLE: profiles (organizer profiles)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  invited_by UUID REFERENCES auth.users(id),
  accepted_invite_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE: raffles
-- =====================================================
CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  prize_name TEXT NOT NULL,
  prize_value DECIMAL(12, 2),
  prize_images TEXT[] DEFAULT '{}',
  prize_video_url TEXT,
  currency_code TEXT DEFAULT 'MXN',
  ticket_price DECIMAL(12, 2) NOT NULL,
  total_tickets INTEGER NOT NULL,
  ticket_number_format public.ticket_number_format DEFAULT 'sequential',
  start_date TIMESTAMPTZ,
  draw_date TIMESTAMPTZ,
  close_sale_hours_before INTEGER DEFAULT 0,
  draw_method public.draw_method DEFAULT 'manual',
  lottery_draw_number TEXT,
  lottery_digits INTEGER,
  status public.raffle_status DEFAULT 'draft',
  winner_ticket_number TEXT,
  winner_data JSONB,
  reservation_time_minutes INTEGER DEFAULT 15,
  max_tickets_per_purchase INTEGER DEFAULT 0,
  max_tickets_per_person INTEGER DEFAULT 0,
  allow_individual_sale BOOLEAN DEFAULT true,
  lucky_numbers_enabled BOOLEAN DEFAULT false,
  lucky_numbers_config JSONB,
  template_id TEXT DEFAULT 'modern',
  customization JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE: raffle_packages
-- =====================================================
CREATE TABLE public.raffle_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  label TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE: buyers
-- =====================================================
CREATE TABLE public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  email_verified BOOLEAN DEFAULT false,
  is_guest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- =====================================================
-- TABLE: tickets
-- =====================================================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE CASCADE NOT NULL,
  ticket_number TEXT NOT NULL,
  status public.ticket_status DEFAULT 'available',
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE SET NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_city TEXT,
  reserved_at TIMESTAMPTZ,
  reserved_until TIMESTAMPTZ,
  payment_method TEXT,
  payment_proof_url TEXT,
  payment_reference TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  sold_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (raffle_id, ticket_number)
);

-- Create indexes for tickets table
CREATE INDEX idx_tickets_raffle_status ON public.tickets(raffle_id, status);
CREATE INDEX idx_tickets_raffle_number ON public.tickets(raffle_id, ticket_number);
CREATE INDEX idx_tickets_reserved_until ON public.tickets(reserved_until) WHERE status = 'reserved';

-- =====================================================
-- TABLE: stripe_events (idempotency)
-- =====================================================
CREATE TABLE public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- TABLE: analytics_events
-- =====================================================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user has a specific role in an organization
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  )
$$;

-- Function to check if user has any role in an organization (member or higher)
CREATE OR REPLACE FUNCTION public.has_org_access(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Function to check if user is owner or admin of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- =====================================================
-- RLS POLICIES: organizations
-- =====================================================
CREATE POLICY "Users can view their own organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.has_org_access(auth.uid(), id));

CREATE POLICY "Org admins can update their organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), id));

-- =====================================================
-- RLS POLICIES: user_roles
-- =====================================================
CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), organization_id, 'owner'));

-- =====================================================
-- RLS POLICIES: profiles
-- =====================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND public.has_org_access(auth.uid(), organization_id)
  );

-- =====================================================
-- RLS POLICIES: raffles
-- =====================================================
CREATE POLICY "Users can view raffles in their organization"
  ON public.raffles FOR SELECT
  TO authenticated
  USING (public.has_org_access(auth.uid(), organization_id));

CREATE POLICY "Public can view active raffles"
  ON public.raffles FOR SELECT
  TO anon
  USING (status = 'active');

CREATE POLICY "Org members can create raffles"
  ON public.raffles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org members can update raffles"
  ON public.raffles FOR UPDATE
  TO authenticated
  USING (public.has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete raffles"
  ON public.raffles FOR DELETE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- =====================================================
-- RLS POLICIES: raffle_packages
-- =====================================================
CREATE POLICY "Users can view packages of their raffles"
  ON public.raffle_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_id
      AND public.has_org_access(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Public can view packages of active raffles"
  ON public.raffle_packages FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_id AND r.status = 'active'
    )
  );

CREATE POLICY "Org members can manage packages"
  ON public.raffle_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_id
      AND public.has_org_access(auth.uid(), r.organization_id)
    )
  );

-- =====================================================
-- RLS POLICIES: tickets
-- =====================================================
CREATE POLICY "Org members can view all ticket data"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_id
      AND public.has_org_access(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Public can view ticket status only"
  ON public.tickets FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_id AND r.status = 'active'
    )
  );

CREATE POLICY "Org members can manage tickets"
  ON public.tickets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_id
      AND public.has_org_access(auth.uid(), r.organization_id)
    )
  );

CREATE POLICY "Anyone can reserve available tickets"
  ON public.tickets FOR UPDATE
  TO anon
  USING (status = 'available')
  WITH CHECK (status IN ('available', 'reserved'));

-- =====================================================
-- RLS POLICIES: buyers
-- =====================================================
CREATE POLICY "Buyers can view their own data"
  ON public.buyers FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Buyers can update their own data"
  ON public.buyers FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Anyone can create buyer records"
  ON public.buyers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- RLS POLICIES: stripe_events
-- =====================================================
CREATE POLICY "Service role only for stripe_events"
  ON public.stripe_events FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- RLS POLICIES: analytics_events
-- =====================================================
CREATE POLICY "Org members can view their analytics"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (public.has_org_access(auth.uid(), organization_id));

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply update triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_raffles_updated_at
  BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTION: Handle new user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization for new user
  INSERT INTO public.organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.email),
    NEW.email
  )
  RETURNING id INTO new_org_id;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_org_id
  );
  
  -- Assign owner role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();