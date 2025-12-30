-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE SET NULL,
  min_purchase NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Org members can manage their coupons
CREATE POLICY "Org members can manage coupons"
  ON public.coupons
  FOR ALL
  USING (has_org_access(auth.uid(), organization_id));

-- Public can validate active coupons (for checkout)
CREATE POLICY "Public can view active coupons"
  ON public.coupons
  FOR SELECT
  USING (active = true);

-- Create coupon_usage table for tracking
CREATE TABLE public.coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  discount_applied NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT
);

-- Enable RLS
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- Org members can view usage of their coupons
CREATE POLICY "Org members can view coupon usage"
  ON public.coupon_usage
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coupons c 
    WHERE c.id = coupon_usage.coupon_id 
    AND has_org_access(auth.uid(), c.organization_id)
  ));

-- Anyone can insert usage (during checkout)
CREATE POLICY "Anyone can insert coupon usage"
  ON public.coupon_usage
  FOR INSERT
  WITH CHECK (true);

-- Create function to increment coupon usage
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.coupons 
  SET current_uses = current_uses + 1, updated_at = now()
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-increment usage count
CREATE TRIGGER trigger_increment_coupon_usage
  AFTER INSERT ON public.coupon_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_coupon_usage();