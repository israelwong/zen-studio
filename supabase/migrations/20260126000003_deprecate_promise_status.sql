-- Migration: Deprecate and prepare removal of status field from studio_promises
-- Date: 2026-01-26
-- Description: 
--   This migration marks the status field as deprecated and prepares for its removal.
--   The status field is being replaced by pipeline_stage_id which is the single source of truth.
--   
--   IMPORTANT: This migration does NOT remove the field yet. It only:
--   1. Adds a comment marking it as deprecated
--   2. Removes the index on [studio_id, status] (no longer needed)
--
--   The actual field removal will be done in a future migration after verifying
--   that all code has been migrated to use pipeline_stage_id.

-- =============================================================================
-- 1. REMOVE INDEX (no longer needed, we use pipeline_stage_id index)
-- =============================================================================

DROP INDEX IF EXISTS "studio_promises_studio_id_status_idx";

-- =============================================================================
-- 2. ADD DEPRECATION COMMENT
-- =============================================================================

COMMENT ON COLUMN "studio_promises"."status" IS 'DEPRECATED: Usar pipeline_stage_id. Este campo será eliminado en futuras versiones. No escribir nuevos valores.';

-- =============================================================================
-- 3. VERIFICATION QUERY (for manual check)
-- =============================================================================

-- Run this query to verify all promises have pipeline_stage_id:
-- SELECT 
--   COUNT(*) as total_promises,
--   COUNT(pipeline_stage_id) as promises_with_stage,
--   COUNT(*) - COUNT(pipeline_stage_id) as promises_without_stage
-- FROM studio_promises;

-- =============================================================================
-- NOTES FOR FUTURE MIGRATION (when removing the field):
-- =============================================================================
-- 
-- When ready to remove the field completely, create a new migration with:
--
-- ALTER TABLE "studio_promises" DROP COLUMN IF EXISTS "status";
--
-- Before running that migration, ensure:
-- 1. All code has been migrated to use pipeline_stage_id
-- 2. All promises have a valid pipeline_stage_id
-- 3. No queries still reference the status field
-- 4. The field is no longer in Prisma schema
