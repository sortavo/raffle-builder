-- Add new columns to payment_methods table for specific subtypes
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS subtype text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS card_number text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS paypal_email text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS paypal_link text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS schedule text;

-- Add comment for documentation
COMMENT ON COLUMN public.payment_methods.subtype IS 'Specific payment subtype: bank_deposit, bank_transfer, oxxo, pharmacy, convenience_store, paypal, mercado_pago, cash_in_person';
COMMENT ON COLUMN public.payment_methods.card_number IS 'Debit card number for deposits (16 digits)';
COMMENT ON COLUMN public.payment_methods.paypal_email IS 'PayPal account email';
COMMENT ON COLUMN public.payment_methods.paypal_link IS 'PayPal.me link';
COMMENT ON COLUMN public.payment_methods.payment_link IS 'Payment link for Mercado Pago or other services';
COMMENT ON COLUMN public.payment_methods.location IS 'Physical location for cash in person payments';
COMMENT ON COLUMN public.payment_methods.schedule IS 'Available schedule for in-person payments';