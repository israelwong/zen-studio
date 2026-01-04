-- Migration: Add contract_signed_at to studio_cotizaciones_cierre
-- Description: Agrega campo para guardar la fecha de firma del contrato en el proceso de cierre
-- Date: 2025-02-07

-- Agregar campo contract_signed_at
ALTER TABLE public.studio_cotizaciones_cierre
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.studio_cotizaciones_cierre.contract_signed_at IS 
'Fecha y hora en que el cliente firmó el contrato desde la página pública';

