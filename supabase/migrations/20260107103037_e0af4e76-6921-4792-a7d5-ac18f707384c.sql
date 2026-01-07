-- Create a simple settings table for feature flags
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the kill switch for ticket generation (OFF = paused)
INSERT INTO public.system_settings (key, value)
VALUES ('ticket_generation_enabled', 'false')
ON CONFLICT (key) DO UPDATE SET value = 'false', updated_at = NOW();

-- Allow service_role to read this table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can read settings"
ON public.system_settings FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Authenticated users can read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);