-- Add cancellation tracking fields to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.cancel_at_period_end IS 'Whether the subscription is scheduled to cancel at period end';
COMMENT ON COLUMN public.organizations.current_period_end IS 'End date of the current billing period';