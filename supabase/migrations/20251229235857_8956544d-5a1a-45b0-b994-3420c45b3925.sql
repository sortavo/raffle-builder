-- Create audit_log table to track all changes
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  organization_id UUID,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject'
  resource_type TEXT NOT NULL, -- 'raffle', 'ticket', 'payment_method', 'organization', 'team_member'
  resource_id UUID,
  resource_name TEXT, -- Human-readable name (e.g., raffle title)
  changes JSONB, -- Store old and new values for updates
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_audit_log_org ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only org admins/owners can view audit log
CREATE POLICY "Org admins can view audit log"
ON public.audit_log
FOR SELECT
USING (is_org_admin(auth.uid(), organization_id));

-- Platform admins can view all
CREATE POLICY "Platform admins can view all audit logs"
ON public.audit_log
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Only system can insert (via triggers or edge functions)
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to log changes
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_resource_name TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_log_id UUID;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  SELECT email, full_name INTO v_user_email, v_user_name
  FROM public.profiles
  WHERE id = v_user_id;
  
  -- Insert audit log
  INSERT INTO public.audit_log (
    user_id,
    user_email,
    user_name,
    organization_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    changes,
    metadata
  ) VALUES (
    v_user_id,
    COALESCE(v_user_email, 'unknown'),
    v_user_name,
    p_organization_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_changes,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;