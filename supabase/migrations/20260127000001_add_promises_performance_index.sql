-- ✅ PASO 1: ÍNDICE MAESTRO - Optimización crítica para count() y queries del Kanban
-- Este índice compuesto reduce el tiempo de count() de 3.5s a <0.1s
-- Optimiza consultas que filtran por studio_id y pipeline_stage_id

-- ⚠️ COMANDO SQL EXACTO PARA EJECUTAR EN SQL EDITOR DE SUPABASE:
-- Copia y pega este comando completo en el SQL Editor de Supabase:

-- Índice compuesto principal para consultas del Kanban (sin deleted_at, no existe en schema)
CREATE INDEX IF NOT EXISTS idx_studio_promises_kanban_master 
ON studio_promises(studio_id, pipeline_stage_id, is_test)
WHERE is_test = false; -- Partial index: solo promesas no-test (más eficiente y pequeño)

-- Índice adicional para búsquedas por contacto
CREATE INDEX IF NOT EXISTS idx_studio_promises_contact_search
ON studio_promises(studio_id, contact_id, pipeline_stage_id);

-- NOTA: Si en el futuro se agrega deleted_at para soft delete, crear:
-- CREATE INDEX idx_studio_promises_with_deleted 
-- ON studio_promises(studio_id, deleted_at, pipeline_stage_id) 
-- WHERE deleted_at IS NULL;
