-- Migration: Enable multi-user Telegram support per organization
-- This allows multiple team members to receive notifications

-- 1. Drop the unique constraint on organization_id (allows multiple users per org)
ALTER TABLE public.telegram_connections
DROP CONSTRAINT IF EXISTS telegram_connections_organization_id_key;

-- 2. Make telegram_chat_id nullable (for pending connections before linking)
ALTER TABLE public.telegram_connections
ALTER COLUMN telegram_chat_id DROP NOT NULL;

-- 3. Add unique constraint on (organization_id, telegram_chat_id) to prevent same user linked twice
-- Only for non-null chat_ids (pending connections can have NULL)
CREATE UNIQUE INDEX IF NOT EXISTS telegram_connections_org_chat_unique
ON public.telegram_connections(organization_id, telegram_chat_id)
WHERE telegram_chat_id IS NOT NULL;

-- 4. Add a user_id column to track which user created the connection (optional, for audit)
ALTER TABLE public.telegram_connections
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 5. Add display_name column for better UX when showing multiple users
ALTER TABLE public.telegram_connections
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 6. Update index for faster lookups by organization (multiple rows now)
DROP INDEX IF EXISTS idx_telegram_connections_org;
CREATE INDEX idx_telegram_connections_org_multi ON public.telegram_connections(organization_id, verified_at DESC NULLS LAST);

-- 7. Add index for finding pending connections by link_code
CREATE INDEX IF NOT EXISTS idx_telegram_connections_pending
ON public.telegram_connections(link_code, link_code_expires_at)
WHERE link_code IS NOT NULL AND telegram_chat_id IS NULL;
