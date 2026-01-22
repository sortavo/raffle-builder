-- Fix remaining references to deleted customers table

-- Drop any remaining triggers that reference customers
DROP TRIGGER IF EXISTS upsert_customer_trigger ON orders;
DROP TRIGGER IF EXISTS trigger_upsert_customer ON orders;
DROP TRIGGER IF EXISTS update_customer_trigger ON orders;

-- Drop the trigger function if it still exists
DROP FUNCTION IF EXISTS upsert_customer_from_order() CASCADE;
DROP FUNCTION IF EXISTS update_customer_on_order_sold() CASCADE;

-- Remove the foreign key constraint on orders.customer_id if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
