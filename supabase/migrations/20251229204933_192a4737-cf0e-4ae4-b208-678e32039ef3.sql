-- Create partial index for efficient random winner drawing from sold tickets
CREATE INDEX IF NOT EXISTS idx_tickets_sold_by_index 
ON public.tickets(raffle_id, ticket_index) 
WHERE status = 'sold';

-- Create partial index for efficient random selection of available tickets
CREATE INDEX IF NOT EXISTS idx_tickets_available_by_index 
ON public.tickets(raffle_id, ticket_index) 
WHERE status = 'available';

COMMENT ON INDEX idx_tickets_sold_by_index IS 'Optimizes random winner selection for raffles with millions of tickets';
COMMENT ON INDEX idx_tickets_available_by_index IS 'Optimizes random ticket selection for large raffles';