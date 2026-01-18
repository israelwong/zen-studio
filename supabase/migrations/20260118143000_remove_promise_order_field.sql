-- ============================================
-- ELIMINAR CAMPO order DE studio_promises
-- ============================================
-- El campo order no se usa para ordenar promesas en el Kanban
-- El Kanban ordena por fecha (event_date → interested_dates → defined_date → updated_at)
-- Este campo fue añadido pero nunca se implementó su uso

-- Eliminar índice si existe
DROP INDEX IF EXISTS idx_promises_stage_order;

-- Eliminar columna si existe
ALTER TABLE public.studio_promises 
DROP COLUMN IF EXISTS "order";

-- Comentario
COMMENT ON TABLE public.studio_promises IS 'Las promesas se ordenan por fecha, no por campo order manual.';
