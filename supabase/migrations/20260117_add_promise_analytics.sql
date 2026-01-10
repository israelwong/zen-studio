-- ============================================
-- MIGRACIÓN: Sistema de Analytics para Promesas
-- Fecha: 2025-01-17
-- Descripción: Agregar tracking de visitas y clicks en promesas, cotizaciones y paquetes
-- ============================================

-- PASO 1: Agregar PROMISE al enum ContentType
-- ============================================
-- NOTA: Los nuevos valores de enum deben ser commitados antes de usarse en índices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PROMISE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ContentType')
    ) THEN
        ALTER TYPE "ContentType" ADD VALUE 'PROMISE';
    END IF;
END $$;

-- PASO 2: Agregar eventos específicos al enum AnalyticsEventType
-- ============================================
DO $$ 
BEGIN
    -- COTIZACION_CLICK
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'COTIZACION_CLICK' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AnalyticsEventType')
    ) THEN
        ALTER TYPE "AnalyticsEventType" ADD VALUE 'COTIZACION_CLICK';
    END IF;

    -- PAQUETE_CLICK
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PAQUETE_CLICK' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AnalyticsEventType')
    ) THEN
        ALTER TYPE "AnalyticsEventType" ADD VALUE 'PAQUETE_CLICK';
    END IF;
END $$;

-- PASO 3: Crear índices adicionales para optimizar consultas de analytics de promesas
-- ============================================
-- NOTA: Los índices con WHERE que usan los nuevos valores del enum se crean en una segunda migración
-- o se crean sin la condición WHERE para evitar el error de "unsafe use of new enum value"
-- Por ahora, creamos índices más generales que funcionarán para todos los tipos de contenido

-- Índice general para analytics de promesas (sin condición WHERE para evitar problema con enum)
CREATE INDEX IF NOT EXISTS "studio_content_analytics_promise_general_idx" 
ON "studio_content_analytics"("studio_id", "content_type", "content_id", "event_type", "created_at");

-- Índice para consultas por IP (útil para visitas únicas)
CREATE INDEX IF NOT EXISTS "studio_content_analytics_ip_address_idx" 
ON "studio_content_analytics"("content_id", "ip_address", "created_at");

-- NOTA: Los índices con WHERE específicos para PROMISE, COTIZACION_CLICK y PAQUETE_CLICK
-- se pueden crear después de que esta migración se ejecute exitosamente, en una migración separada
-- o se pueden crear manualmente después de aplicar esta migración.
