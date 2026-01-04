-- Migration: Add contract versioning to studio_cotizaciones_cierre
-- Description: Agrega versionado de contratos para el proceso de cierre
-- Date: 2025-02-08

-- Agregar campo contract_version a studio_cotizaciones_cierre
ALTER TABLE public.studio_cotizaciones_cierre
ADD COLUMN IF NOT EXISTS contract_version INTEGER DEFAULT 1;

-- Crear tabla para versiones de contratos de cierre
CREATE TABLE IF NOT EXISTS public.studio_cotizaciones_cierre_contract_versions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cotizacion_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  change_reason TEXT,
  change_type TEXT NOT NULL DEFAULT 'AUTO_REGENERATE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_cotizacion_cierre_version
    FOREIGN KEY (cotizacion_id)
    REFERENCES public.studio_cotizaciones_cierre(cotizacion_id)
    ON DELETE CASCADE,
  
  CONSTRAINT unique_cotizacion_cierre_version UNIQUE(cotizacion_id, version)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cierre_versions_cotizacion_id 
  ON public.studio_cotizaciones_cierre_contract_versions(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_cierre_versions_created_at 
  ON public.studio_cotizaciones_cierre_contract_versions(created_at);

-- Comentarios para documentar
COMMENT ON COLUMN public.studio_cotizaciones_cierre.contract_version IS
'Versión actual del contrato. Se incrementa cada vez que se regenera el contrato.';

COMMENT ON TABLE public.studio_cotizaciones_cierre_contract_versions IS
'Historial de versiones de contratos durante el proceso de cierre. Permite rastrear cambios cuando el cliente actualiza sus datos.';

