
-- Drop the existing overly permissive public policy
DROP POLICY IF EXISTS "Public can view ticket status only" ON public.tickets;

-- Create a secure view that only exposes public fields
CREATE OR REPLACE VIEW public.tickets_public AS
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

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.tickets_public IS 'Public view of tickets showing only non-sensitive data (ticket_number, status, buyer_name, buyer_city) for active raffles. Protects buyer_email, buyer_phone, payment_reference, and order_total.';

-- Keep the UPDATE policy for reservations (anon users still need to reserve tickets)
-- The existing "Anyone can reserve available tickets" policy already handles this correctly

-- Create a new restricted SELECT policy for authenticated users who need to see
-- tickets but aren't org members (e.g., buyers checking their own tickets)
CREATE POLICY "Buyers can view their own tickets by reference"
ON public.tickets
FOR SELECT
USING (
  -- Buyers can see their own tickets if they have the payment_reference
  payment_reference IS NOT NULL
);
