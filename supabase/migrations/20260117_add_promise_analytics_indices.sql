-- ============================================
-- MIGRACIÓN: Índices específicos para Analytics de Promesas
-- Fecha: 2025-01-17
-- Descripción: Crear índices con WHERE para optimizar consultas específicas
-- NOTA: Esta migración debe ejecutarse DESPUÉS de 20260117_add_promise_analytics.sql
-- ============================================

-- Índices específicos para promesas (requieren que los valores del enum ya estén commitados)
-- ============================================

-- Índice para visitas a promesas
CREATE INDEX IF NOT EXISTS "studio_content_analytics_promise_views_idx" 
ON "studio_content_analytics"("studio_id", "content_type", "content_id", "event_type", "created_at")
WHERE "content_type" = 'PROMISE' AND "event_type" = 'PAGE_VIEW';

-- Índice para clicks en cotizaciones
CREATE INDEX IF NOT EXISTS "studio_content_analytics_cotizacion_clicks_idx" 
ON "studio_content_analytics"("studio_id", "content_type", "content_id", "event_type", "created_at")
WHERE "event_type" = 'COTIZACION_CLICK';

-- Índice para clicks en paquetes
CREATE INDEX IF NOT EXISTS "studio_content_analytics_paquete_clicks_idx" 
ON "studio_content_analytics"("studio_id", "content_type", "content_id", "event_type", "created_at")
WHERE "event_type" = 'PAQUETE_CLICK';

-- Índice para consultas de visitas únicas por IP en promesas
CREATE INDEX IF NOT EXISTS "studio_content_analytics_promise_ip_idx" 
ON "studio_content_analytics"("content_id", "ip_address", "created_at")
WHERE "content_type" = 'PROMISE' AND "event_type" = 'PAGE_VIEW';
