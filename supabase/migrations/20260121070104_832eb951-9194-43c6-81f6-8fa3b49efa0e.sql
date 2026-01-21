-- C2 GDPR: Table to record explicit user consent to terms and privacy policy
-- Required for GDPR Art. 7 - Conditions for consent

CREATE TABLE IF NOT EXISTS terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE(user_id, terms_version, privacy_version)
);

-- Enable RLS
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view own acceptances"
  ON terms_acceptance FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own acceptances
CREATE POLICY "Users can insert own acceptances"
  ON terms_acceptance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Platform admins can view all for compliance audits
CREATE POLICY "Platform admins can view all acceptances"
  ON terms_acceptance FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_terms_acceptance_user ON terms_acceptance(user_id);
CREATE INDEX idx_terms_acceptance_version ON terms_acceptance(terms_version, privacy_version);
CREATE INDEX idx_terms_acceptance_date ON terms_acceptance(accepted_at);

-- Add comment for documentation
COMMENT ON TABLE terms_acceptance IS 'GDPR Art. 7 compliance - Records explicit user consent to terms of service and privacy policy';