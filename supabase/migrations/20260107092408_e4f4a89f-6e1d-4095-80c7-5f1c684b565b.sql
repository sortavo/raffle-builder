-- Enable RLS on system_alerts
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view/manage alerts
CREATE POLICY "Platform admins can manage alerts"
  ON system_alerts
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));