-- Agregar campo consolidated_payment_id para relacionar nóminas individuales con pagos consolidados
ALTER TABLE studio_nominas
ADD COLUMN IF NOT EXISTS consolidated_payment_id TEXT;

-- Agregar índice para mejorar las consultas de agrupación
CREATE INDEX IF NOT EXISTS idx_studio_nominas_consolidated_payment_id 
ON studio_nominas(consolidated_payment_id) 
WHERE consolidated_payment_id IS NOT NULL;

-- Comentario en la columna
COMMENT ON COLUMN studio_nominas.consolidated_payment_id IS 'ID de la nómina consolidada si esta nómina fue parte de un pago consolidado';
