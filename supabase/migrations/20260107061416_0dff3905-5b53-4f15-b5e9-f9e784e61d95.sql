-- ============================================
-- CORRECCIÓN DEFINITIVA DE JOBS CORRUPTOS
-- ============================================

-- Corregir TODOS los jobs con current_batch incorrecto
UPDATE ticket_generation_jobs
SET 
  current_batch = FLOOR(generated_count::NUMERIC / COALESCE(batch_size, 5000)),
  -- Si está running pero corrupto, pausar para re-procesar
  status = CASE 
    WHEN status = 'running' THEN 'pending'
    WHEN status = 'failed' THEN 'pending'
    ELSE status
  END,
  -- Limpiar started_at para jobs reseteados
  started_at = CASE 
    WHEN status IN ('running', 'failed') THEN NULL
    ELSE started_at
  END,
  -- Limpiar error para reintentar
  error_message = CASE 
    WHEN status = 'failed' THEN NULL
    ELSE error_message
  END
WHERE 
  current_batch != FLOOR(generated_count::NUMERIC / COALESCE(batch_size, 5000))
  OR status = 'failed';