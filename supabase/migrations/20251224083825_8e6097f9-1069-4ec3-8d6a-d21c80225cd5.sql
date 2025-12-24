-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Org members can view invitations for their org
CREATE POLICY "Org members can view invitations"
ON public.team_invitations
FOR SELECT
USING (has_org_access(auth.uid(), organization_id));

-- Org admins can create invitations
CREATE POLICY "Org admins can create invitations"
ON public.team_invitations
FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Org admins can delete invitations
CREATE POLICY "Org admins can delete invitations"
ON public.team_invitations
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- Anyone can view invitations by token (for acceptance)
CREATE POLICY "Anyone can view invitation by token"
ON public.team_invitations
FOR SELECT
USING (true);

-- Create index for faster token lookups
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);