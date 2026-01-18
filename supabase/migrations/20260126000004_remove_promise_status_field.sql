-- Migration: Remove status field from studio_promises
-- Date: 2026-01-26
-- Description: 
--   Elimina físicamente el campo status de studio_promises.
--   Este campo ha sido completamente deprecado y reemplazado por pipeline_stage_id.
--   
--   IMPORTANTE: Ejecutar esta migración solo después de:
--   1. Verificar que todas las promesas tienen pipeline_stage_id válido
--   2. Confirmar que no hay queries que usen el campo status
--   3. Verificar que el código no hace referencia al campo
--   4. Probar en ambiente de desarrollo/staging primero
--
--   Query de verificación antes de ejecutar:
--   SELECT 
--     COUNT(*) as total_promises,
--     COUNT(pipeline_stage_id) as promises_with_stage,
--     COUNT(*) - COUNT(pipeline_stage_id) as promises_without_stage
--   FROM studio_promises;
--   
--   Si promises_without_stage > 0, ejecutar primero la migración de migración de datos.

-- =============================================================================
-- 1. ELIMINAR CAMPO STATUS
-- =============================================================================

ALTER TABLE "studio_promises" DROP COLUMN IF EXISTS "status";

-- =============================================================================
-- 2. VERIFICACIÓN (opcional, para confirmar que se eliminó)
-- =============================================================================

-- Verificar que el campo fue eliminado:
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'studio_promises' 
--   AND column_name = 'status';
-- 
-- Debe retornar 0 filas si se eliminó correctamente.
