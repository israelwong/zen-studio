-- Migración: Agregar campos de Google Calendar para sincronización
-- Fecha: 2025-02-04
-- Descripción: Agrega campos necesarios para sincronización con Google Calendar

-- 1. Agregar google_calendar_secondary_id y timezone a studios
ALTER TABLE "studios"
ADD COLUMN IF NOT EXISTS "google_calendar_secondary_id" TEXT,
ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'America/Mexico_City';

-- 2. Agregar google_event_id a studio_events (eventos principales)
ALTER TABLE "studio_eventos"
ADD COLUMN IF NOT EXISTS "google_event_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_studio_events_google_event_id"
ON "studio_eventos"("google_event_id");

-- 3. Agregar campos de Google Calendar a studio_scheduler_event_tasks (tareas de cronograma)
ALTER TABLE "studio_scheduler_event_tasks"
ADD COLUMN IF NOT EXISTS "google_calendar_id" TEXT,
ADD COLUMN IF NOT EXISTS "google_event_id" TEXT;

CREATE INDEX IF NOT EXISTS "idx_scheduler_tasks_google_calendar_id"
ON "studio_scheduler_event_tasks"("google_calendar_id");

CREATE INDEX IF NOT EXISTS "idx_scheduler_tasks_google_event_id"
ON "studio_scheduler_event_tasks"("google_event_id");

-- Comentarios para documentación
COMMENT ON COLUMN "studios"."google_calendar_secondary_id" IS 'ID del calendario secundario "Tareas De Sen" en Google Calendar';
COMMENT ON COLUMN "studios"."timezone" IS 'Timezone del estudio (default: America/Mexico_City)';
COMMENT ON COLUMN "studio_eventos"."google_event_id" IS 'ID del evento en Google Calendar (calendario primario)';
COMMENT ON COLUMN "studio_scheduler_event_tasks"."google_calendar_id" IS 'ID del calendario secundario donde se creó el evento';
COMMENT ON COLUMN "studio_scheduler_event_tasks"."google_event_id" IS 'ID del evento de tarea en Google Calendar';

