-- Remover constraint único problemático de studio_nomina_servicios
-- Esto permite que múltiples servicios con el mismo quote_service_id
-- puedan ser consolidados en una misma nómina

-- Primero verificar si el constraint existe antes de eliminarlo
DO $$
BEGIN
    -- Intentar eliminar el constraint único si existe
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'studio_nomina_servicios_payroll_id_quote_service_id_key'
    ) THEN
        ALTER TABLE studio_nomina_servicios 
        DROP CONSTRAINT studio_nomina_servicios_payroll_id_quote_service_id_key;
        
        RAISE NOTICE 'Constraint único removido exitosamente';
    ELSE
        RAISE NOTICE 'Constraint único no existe, no se requiere acción';
    END IF;
END $$;

-- Agregar índice para mejorar búsquedas por payroll_id y quote_service_id
-- (sin constraint único)
CREATE INDEX IF NOT EXISTS idx_nomina_servicios_payroll_quote 
ON studio_nomina_servicios(payroll_id, quote_service_id)
WHERE quote_service_id IS NOT NULL;

