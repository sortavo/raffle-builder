
-- Fix the security definer view issue by using security_invoker
DROP VIEW IF EXISTS public.tickets_public;

CREATE VIEW public.tickets_public 
WITH (security_invoker = true)
AS
SELECT 
  t.id,
  t.raffle_id,
  t.ticket_number,
  t.ticket_index,
  t.status,
  t.buyer_name,
  t.buyer_city,
  t.created_at
FROM public.tickets t
INNER JOIN public.raffles r ON r.id = t.raffle_id
WHERE r.status = 'active';

-- Grant access to the view for anon and authenticated users
GRANT SELECT ON public.tickets_public TO anon, authenticated;

-- Since the view now uses security_invoker, we need a policy on tickets 
-- that allows the anon role to read limited data for active raffles
-- But we already removed the public policy, so we need to add one back that's safe

-- This policy allows public to see tickets of active raffles
-- The VIEW already filters to only the safe columns
CREATE POLICY "Public can view tickets of active raffles"
ON public.tickets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.raffles r 
    WHERE r.id = tickets.raffle_id 
    AND r.status = 'active'
  )
);

-- Drop the problematic policy we created earlier
DROP POLICY IF EXISTS "Buyers can view their own tickets by reference" ON public.tickets;

COMMENT ON VIEW public.tickets_public IS 'Secure public view of tickets showing only non-sensitive data (ticket_number, status, buyer_name, buyer_city) for active raffles. Uses security_invoker to respect RLS policies.';
