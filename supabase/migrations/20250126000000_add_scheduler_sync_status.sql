-- Agregar enums para sync_status e invitation_status
CREATE TYPE "SyncStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'INVITED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- Agregar columnas a studio_scheduler_event_tasks
ALTER TABLE "studio_scheduler_event_tasks"
ADD COLUMN IF NOT EXISTS "sync_status" "SyncStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS "invitation_status" "InvitationStatus";

-- Crear índices para mejorar performance de consultas
CREATE INDEX IF NOT EXISTS "studio_scheduler_event_tasks_sync_status_idx" ON "studio_scheduler_event_tasks"("sync_status");
CREATE INDEX IF NOT EXISTS "studio_scheduler_event_tasks_invitation_status_idx" ON "studio_scheduler_event_tasks"("invitation_status");

-- Actualizar tareas existentes: si tienen google_event_id, marcar como INVITED
UPDATE "studio_scheduler_event_tasks"
SET "sync_status" = 'INVITED'
WHERE "google_event_id" IS NOT NULL;

-- Si no tienen google_event_id pero están completadas o en progreso, marcar como PUBLISHED
UPDATE "studio_scheduler_event_tasks"
SET "sync_status" = 'PUBLISHED'
WHERE "google_event_id" IS NULL 
  AND ("status" = 'COMPLETED' OR "status" = 'IN_PROGRESS');

