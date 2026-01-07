-- Drop existing view that depends on the table
DROP VIEW IF EXISTS active_generation_jobs;
DROP VIEW IF EXISTS job_health_dashboard;

-- Add orchestration columns
ALTER TABLE ticket_generation_jobs 
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS worker_id INTEGER,
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;

-- Priority queue index
CREATE INDEX IF NOT EXISTS idx_jobs_priority_queue 
  ON ticket_generation_jobs(priority, created_at) 
  WHERE status = 'pending';

-- Active workers index  
CREATE INDEX IF NOT EXISTS idx_jobs_active_workers 
  ON ticket_generation_jobs(worker_id, status) 
  WHERE status = 'running';

-- Recreate active_generation_jobs view with new columns
CREATE OR REPLACE VIEW active_generation_jobs AS
SELECT 
  id, raffle_id, status, total_tickets, generated_count,
  current_batch, total_batches, batch_size,
  started_at, completed_at, error_message, created_at,
  priority, worker_id, sla_deadline,
  ROUND((generated_count::NUMERIC / NULLIF(total_tickets, 0)) * 100, 2) as progress_percentage,
  CASE WHEN started_at IS NOT NULL AND generated_count > 0 
    THEN ROUND(generated_count / GREATEST(EXTRACT(EPOCH FROM (NOW() - started_at)), 1))
    ELSE 0 
  END as current_tps
FROM ticket_generation_jobs
WHERE status IN ('pending', 'running')
ORDER BY priority ASC, created_at ASC;

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved 
  ON system_alerts(created_at DESC) 
  WHERE resolved_at IS NULL;

-- Priority calculation trigger
CREATE OR REPLACE FUNCTION calculate_job_priority()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.priority := CASE 
    WHEN NEW.total_tickets <= 100000 THEN 1
    WHEN NEW.total_tickets <= 1000000 THEN 3
    WHEN NEW.total_tickets <= 5000000 THEN 5
    ELSE 7
  END;
  
  NEW.sla_deadline := NEW.created_at + (
    CASE 
      WHEN NEW.total_tickets <= 100000 THEN INTERVAL '10 minutes'
      WHEN NEW.total_tickets <= 1000000 THEN INTERVAL '30 minutes'
      WHEN NEW.total_tickets <= 5000000 THEN INTERVAL '1 hour'
      ELSE INTERVAL '2 hours'
    END
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_job_priority ON ticket_generation_jobs;
CREATE TRIGGER set_job_priority
  BEFORE INSERT ON ticket_generation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_job_priority();

-- Health check function
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS TABLE(alert_type TEXT, severity TEXT, message TEXT, metadata JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sla_violations INTEGER;
  v_stalled_jobs INTEGER;
  v_failed_jobs INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_sla_violations
  FROM ticket_generation_jobs
  WHERE status IN ('pending','running') AND NOW() > sla_deadline;
  
  IF v_sla_violations > 0 THEN
    RETURN QUERY SELECT 'sla_violation'::TEXT, 'critical'::TEXT,
      format('%s jobs exceeded SLA', v_sla_violations),
      jsonb_build_object('count', v_sla_violations);
  END IF;
  
  SELECT COUNT(*) INTO v_stalled_jobs
  FROM ticket_generation_jobs
  WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes';
  
  IF v_stalled_jobs > 0 THEN
    RETURN QUERY SELECT 'stalled_jobs'::TEXT, 'warning'::TEXT,
      format('%s jobs stalled >30min', v_stalled_jobs),
      jsonb_build_object('count', v_stalled_jobs);
  END IF;
  
  SELECT COUNT(*) INTO v_failed_jobs
  FROM ticket_generation_jobs
  WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour';
  
  IF v_failed_jobs >= 3 THEN
    RETURN QUERY SELECT 'high_failure_rate'::TEXT, 'critical'::TEXT,
      format('%s jobs failed in last hour', v_failed_jobs),
      jsonb_build_object('count', v_failed_jobs);
  END IF;
  
  RETURN;
END;
$$;

-- Job health dashboard view
CREATE OR REPLACE VIEW job_health_dashboard AS
SELECT 
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'running') as running,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status IN ('pending','running') AND NOW() > sla_deadline) as sla_violations,
  SUM(generated_count) as total_tickets_generated,
  SUM(total_tickets) as total_tickets_target
FROM ticket_generation_jobs
WHERE created_at > NOW() - INTERVAL '24 hours';