-- MT2: Audit Log Isolation Enhancement
-- MT13: Admin Bypass Audit Trail
-- Ensures proper multi-tenancy isolation for audit logs

-- =====================================================
-- MT2: Fix audit_log RLS to handle NULL organization_id
-- =====================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Org admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Platform admins can view all audit logs" ON public.audit_log;

-- Recreate with proper NULL handling
CREATE POLICY "Org admins can view own org audit log"
ON public.audit_log
FOR SELECT
USING (
  organization_id IS NOT NULL
  AND is_org_admin(auth.uid(), organization_id)
);

CREATE POLICY "Users can view their own actions"
ON public.audit_log
FOR SELECT
USING (
  user_id = auth.uid()
);

CREATE POLICY "Platform admins can view all audit logs"
ON public.audit_log
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- =====================================================
-- MT13: Admin Simulation Audit Trail
-- Track when platform admins simulate users
-- =====================================================

-- Add columns to track admin simulation in audit logs
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS simulated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS simulation_reason TEXT;

ALTER TABLE public.billing_audit_log ADD COLUMN IF NOT EXISTS simulated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.billing_audit_log ADD COLUMN IF NOT EXISTS simulation_reason TEXT;

-- Create table to track admin simulation sessions
CREATE TABLE IF NOT EXISTS public.admin_simulation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulated_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  actions_performed INTEGER DEFAULT 0,
  ip_address INET,
  user_agent TEXT
);

-- RLS for admin simulation log
ALTER TABLE admin_simulation_log ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view simulation logs
CREATE POLICY "Platform admins can view simulation logs"
ON admin_simulation_log
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Only platform admins can insert (start simulation)
CREATE POLICY "Platform admins can start simulations"
ON admin_simulation_log
FOR INSERT
WITH CHECK (
  is_platform_admin(auth.uid())
  AND admin_user_id = auth.uid()
);

-- Only platform admins can update (end simulation)
CREATE POLICY "Platform admins can update own simulations"
ON admin_simulation_log
FOR UPDATE
USING (
  is_platform_admin(auth.uid())
  AND admin_user_id = auth.uid()
);

-- Indexes for admin simulation log
CREATE INDEX IF NOT EXISTS idx_admin_sim_admin ON admin_simulation_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sim_user ON admin_simulation_log(simulated_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sim_org ON admin_simulation_log(simulated_organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_sim_date ON admin_simulation_log(started_at DESC);

-- Function to log admin simulation start
CREATE OR REPLACE FUNCTION start_admin_simulation(
  p_simulated_user_id UUID,
  p_reason TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_admin_id UUID;
  v_sim_org_id UUID;
  v_session_id UUID;
BEGIN
  v_admin_id := auth.uid();

  -- Verify admin is a platform admin
  IF NOT is_platform_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Only platform admins can simulate users';
  END IF;

  -- Get simulated user's organization
  SELECT organization_id INTO v_sim_org_id
  FROM profiles
  WHERE id = p_simulated_user_id;

  -- Log the simulation session
  INSERT INTO admin_simulation_log (
    admin_user_id,
    simulated_user_id,
    simulated_organization_id,
    reason,
    ip_address,
    user_agent
  ) VALUES (
    v_admin_id,
    p_simulated_user_id,
    v_sim_org_id,
    p_reason,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_session_id;

  -- Log to audit
  INSERT INTO audit_log (
    user_id,
    user_email,
    user_name,
    organization_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  SELECT
    v_admin_id,
    p.email,
    p.full_name,
    v_sim_org_id,
    'start_simulation',
    'user',
    p_simulated_user_id,
    jsonb_build_object(
      'session_id', v_session_id,
      'reason', p_reason,
      'simulated_user_email', (SELECT email FROM profiles WHERE id = p_simulated_user_id)
    )
  FROM profiles p
  WHERE p.id = v_admin_id;

  RETURN v_session_id;
END;
$func$;

-- Function to end admin simulation
CREATE OR REPLACE FUNCTION end_admin_simulation(
  p_session_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_admin_id UUID;
  v_sim_user_id UUID;
  v_sim_org_id UUID;
  v_actions INTEGER;
BEGIN
  v_admin_id := auth.uid();

  -- Verify this is the admin's session
  SELECT simulated_user_id, simulated_organization_id, actions_performed
  INTO v_sim_user_id, v_sim_org_id, v_actions
  FROM admin_simulation_log
  WHERE id = p_session_id
    AND admin_user_id = v_admin_id
    AND ended_at IS NULL;

  IF v_sim_user_id IS NULL THEN
    RAISE EXCEPTION 'Simulation session not found or already ended';
  END IF;

  -- End the simulation
  UPDATE admin_simulation_log
  SET ended_at = NOW()
  WHERE id = p_session_id;

  -- Log to audit
  INSERT INTO audit_log (
    user_id,
    user_email,
    user_name,
    organization_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  SELECT
    v_admin_id,
    p.email,
    p.full_name,
    v_sim_org_id,
    'end_simulation',
    'user',
    v_sim_user_id,
    jsonb_build_object(
      'session_id', p_session_id,
      'actions_performed', v_actions
    )
  FROM profiles p
  WHERE p.id = v_admin_id;
END;
$func$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_admin_simulation(UUID, TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_admin_simulation(UUID) TO authenticated;

-- Comments
COMMENT ON TABLE admin_simulation_log IS 'MT13: Tracks when platform admins simulate users for audit trail';
COMMENT ON COLUMN audit_log.simulated_by IS 'MT13: If set, indicates this action was taken by a platform admin simulating a user';
COMMENT ON COLUMN billing_audit_log.simulated_by IS 'MT13: If set, indicates this action was taken by a platform admin simulating a user';
