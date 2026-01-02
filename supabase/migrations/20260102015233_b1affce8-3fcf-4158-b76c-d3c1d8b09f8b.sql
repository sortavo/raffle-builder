-- Add optimized index for payment_reference + status lookups
-- This supports queries filtering by payment_reference with status conditions
CREATE INDEX IF NOT EXISTS idx_tickets_payment_reference_status 
ON public.tickets(payment_reference, status) 
WHERE payment_reference IS NOT NULL;