-- =====================================================
-- COMPLETE LEGACY CLEANUP MIGRATION
-- Eliminates sold_tickets, buyers tables and obsolete RPCs
-- =====================================================

-- 1. Drop compatibility view first (depends on sold_tickets)
DROP VIEW IF EXISTS sold_tickets_compat CASCADE;

-- 2. Drop sold_tickets table (0 records, replaced by orders)
DROP TABLE IF EXISTS sold_tickets CASCADE;

-- 3. Drop buyers table (0 records, never used)
DROP TABLE IF EXISTS buyers CASCADE;

-- 4. Drop legacy reservation RPCs (replaced by reserve_tickets_v2)
DROP FUNCTION IF EXISTS reserve_virtual_tickets(uuid, integer[], text, text, text, text, text, integer, text);
DROP FUNCTION IF EXISTS reserve_virtual_tickets_resilient(uuid, integer[], text, text, text, text, text, integer, text);

-- 5. Drop migration RPC (already executed, no longer needed)
DROP FUNCTION IF EXISTS migrate_sold_tickets_to_orders();

-- 6. Drop buyer registration RPC (table eliminated)
DROP FUNCTION IF EXISTS register_buyer(text, text, text, text);

-- 7. Drop unused logging RPC
DROP FUNCTION IF EXISTS log_ticket_event(uuid, text, jsonb, text, text);

-- 8. Drop physical ticket generation RPC (system eliminated)
DROP FUNCTION IF EXISTS append_ticket_batch(integer, uuid, text[]);