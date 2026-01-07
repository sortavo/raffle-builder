-- Add columns for custom payment methods and multi-currency support
ALTER TABLE payment_methods 
  ADD COLUMN IF NOT EXISTS custom_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS custom_identifier VARCHAR(255),
  ADD COLUMN IF NOT EXISTS custom_identifier_label VARCHAR(50),
  ADD COLUMN IF NOT EXISTS custom_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'MXN';