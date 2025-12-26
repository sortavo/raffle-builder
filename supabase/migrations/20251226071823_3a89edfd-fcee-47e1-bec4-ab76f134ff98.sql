-- Add group_id column to payment_methods for grouping related methods under one account
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS group_id uuid DEFAULT NULL;

-- Add bank_select_value column to store the select option (bank name or 'Otro')
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS bank_select_value text DEFAULT NULL;

-- Create index for efficient grouping
CREATE INDEX IF NOT EXISTS idx_payment_methods_group_id ON public.payment_methods(group_id);