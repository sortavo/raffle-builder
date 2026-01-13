-- Add updated_at column to orders table
-- This column is required by the update_orders_updated_at trigger
ALTER TABLE orders 
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Initialize updated_at with created_at for existing records
UPDATE orders 
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.updated_at IS 
  'Timestamp of last update. Automatically maintained by trigger.';