-- Add country column to payment_methods table
ALTER TABLE payment_methods 
  ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'MX';