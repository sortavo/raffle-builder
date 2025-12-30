-- Backfill trial_ends_at for existing organizations in trial without end date
UPDATE public.organizations 
SET trial_ends_at = created_at + interval '7 days'
WHERE subscription_status = 'trial' 
  AND trial_ends_at IS NULL;

-- Create trigger function to auto-set trial_ends_at
CREATE OR REPLACE FUNCTION public.set_trial_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is trial and trial_ends_at is not set, set it to 7 days from now
  IF NEW.subscription_status = 'trial' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at = now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger on organizations table
DROP TRIGGER IF EXISTS set_trial_ends_at_trigger ON public.organizations;
CREATE TRIGGER set_trial_ends_at_trigger
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trial_ends_at();