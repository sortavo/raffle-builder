-- Issue M16: Prevent duplicate dunning emails of the same type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_dunning_email_per_failure_type'
  ) THEN
    ALTER TABLE dunning_emails
    ADD CONSTRAINT unique_dunning_email_per_failure_type
    UNIQUE (payment_failure_id, email_type);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- Issue M17: Add performance indexes for billing_audit_log
CREATE INDEX IF NOT EXISTS idx_billing_audit_created_at
ON billing_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_audit_org_action
ON billing_audit_log(organization_id, action);

CREATE INDEX IF NOT EXISTS idx_billing_audit_actor
ON billing_audit_log(actor_id) WHERE actor_id IS NOT NULL;