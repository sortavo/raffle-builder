-- Add customer_id column to orders table
-- This allows the trigger to link each order to its customer
ALTER TABLE orders 
ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Create index for efficient customer order lookups
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Backfill existing orders with their corresponding customers
-- Matches by organization + email (lowercase)
UPDATE orders o
SET customer_id = c.id
FROM customers c
WHERE o.organization_id = c.organization_id
  AND lower(o.buyer_email) = c.email
  AND o.customer_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.customer_id IS 
  'Reference to the customer record. Each customer is unique per organization.';