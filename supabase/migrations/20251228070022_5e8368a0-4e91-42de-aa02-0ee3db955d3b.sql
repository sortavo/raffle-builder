-- Add prize_display_mode column to raffles table
ALTER TABLE public.raffles 
ADD COLUMN prize_display_mode TEXT DEFAULT 'hierarchical';

-- Add comment for documentation
COMMENT ON COLUMN public.raffles.prize_display_mode IS 'How prizes are displayed: hierarchical (1st, 2nd, 3rd), equal (all same weight), numbered (Prize 1, 2, 3)';