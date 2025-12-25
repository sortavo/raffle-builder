-- Create payment_methods table for organizations
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Type and status
  type TEXT NOT NULL CHECK (type IN ('bank_transfer', 'cash', 'other')),
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- General information
  name TEXT NOT NULL,
  instructions TEXT,
  
  -- Bank details (only for bank_transfer type)
  bank_name TEXT,
  account_number TEXT,
  clabe TEXT,
  account_holder TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE (organization_id, name)
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Org members can manage their payment methods
CREATE POLICY "Org members can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (has_org_access(auth.uid(), organization_id));

-- Public can view enabled payment methods (for payment instructions page)
CREATE POLICY "Public can view enabled payment methods"
  ON public.payment_methods FOR SELECT
  USING (enabled = true);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_payment_methods_org_id ON public.payment_methods(organization_id);
CREATE INDEX idx_payment_methods_enabled ON public.payment_methods(enabled) WHERE enabled = true;