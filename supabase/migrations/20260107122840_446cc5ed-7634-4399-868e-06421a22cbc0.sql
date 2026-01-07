-- Drop obsolete SQL functions from legacy ticket system

-- Functions related to physical ticket generation (no longer needed with virtual tickets)
DROP FUNCTION IF EXISTS public.append_ticket_batch(integer, integer, jsonb, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.append_ticket_batch(p_existing_count integer, p_new_total integer, p_numbering_config jsonb, p_raffle_id uuid) CASCADE;

-- Functions for index management on deleted tickets table
DROP FUNCTION IF EXISTS public.disable_non_critical_ticket_indexes() CASCADE;
DROP FUNCTION IF EXISTS public.enable_non_critical_ticket_indexes() CASCADE;

-- Ticket event logging (legacy)
DROP FUNCTION IF EXISTS public.log_ticket_event(uuid, text, jsonb) CASCADE;

-- Ticket job validation (ticket_generation_jobs table deleted)
DROP FUNCTION IF EXISTS public.validate_and_fix_job_batch(uuid) CASCADE;

-- Legacy stats functions that referenced materialized views
DROP FUNCTION IF EXISTS public.refresh_raffle_stats_mv() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_raffle_stats_now() CASCADE;

-- Get min ticket number (no longer relevant with virtual tickets)
DROP FUNCTION IF EXISTS public.get_min_ticket_number(uuid) CASCADE;

-- Get optimal batch size (no longer relevant)
DROP FUNCTION IF EXISTS public.get_optimal_batch_size(integer) CASCADE;