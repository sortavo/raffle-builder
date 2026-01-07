-- FASE 3 + 4: Migración completa a tickets virtuales (sin cron)

-- 1. Migrar tickets vendidos/reservados existentes a sold_tickets (si no están ya)
INSERT INTO sold_tickets (
  raffle_id, ticket_index, ticket_number, status,
  buyer_name, buyer_email, buyer_phone, buyer_city,
  payment_reference, payment_proof_url, order_total,
  reserved_at, reserved_until, sold_at, created_at,
  buyer_id, approved_at, approved_by, notes, payment_method, canceled_at
)
SELECT 
  raffle_id, ticket_index, ticket_number, status,
  buyer_name, buyer_email, buyer_phone, buyer_city,
  payment_reference, payment_proof_url, order_total,
  reserved_at, reserved_until, sold_at, created_at,
  buyer_id, approved_at, approved_by, notes, payment_method, canceled_at
FROM tickets
WHERE status IN ('sold', 'reserved')
ON CONFLICT (raffle_id, ticket_index) DO NOTHING;

-- 2. Activar virtual tickets en TODAS las rifas no archivadas
UPDATE raffles 
SET customization = jsonb_set(
  COALESCE(customization, '{}'::jsonb), 
  '{use_virtual_tickets}', 
  'true'
)
WHERE archived_at IS NULL;

-- 3. Borrar funciones de generación obsoletas (si existen)
DROP FUNCTION IF EXISTS generate_ticket_batch CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_batch_v2 CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_batch_v3 CASCADE;
DROP FUNCTION IF EXISTS process_ticket_batch CASCADE;