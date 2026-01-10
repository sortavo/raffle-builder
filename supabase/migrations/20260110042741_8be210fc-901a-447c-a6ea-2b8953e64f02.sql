-- =============================================
-- PHASE 1: Create customers table (PERMANENT CRM)
-- =============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Contact data
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  city TEXT,
  
  -- Aggregated metrics (updated automatically)
  total_orders INTEGER DEFAULT 0,
  total_tickets INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  first_purchase_at TIMESTAMPTZ,
  last_purchase_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique customer per email in organization
  CONSTRAINT unique_customer_email UNIQUE (organization_id, email),
  CONSTRAINT customer_has_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for fast lookups
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_email ON customers(organization_id, email);
CREATE INDEX idx_customers_phone ON customers(organization_id, phone);
CREATE INDEX idx_customers_last_purchase ON customers(organization_id, last_purchase_at DESC);
CREATE INDEX idx_customers_total_spent ON customers(organization_id, total_spent DESC);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view their customers"
  ON customers FOR SELECT
  USING (has_org_access(auth.uid(), organization_id));

CREATE POLICY "Org members can manage their customers"
  ON customers FOR ALL
  USING (has_org_access(auth.uid(), organization_id));

-- =============================================
-- PHASE 2: Add customer_id reference to orders
-- =============================================
ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id);
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- =============================================
-- PHASE 3: Trigger to auto-create/update customers
-- =============================================
CREATE OR REPLACE FUNCTION upsert_customer_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Skip if no buyer email
  IF NEW.buyer_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to find existing customer by email
  SELECT id INTO v_customer_id FROM customers 
  WHERE organization_id = NEW.organization_id 
    AND email = lower(NEW.buyer_email);
  
  -- If not found, create new customer
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (
      organization_id, email, phone, full_name, city, 
      total_orders, total_tickets, total_spent, first_purchase_at, last_purchase_at
    )
    VALUES (
      NEW.organization_id, 
      lower(NEW.buyer_email), 
      NEW.buyer_phone, 
      COALESCE(NEW.buyer_name, 'Sin nombre'), 
      NEW.buyer_city,
      1,
      NEW.ticket_count,
      CASE WHEN NEW.status = 'sold' THEN COALESCE(NEW.order_total, 0) ELSE 0 END,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update existing customer metrics
    UPDATE customers SET
      total_orders = total_orders + 1,
      total_tickets = total_tickets + NEW.ticket_count,
      total_spent = total_spent + 
        CASE WHEN NEW.status = 'sold' THEN COALESCE(NEW.order_total, 0) ELSE 0 END,
      full_name = COALESCE(NULLIF(NEW.buyer_name, ''), full_name),
      phone = COALESCE(NULLIF(NEW.buyer_phone, ''), phone),
      city = COALESCE(NULLIF(NEW.buyer_city, ''), city),
      last_purchase_at = NOW(),
      updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;
  
  -- Assign customer_id to order
  NEW.customer_id := v_customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger before insert
CREATE TRIGGER on_order_insert_upsert_customer
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION upsert_customer_from_order();

-- Also update total_spent when order status changes to 'sold'
CREATE OR REPLACE FUNCTION update_customer_on_order_sold()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes to 'sold'
  IF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_spent = total_spent + COALESCE(NEW.order_total, 0),
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_order_status_sold
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_on_order_sold();

-- =============================================
-- PHASE 4: Migrate existing data
-- =============================================

-- Create customers from existing orders
INSERT INTO customers (
  organization_id, email, phone, full_name, city,
  total_orders, total_tickets, total_spent, 
  first_purchase_at, last_purchase_at, created_at
)
SELECT 
  organization_id,
  lower(buyer_email),
  MAX(buyer_phone),
  COALESCE(MAX(buyer_name), 'Sin nombre'),
  MAX(buyer_city),
  COUNT(*)::integer,
  SUM(ticket_count)::integer,
  SUM(CASE WHEN status = 'sold' THEN COALESCE(order_total, 0) ELSE 0 END),
  MIN(reserved_at),
  MAX(reserved_at),
  MIN(created_at)
FROM orders
WHERE buyer_email IS NOT NULL
GROUP BY organization_id, lower(buyer_email)
ON CONFLICT (organization_id, email) DO NOTHING;

-- Link existing orders to customers
UPDATE orders o SET customer_id = c.id
FROM customers c
WHERE o.organization_id = c.organization_id
  AND lower(o.buyer_email) = c.email
  AND o.customer_id IS NULL;