-- Migration: Add studio contract data fields
-- Description: Agregar campos necesarios para generar contratos legalmente válidos
-- Date: 2025-01-31

-- =====================================================
-- 1. Agregar campo representative_name
-- =====================================================

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS representative_name TEXT;

COMMENT ON COLUMN studios.representative_name IS 
'Nombre del representante legal del estudio. Requerido para generar contratos.';

-- =====================================================
-- 2. Agregar campo phone directo (simplificar de studio_phones)
-- =====================================================

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN studios.phone IS 
'Teléfono principal del estudio. Reemplaza la necesidad de studio_phones para contratos.';

-- =====================================================
-- 3. Migrar datos existentes de studio_phones a phone
-- =====================================================

-- Migrar el primer teléfono activo de cada studio al campo phone
UPDATE studios s
SET phone = (
  SELECT sp.number
  FROM studio_phones sp
  WHERE sp.studio_id = s.id
    AND sp.is_active = true
  ORDER BY sp.order ASC, sp.created_at ASC
  LIMIT 1
)
WHERE s.phone IS NULL;

-- =====================================================
-- 4. Agregar índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_studios_phone ON studios(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_studios_representative_name ON studios(representative_name) WHERE representative_name IS NOT NULL;

