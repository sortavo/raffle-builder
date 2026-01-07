-- ============================================
-- MIGRACIÓN FINAL: CORRECCIÓN + PROTECCIÓN 100%
-- ============================================

-- FIX 1: CORREGIR JOBS CON current_batch CORRUPTO
UPDATE ticket_generation_jobs
SET 
  current_batch = FLOOR(generated_count::NUMERIC / COALESCE(batch_size, 5000)),
  status = CASE 
    WHEN generated_count >= total_tickets THEN 'completed'
    WHEN status = 'running' AND started_at < NOW() - INTERVAL '15 minutes' THEN 'pending'
    WHEN status = 'running' AND (current_batch * COALESCE(batch_size, 5000)) > total_tickets THEN 'pending'
    ELSE status
  END,
  completed_at = CASE 
    WHEN generated_count >= total_tickets AND completed_at IS NULL THEN NOW()
    ELSE completed_at
  END,
  started_at = CASE
    WHEN status = 'running' AND (
      started_at < NOW() - INTERVAL '15 minutes' OR
      (current_batch * COALESCE(batch_size, 5000)) > total_tickets
    ) THEN NULL
    ELSE started_at
  END
WHERE 
  (current_batch * COALESCE(batch_size, 5000)) > total_tickets
  OR (status = 'running' AND started_at < NOW() - INTERVAL '15 minutes')
  OR (generated_count >= total_tickets AND status != 'completed');

-- FIX 2: CONSTRAINT PARA PREVENIR CORRUPCIÓN FUTURA
ALTER TABLE ticket_generation_jobs 
DROP CONSTRAINT IF EXISTS check_current_batch_valid;

ALTER TABLE ticket_generation_jobs 
ADD CONSTRAINT check_current_batch_valid 
CHECK (
  current_batch >= 0 AND 
  (current_batch * COALESCE(batch_size, 5000)) <= (total_tickets + COALESCE(batch_size, 5000))
);

-- FIX 3: FUNCIÓN HELPER DE VALIDACIÓN
CREATE OR REPLACE FUNCTION validate_and_fix_job_batch(p_job_id UUID)
RETURNS TABLE(
  job_id UUID,
  was_corrupted BOOLEAN,
  old_batch INTEGER,
  new_batch INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_corrected_batch INTEGER;
  v_was_corrupted BOOLEAN := false;
BEGIN
  SELECT * INTO v_job FROM ticket_generation_jobs WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;
  
  v_corrected_batch := FLOOR(v_job.generated_count::NUMERIC / COALESCE(v_job.batch_size, 5000));
  
  IF v_job.current_batch != v_corrected_batch THEN
    v_was_corrupted := true;
    
    UPDATE ticket_generation_jobs
    SET 
      current_batch = v_corrected_batch,
      status = CASE 
        WHEN generated_count >= total_tickets THEN 'completed'
        WHEN status = 'running' THEN 'pending'
        ELSE status
      END
    WHERE id = p_job_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    p_job_id,
    v_was_corrupted,
    v_job.current_batch,
    v_corrected_batch,
    CASE 
      WHEN v_job.generated_count >= v_job.total_tickets THEN 'completed'
      ELSE 'corrected'
    END::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_and_fix_job_batch(UUID) TO authenticated;