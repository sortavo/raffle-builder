-- ============================================
-- SCALABILITY INDICES FOR 10M TICKETS
-- ============================================

-- Índice compuesto para búsqueda de órdenes por rifa y estado
-- Usado por: get_virtual_tickets, get_buyers_paginated, ticket counts
CREATE INDEX IF NOT EXISTS idx_orders_raffle_status 
ON orders(raffle_id, status) 
WHERE status IN ('reserved', 'pending', 'sold');

-- Índice GIN para búsqueda en ticket_ranges (JSONB)
-- Usado por: check_indices_available, reserve_tickets_v2
CREATE INDEX IF NOT EXISTS idx_orders_ticket_ranges 
ON orders USING GIN (ticket_ranges jsonb_path_ops);

-- Índice para lucky_indices (array de integers)
-- Usado por: check_indices_available, expand_order_to_indices
CREATE INDEX IF NOT EXISTS idx_orders_lucky_indices 
ON orders USING GIN (lucky_indices);

-- Índice para búsqueda de compradores
-- Usado por: get_buyers_paginated con search
CREATE INDEX IF NOT EXISTS idx_orders_buyer_search 
ON orders(raffle_id, buyer_email, buyer_name);

-- Índice para auto-draw ordenado por fecha
-- Usado por: auto-draw edge function
CREATE INDEX IF NOT EXISTS idx_orders_draw 
ON orders(raffle_id, created_at DESC) 
WHERE status = 'sold';

-- Índice para ticket_count en agregaciones
-- Usado por: dashboard stats, revenue calculations
CREATE INDEX IF NOT EXISTS idx_orders_ticket_count_sum 
ON orders(raffle_id, ticket_count, order_total) 
WHERE status = 'sold';

-- Índice para reservaciones expiradas (cleanup)
-- Usado por: cleanup_expired_orders, release_expired_tickets
CREATE INDEX IF NOT EXISTS idx_orders_expired_reservations 
ON orders(reserved_until) 
WHERE status = 'reserved' AND reserved_until IS NOT NULL;

-- Índice para pending approvals count
-- Usado por: pending-approvals-count query
CREATE INDEX IF NOT EXISTS idx_orders_pending_status 
ON orders(organization_id, status) 
WHERE status = 'pending';