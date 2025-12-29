-- =====================================================
-- PRODUCTION OPTIMIZATION INDEXES
-- Optimize queries for hundreds of organizations and millions of tickets
-- =====================================================

-- 1. Tickets table - Most critical for performance
-- =====================================================

-- Index for public ticket grid (status + raffle_id + ticket_index)
CREATE INDEX IF NOT EXISTS idx_tickets_raffle_status_index 
ON public.tickets (raffle_id, status, ticket_index);

-- Index for buyer search by email (most common lookup)
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_email_lookup 
ON public.tickets (raffle_id, buyer_email) 
WHERE buyer_email IS NOT NULL;

-- Index for buyer search by phone
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_phone_lookup 
ON public.tickets (raffle_id, buyer_phone) 
WHERE buyer_phone IS NOT NULL;

-- Index for payment reference lookups (checkout flow)
CREATE INDEX IF NOT EXISTS idx_tickets_payment_reference 
ON public.tickets (raffle_id, payment_reference) 
WHERE payment_reference IS NOT NULL;

-- Index for reserved tickets with expiration (cleanup job)
CREATE INDEX IF NOT EXISTS idx_tickets_reserved_expiring 
ON public.tickets (reserved_until) 
WHERE status = 'reserved' AND reserved_until IS NOT NULL;

-- Index for pending approvals (dashboard)
CREATE INDEX IF NOT EXISTS idx_tickets_pending_approval 
ON public.tickets (raffle_id, status, reserved_at DESC) 
WHERE status = 'reserved' AND payment_proof_url IS NOT NULL;

-- Index for sold tickets by date (analytics)
CREATE INDEX IF NOT EXISTS idx_tickets_sold_by_date 
ON public.tickets (raffle_id, sold_at DESC) 
WHERE status = 'sold';

-- Index for buyer city analytics
CREATE INDEX IF NOT EXISTS idx_tickets_buyer_city 
ON public.tickets (raffle_id, buyer_city) 
WHERE buyer_city IS NOT NULL;

-- 2. Raffles table
-- =====================================================

-- Index for organization dashboard listing
CREATE INDEX IF NOT EXISTS idx_raffles_org_status 
ON public.raffles (organization_id, status, created_at DESC);

-- Index for public raffle lookup by slug
CREATE INDEX IF NOT EXISTS idx_raffles_active_slug 
ON public.raffles (slug) 
WHERE status = 'active';

-- Index for auto-draw job
CREATE INDEX IF NOT EXISTS idx_raffles_pending_draw 
ON public.raffles (draw_date) 
WHERE status = 'active' AND draw_method = 'random_org' AND winner_ticket_number IS NULL;

-- 3. Organizations table
-- =====================================================

-- Index for slug lookup (public pages)
CREATE INDEX IF NOT EXISTS idx_organizations_slug 
ON public.organizations (slug) 
WHERE slug IS NOT NULL;

-- Index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON public.organizations (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- 4. Notifications table
-- =====================================================

-- Index for user notification inbox
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, created_at DESC) 
WHERE read = false;

-- 5. Analytics events
-- =====================================================

-- Index for analytics queries by date range
CREATE INDEX IF NOT EXISTS idx_analytics_org_date 
ON public.analytics_events (organization_id, created_at DESC);

-- Index for raffle-specific analytics
CREATE INDEX IF NOT EXISTS idx_analytics_raffle_type 
ON public.analytics_events (raffle_id, event_type, created_at DESC) 
WHERE raffle_id IS NOT NULL;

-- 6. Ticket generation jobs
-- =====================================================

-- Index for pending job processing
CREATE INDEX IF NOT EXISTS idx_ticket_jobs_pending 
ON public.ticket_generation_jobs (status, created_at) 
WHERE status IN ('pending', 'running');

-- =====================================================
-- ANALYZE tables to update statistics for query planner
-- =====================================================
ANALYZE public.tickets;
ANALYZE public.raffles;
ANALYZE public.organizations;
ANALYZE public.notifications;
ANALYZE public.analytics_events;