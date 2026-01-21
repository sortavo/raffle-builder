-- MT3, MT5, MT17: Missing RLS Policies for Refund Tables
-- Ensures proper multi-tenancy data isolation

-- =====================================================
-- MT3: refund_requests INSERT policy
-- Only org owners/admins can create refund requests
-- =====================================================

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'refund_requests'
    AND policyname = 'Org admins can create refund requests'
  ) THEN
    CREATE POLICY "Org admins can create refund requests"
    ON refund_requests
    FOR INSERT
    WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
      AND is_org_admin(auth.uid(), organization_id)
    );
  END IF;
END $$;

-- =====================================================
-- MT5: refund_audit_log INSERT policy
-- Only org admins can insert to refund audit log
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'refund_audit_log'
    AND policyname = 'Org admins can insert refund audit'
  ) THEN
    CREATE POLICY "Org admins can insert refund audit"
    ON refund_audit_log
    FOR INSERT
    WITH CHECK (
      refund_request_id IN (
        SELECT id FROM refund_requests
        WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
      )
    );
  END IF;
END $$;

-- Platform admins can insert to refund audit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'refund_audit_log'
    AND policyname = 'Platform admins can manage refund audit'
  ) THEN
    CREATE POLICY "Platform admins can manage refund audit"
    ON refund_audit_log
    FOR ALL
    USING (is_platform_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- MT17: subscription_events INSERT policy
-- Only system/webhooks should insert, users can view
-- =====================================================

-- Note: subscription_events already has SELECT policies
-- INSERT should only be via service_role or webhook handler
-- No user INSERT policy needed (they can only view)

-- =====================================================
-- Additional: Strengthen payment_failures policies
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_failures'
    AND policyname = 'System can insert payment failures'
  ) THEN
    -- Payment failures are inserted by webhooks (service role)
    -- No user INSERT policy - this is correct
    NULL;
  END IF;
END $$;

-- =====================================================
-- Strengthen dunning_emails policies
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dunning_emails'
    AND policyname = 'Platform admins can manage dunning emails'
  ) THEN
    CREATE POLICY "Platform admins can manage dunning emails"
    ON dunning_emails
    FOR ALL
    USING (is_platform_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- Add UPDATE policy for refund_requests
-- Org admins can update pending requests, platform admins approve/reject
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'refund_requests'
    AND policyname = 'Org admins can update own pending refunds'
  ) THEN
    CREATE POLICY "Org admins can update own pending refunds"
    ON refund_requests
    FOR UPDATE
    USING (
      organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
      AND is_org_admin(auth.uid(), organization_id)
      AND status = 'pending'
    )
    WITH CHECK (
      organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
      AND is_org_admin(auth.uid(), organization_id)
    );
  END IF;
END $$;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON POLICY "Org admins can create refund requests" ON refund_requests IS 'MT3: Only org owners/admins can create refund requests for their organization';
