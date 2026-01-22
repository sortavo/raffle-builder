-- CLEANUP: Remove dead code and unused functions
DO $$
BEGIN
  -- FIRST: Drop ALL triggers that might depend on functions we're removing
  DROP TRIGGER IF EXISTS sync_blocks_on_order ON orders;
  DROP TRIGGER IF EXISTS auto_init_blocks ON raffles;
  DROP TRIGGER IF EXISTS trigger_auto_init_blocks ON raffles;
  DROP TRIGGER IF EXISTS update_customer_on_sold ON orders;
  DROP TRIGGER IF EXISTS trigger_update_customer_on_order_sold ON orders;
  DROP TRIGGER IF EXISTS sync_ticket_blocks_trigger ON orders;
  DROP TRIGGER IF EXISTS trigger_sync_ticket_blocks ON orders;
  DROP TRIGGER IF EXISTS upsert_customer_trigger ON orders;

  -- Old virtual tickets versions
  DROP FUNCTION IF EXISTS get_virtual_tickets_optimized(UUID, INTEGER, INTEGER);
  DROP FUNCTION IF EXISTS get_virtual_tickets_v2(UUID, INTEGER, INTEGER, TEXT, TEXT);
  DROP FUNCTION IF EXISTS get_virtual_ticket_counts_v(UUID);

  -- Old reservation functions
  DROP FUNCTION IF EXISTS reserve_virtual_tickets(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, INTEGER);
  DROP FUNCTION IF EXISTS reserve_virtual_tickets_resilient(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC);
  DROP FUNCTION IF EXISTS reserve_tickets_v(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, BOOLEAN);
  DROP FUNCTION IF EXISTS atomic_reserve_tickets_v(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC);
  DROP FUNCTION IF EXISTS check_tickets_available_v(UUID, INTEGER[]);
  DROP FUNCTION IF EXISTS confirm_order_sale_v(UUID);
  DROP FUNCTION IF EXISTS cancel_order_and_release_v(UUID);
  DROP FUNCTION IF EXISTS generate_ticket_batch(UUID, INTEGER, INTEGER);
  DROP FUNCTION IF EXISTS generate_ticket_batch_v(UUID, INTEGER, INTEGER);

  -- Legacy ticket block functions
  DROP FUNCTION IF EXISTS get_available_blocks(UUID, INTEGER);
  DROP FUNCTION IF EXISTS initialize_ticket_blocks(UUID);
  DROP FUNCTION IF EXISTS sync_raffle_blocks(UUID);
  DROP FUNCTION IF EXISTS sync_blocks_incremental(UUID, INTEGER, INTEGER, TEXT);
  DROP FUNCTION IF EXISTS sync_ticket_blocks_on_order();
  DROP FUNCTION IF EXISTS auto_initialize_blocks();
  DROP FUNCTION IF EXISTS get_ticket_counts_from_blocks(UUID);
  DROP FUNCTION IF EXISTS append_ticket_batch(UUID, INTEGER[]);

  -- Unused search/ticket functions
  DROP FUNCTION IF EXISTS search_virtual_tickets(UUID, TEXT, INTEGER, INTEGER);
  DROP FUNCTION IF EXISTS get_public_tickets(UUID, INTEGER, INTEGER);
  DROP FUNCTION IF EXISTS get_secure_order_by_reference(TEXT, TEXT);

  -- Unused stats functions
  DROP FUNCTION IF EXISTS get_raffle_stats_fast(UUID);
  DROP FUNCTION IF EXISTS get_raffle_stats_for_org(UUID);
  DROP FUNCTION IF EXISTS refresh_raffle_stats(UUID);
  DROP FUNCTION IF EXISTS refresh_raffle_stats_mv();
  DROP FUNCTION IF EXISTS refresh_raffle_stats_now(UUID);
  DROP FUNCTION IF EXISTS refresh_all_materialized_views();

  -- Unused utility functions
  DROP FUNCTION IF EXISTS preview_ticket_numbers(INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT);
  DROP FUNCTION IF EXISTS apply_custom_numbers(UUID, TEXT[]);
  DROP FUNCTION IF EXISTS apply_random_permutation(UUID);
  DROP FUNCTION IF EXISTS compress_ticket_indices(INTEGER[]);
  DROP FUNCTION IF EXISTS count_tickets_in_ranges(JSONB);
  DROP FUNCTION IF EXISTS expand_ticket_ranges(JSONB);
  DROP FUNCTION IF EXISTS get_min_ticket_number(UUID);
  DROP FUNCTION IF EXISTS is_index_in_order(INTEGER, JSONB, INTEGER[]);

  -- Unused cleanup functions
  DROP FUNCTION IF EXISTS cleanup_expired_orders();
  DROP FUNCTION IF EXISTS cleanup_expired_reservations_batch(INTEGER);
  DROP FUNCTION IF EXISTS cleanup_expired_tickets_batch(INTEGER);
  DROP FUNCTION IF EXISTS release_expired_tickets();
  DROP FUNCTION IF EXISTS get_expired_reservations_count();

  -- Unused job queue functions
  DROP FUNCTION IF EXISTS claim_next_job(TEXT);
  DROP FUNCTION IF EXISTS validate_and_fix_job_batch(UUID);
  DROP FUNCTION IF EXISTS get_optimal_batch_size(UUID);

  -- Unused index management functions
  DROP FUNCTION IF EXISTS disable_non_critical_ticket_indexes(UUID);
  DROP FUNCTION IF EXISTS enable_non_critical_ticket_indexes(UUID);

  -- Unused customer/order functions
  DROP FUNCTION IF EXISTS register_buyer(UUID, TEXT, TEXT, TEXT, TEXT);
  DROP FUNCTION IF EXISTS update_customer_on_order_sold();
  DROP FUNCTION IF EXISTS upsert_customer_from_order(UUID);
  DROP FUNCTION IF EXISTS update_order_with_version(UUID, TEXT, TIMESTAMPTZ, UUID);

  -- Unused migration functions
  DROP FUNCTION IF EXISTS migrate_sold_tickets_to_orders();

  -- Unused admin functions
  DROP FUNCTION IF EXISTS start_admin_simulation(UUID);
  DROP FUNCTION IF EXISTS end_admin_simulation();

  -- Unused subscription functions
  DROP FUNCTION IF EXISTS calculate_mrr();
  DROP FUNCTION IF EXISTS calculate_churn_rate();

  -- Unused archival functions
  DROP FUNCTION IF EXISTS archive_raffle(UUID);
  DROP FUNCTION IF EXISTS archive_old_raffles();

  -- Unused edge function invoker
  DROP FUNCTION IF EXISTS invoke_edge_function(TEXT, JSONB);

  -- Legacy views and materialized views
  DROP VIEW IF EXISTS sold_tickets_compat;
  DROP MATERIALIZED VIEW IF EXISTS raffle_stats_mv;

  RAISE NOTICE 'Cleanup completed: removed ~50 unused functions, 2 views, and 5 triggers';
END;
$$;
