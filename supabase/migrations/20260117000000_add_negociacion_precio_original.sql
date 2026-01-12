-- Migration: Add negociacion_precio_original field
-- Date: 2025-01-17
-- Description: Adds field to store original price before negotiation to preserve it for contracts and client presentation

-- ============================================================================
-- Add negociacion_precio_original field to studio_cotizaciones
-- ============================================================================

ALTER TABLE studio_cotizaciones
  ADD COLUMN IF NOT EXISTS negociacion_precio_original DECIMAL(10, 2) NULL;

-- Index for searching by original price
CREATE INDEX IF NOT EXISTS idx_cotizaciones_negociacion_precio_original 
  ON studio_cotizaciones(negociacion_precio_original) 
  WHERE negociacion_precio_original IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN studio_cotizaciones.negociacion_precio_original IS 
'Precio original de la cotización antes de negociar. Se usa como referencia para cálculos, contratos y presentación al cliente. El cliente pagará el precio negociado (price), pero los cálculos siempre se hacen sobre este precio original.';
