-- Migration: Add billing_type to studio_cotizacion_items
-- Description: Agregar campo billing_type para soportar cálculo dinámico en cotizaciones
-- Date: 2026-01-27
-- Branch: 260119-studio-dyamic_billing

-- ============================================
-- AGREGAR billing_type A studio_cotizacion_items
-- ============================================
ALTER TABLE public.studio_cotizacion_items
ADD COLUMN IF NOT EXISTS billing_type "BillingType";

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON COLUMN public.studio_cotizacion_items.billing_type IS 
'Tipo de facturación del ítem: HOUR (multiplica por duración), SERVICE (precio fijo), UNIT (precio por unidad). NULL para items legacy (se trata como SERVICE).';
