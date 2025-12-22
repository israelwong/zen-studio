-- Manual migration: Add Google integrations (Drive + Calendar)
-- Agrega campos necesarios para integración con Google Drive API y Google Calendar API
-- Fecha: 2025-01-XX
--
-- ARQUITECTURA:
-- - platform_config: Credenciales OAuth compartidas (CLIENT_ID, CLIENT_SECRET, API_KEY)
-- - studios: Tokens específicos de cada estudio (refresh_token, email, is_google_connected)
-- - studio_event_deliverables: Configuración de entregables con Google Drive
-- - studio_agenda: Sincronización con Google Calendar (google_event_id)

-- ============================================
-- PARTE 1: Campos en tabla platform_config (Credenciales OAuth compartidas)
-- ============================================

-- Agregar campos de Google OAuth a nivel plataforma (genérico, reutilizable para todas las APIs)
ALTER TABLE "platform_config" 
ADD COLUMN IF NOT EXISTS "google_oauth_client_id" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_client_secret" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_redirect_uri" TEXT;

-- API Keys específicas por servicio (agregar solo las necesarias)
ALTER TABLE "platform_config"
ADD COLUMN IF NOT EXISTS "google_drive_api_key" TEXT;
-- Futuro: google_gmail_api_key, google_calendar_api_key, etc.

-- Comentarios para documentación
COMMENT ON COLUMN "platform_config"."google_oauth_client_id" IS 'Client ID de Google OAuth2 (genérico, reutilizable para Drive, Gmail, Calendar, etc.)';
COMMENT ON COLUMN "platform_config"."google_oauth_client_secret" IS 'Client Secret de Google OAuth2 (compartido, debe estar encriptado)';
COMMENT ON COLUMN "platform_config"."google_oauth_redirect_uri" IS 'URI de redirección para OAuth2 callback (compartido)';
COMMENT ON COLUMN "platform_config"."google_drive_api_key" IS 'API Key específica para Google Drive/Picker API';

-- ============================================
-- PARTE 2: Campos en tabla studios (Tokens específicos por estudio)
-- ============================================

-- Agregar campos de Google OAuth al modelo studios (genérico, puede tener múltiples scopes)
ALTER TABLE "studios" 
ADD COLUMN IF NOT EXISTS "google_oauth_refresh_token" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_email" TEXT,
ADD COLUMN IF NOT EXISTS "google_oauth_scopes" TEXT,
ADD COLUMN IF NOT EXISTS "is_google_connected" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "google_integrations_config" JSONB;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "studios_is_google_connected_idx" 
ON "studios"("is_google_connected");

-- Comentarios para documentación
COMMENT ON COLUMN "studios"."google_oauth_refresh_token" IS 'Token de refresh de Google OAuth2 (encriptado, genérico para todas las APIs)';
COMMENT ON COLUMN "studios"."google_oauth_email" IS 'Email de la cuenta de Google vinculada';
COMMENT ON COLUMN "studios"."google_oauth_scopes" IS 'Scopes autorizados (JSON array): ["drive.readonly", "gmail.send", etc.]';
COMMENT ON COLUMN "studios"."is_google_connected" IS 'Indica si el estudio tiene Google conectado (cualquier servicio)';
COMMENT ON COLUMN "studios"."google_integrations_config" IS 'Configuración por servicio (JSONB): { drive: { enabled: true }, gmail: { enabled: false } }';

-- ============================================
-- PARTE 3: Campo en studio_agenda (Google Calendar sync)
-- ============================================

-- Agregar campo para sincronización con Google Calendar
ALTER TABLE "studio_agenda"
ADD COLUMN IF NOT EXISTS "google_event_id" TEXT;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS "studio_agenda_google_event_id_idx" 
ON "studio_agenda"("google_event_id");

-- Comentario para documentación
COMMENT ON COLUMN "studio_agenda"."google_event_id" IS 'ID del evento en Google Calendar (para sincronización bidireccional)';

-- ============================================
-- PARTE 4: Enum y campos en studio_event_deliverables
-- ============================================

-- Crear enum para modo de entrega (si no existe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryMode') THEN
        CREATE TYPE "DeliveryMode" AS ENUM ('native', 'google_drive');
    END IF;
END $$;

-- Agregar campos a entregables
ALTER TABLE "studio_event_deliverables"
ADD COLUMN IF NOT EXISTS "google_folder_id" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_mode" "DeliveryMode" DEFAULT 'native',
ADD COLUMN IF NOT EXISTS "drive_metadata_cache" JSONB;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS "studio_event_deliverables_google_folder_id_idx" 
ON "studio_event_deliverables"("google_folder_id");

CREATE INDEX IF NOT EXISTS "studio_event_deliverables_delivery_mode_idx" 
ON "studio_event_deliverables"("delivery_mode");

-- Comentarios para documentación
COMMENT ON COLUMN "studio_event_deliverables"."google_folder_id" IS 'ID de la carpeta de Google Drive vinculada';
COMMENT ON COLUMN "studio_event_deliverables"."delivery_mode" IS 'Modo de entrega: native (URL manual) | google_drive (carpeta de Drive)';
COMMENT ON COLUMN "studio_event_deliverables"."drive_metadata_cache" IS 'Cache de metadata de archivos de Drive (JSONB)';

-- ============================================
-- PARTE 5: Actualizar registros existentes
-- ============================================

-- Asegurar que todos los entregables existentes tengan delivery_mode = 'native'
UPDATE "studio_event_deliverables"
SET "delivery_mode" = 'native'
WHERE "delivery_mode" IS NULL;

-- Asegurar que is_google_connected sea false por defecto en estudios existentes
UPDATE "studios"
SET "is_google_connected" = false
WHERE "is_google_connected" IS NULL;

