-- Fix: Eliminar wrapper redundante que causa error "function is not unique"
-- La función de 5 argumentos con DEFAULT NULL ya acepta llamadas con 3 args

DROP FUNCTION IF EXISTS get_virtual_tickets(uuid, integer, integer);