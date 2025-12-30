-- Rollback Migration: Add contract workflow fields
-- Description: Revertir cambios de flujo automatizado de contratos
-- Date: 2024-12-30
-- IMPORTANTE: Ejecutar solo si necesitas revertir la migración 20251230000001

-- =====================================================
-- 1. Eliminar campos de platform_config
-- =====================================================

ALTER TABLE platform_config
DROP COLUMN IF EXISTS auto_generate_contract;

ALTER TABLE platform_config
DROP COLUMN IF EXISTS require_contract_before_event;

-- =====================================================
-- 2. Eliminar referencia de contrato en eventos
-- =====================================================

-- Eliminar índice
DROP INDEX IF EXISTS idx_studio_events_contract_id;

-- Eliminar foreign key constraint
ALTER TABLE studio_events
DROP CONSTRAINT IF EXISTS fk_studio_events_contract;

-- Eliminar columna
ALTER TABLE studio_events
DROP COLUMN IF EXISTS contract_id;

-- =====================================================
-- 3. Eliminar campos de confirmación en contactos
-- =====================================================

ALTER TABLE studio_contacts
DROP COLUMN IF EXISTS data_confirmed_at;

ALTER TABLE studio_contacts
DROP COLUMN IF EXISTS data_confirmed_ip;

-- =====================================================
-- 4. Eliminar campo de IP de firma en contratos
-- =====================================================

ALTER TABLE studio_event_contracts
DROP COLUMN IF EXISTS signed_ip;

-- =====================================================
-- NOTA: No se pueden eliminar valores de ENUM una vez agregados
-- =====================================================
-- Los nuevos estados de cotización (CONTRACT_PENDING, CONTRACT_GENERATED, CONTRACT_SIGNED)
-- NO se pueden eliminar del tipo enum 'cotizacion_status' sin recrear el tipo completo.
-- Si necesitas eliminarlos, deberás:
-- 1. Crear un nuevo tipo enum sin esos valores
-- 2. Migrar todas las columnas que usan el tipo
-- 3. Eliminar el tipo antiguo
-- 4. Renombrar el nuevo tipo
-- 
-- Esto es complejo y puede causar problemas. Se recomienda dejar los valores en el enum
-- aunque no se usen, ya que no causan problemas de performance.

-- Si realmente necesitas eliminar los valores del enum, ejecuta este bloque:
-- ADVERTENCIA: Esto requiere que NO haya registros usando estos estados

/*
DO $$ 
DECLARE
    has_records BOOLEAN;
BEGIN
    -- Verificar si hay registros con los nuevos estados
    SELECT EXISTS (
        SELECT 1 FROM studio_cotizaciones 
        WHERE status IN ('CONTRACT_PENDING', 'CONTRACT_GENERATED', 'CONTRACT_SIGNED')
    ) INTO has_records;

    IF has_records THEN
        RAISE EXCEPTION 'No se pueden eliminar los estados del enum porque hay registros usándolos. Actualiza primero esos registros.';
    END IF;

    -- Si no hay registros, proceder con la recreación del enum
    -- (Este proceso es complejo y se omite aquí por seguridad)
    RAISE NOTICE 'Para eliminar los valores del enum, contacta al DBA para realizar la migración manual.';
END $$;
*/

