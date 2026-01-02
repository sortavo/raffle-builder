-- Add min_tickets_per_purchase column to raffles table
ALTER TABLE public.raffles 
ADD COLUMN IF NOT EXISTS min_tickets_per_purchase integer DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.raffles.min_tickets_per_purchase IS 'Minimum number of tickets required per purchase. Default is 1.';