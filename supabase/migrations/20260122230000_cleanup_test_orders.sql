-- Cleanup: Remove test orders created during today's debugging session
DELETE FROM orders
WHERE reference_code IN ('ORD-DA74FAE8', 'CHVKBWA2', '7A7UEJFH')
AND buyer_email LIKE '%test%';
