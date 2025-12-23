-- ============================================
-- CREAR MODELO: studio_client_notifications
-- ============================================
-- Sistema de notificaciones para clientes (studio_contacts) del portal de cliente
-- Similar a studio_notifications pero específico para clientes

-- ============================================
-- ENUM: ClientNotificationType
-- ============================================
CREATE TYPE "ClientNotificationType" AS ENUM (
  'DELIVERABLE_ADDED',
  'DELIVERABLE_UPDATED',
  'DELIVERABLE_DELETED',
  'PAYMENT_RECEIVED',
  'PAYMENT_CANCELLED',
  'CONTRACT_AVAILABLE',
  'EVENT_STAGE_CHANGED'
);

-- ============================================
-- TABLA: studio_client_notifications
-- ============================================
CREATE TABLE IF NOT EXISTS "studio_client_notifications" (
  "id" TEXT NOT NULL,
  "contact_id" TEXT NOT NULL,
  "studio_id" TEXT NOT NULL,
  "type" "ClientNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
  "route" TEXT,
  "route_params" JSONB,
  "clicked_at" TIMESTAMP(3),
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "metadata" JSONB,
  "promise_id" TEXT,
  "event_id" TEXT,
  "payment_id" TEXT,
  "quote_id" TEXT,
  "deliverable_id" TEXT,
  "contract_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "studio_client_notifications_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX "studio_client_notifications_contact_id_is_read_created_at_idx" 
  ON "studio_client_notifications"("contact_id", "is_read", "created_at");

CREATE INDEX "studio_client_notifications_contact_id_is_active_created_at_idx" 
  ON "studio_client_notifications"("contact_id", "is_active", "created_at");

CREATE INDEX "studio_client_notifications_studio_id_contact_id_is_read_idx" 
  ON "studio_client_notifications"("studio_id", "contact_id", "is_read");

CREATE INDEX "studio_client_notifications_type_category_idx" 
  ON "studio_client_notifications"("type", "category");

CREATE INDEX "studio_client_notifications_created_at_idx" 
  ON "studio_client_notifications"("created_at");

CREATE INDEX "studio_client_notifications_expires_at_idx" 
  ON "studio_client_notifications"("expires_at");

CREATE INDEX "studio_client_notifications_event_id_idx" 
  ON "studio_client_notifications"("event_id");

CREATE INDEX "studio_client_notifications_payment_id_idx" 
  ON "studio_client_notifications"("payment_id");

CREATE INDEX "studio_client_notifications_deliverable_id_idx" 
  ON "studio_client_notifications"("deliverable_id");

-- ============================================
-- FOREIGN KEYS
-- ============================================
ALTER TABLE "studio_client_notifications" 
  ADD CONSTRAINT "studio_client_notifications_contact_id_fkey" 
  FOREIGN KEY ("contact_id") 
  REFERENCES "studio_contacts"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE "studio_client_notifications" 
  ADD CONSTRAINT "studio_client_notifications_studio_id_fkey" 
  FOREIGN KEY ("studio_id") 
  REFERENCES "studios"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE "studio_client_notifications" 
  ADD CONSTRAINT "studio_client_notifications_promise_id_fkey" 
  FOREIGN KEY ("promise_id") 
  REFERENCES "studio_promises"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

ALTER TABLE "studio_client_notifications" 
  ADD CONSTRAINT "studio_client_notifications_event_id_fkey" 
  FOREIGN KEY ("event_id") 
  REFERENCES "studio_eventos"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

ALTER TABLE "studio_client_notifications" 
  ADD CONSTRAINT "studio_client_notifications_payment_id_fkey" 
  FOREIGN KEY ("payment_id") 
  REFERENCES "studio_pagos"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- ============================================
-- TRIGGER: Realtime Broadcast
-- ============================================
-- Trigger para emitir eventos Realtime cuando se crean, actualizan o eliminan notificaciones
-- Usa realtime.send para permitir canales públicos y evitar problemas de auth.uid() NULL

CREATE OR REPLACE FUNCTION studio_client_notifications_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  contact_id_val TEXT;
  payload JSONB;
BEGIN
  -- Obtener studio_slug y contact_id
  SELECT s.slug, COALESCE(NEW.contact_id, OLD.contact_id) INTO studio_slug, contact_id_val
  FROM public.studios s
  WHERE s.id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug IS NULL OR contact_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_client_notifications',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  -- Canal específico por contacto: client:{studioSlug}:{contactId}:notifications
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'client:' || studio_slug || ':' || contact_id_val || ':notifications',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Asegurar que el trigger existe
DROP TRIGGER IF EXISTS studio_client_notifications_realtime_trigger ON studio_client_notifications;
CREATE TRIGGER studio_client_notifications_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_client_notifications
  FOR EACH ROW EXECUTE FUNCTION studio_client_notifications_broadcast_trigger();

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE "studio_client_notifications" IS 
  'Notificaciones para clientes (studio_contacts) del portal de cliente. Similar a studio_notifications pero específico para clientes.';

COMMENT ON TYPE "ClientNotificationType" IS 
  'Tipos de notificaciones para clientes: entregables, pagos, contratos, cambios de etapa.';

COMMENT ON FUNCTION studio_client_notifications_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send. Canal: client:{studioSlug}:{contactId}:notifications. Solución robusta que evita problemas de auth.uid() NULL.';

