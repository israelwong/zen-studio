-- Agregar campo de preferencia por defecto en studios
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS promise_share_default_auto_generate_contract BOOLEAN DEFAULT false;

-- Agregar campo de override opcional en studio_promises
ALTER TABLE studio_promises
ADD COLUMN IF NOT EXISTS share_auto_generate_contract BOOLEAN;

-- Actualizar valores existentes en studios
UPDATE studios
SET promise_share_default_auto_generate_contract = false
WHERE promise_share_default_auto_generate_contract IS NULL;

-- Comentarios para documentación
COMMENT ON COLUMN studios.promise_share_default_auto_generate_contract IS 'Si está activado, el contrato se genera automáticamente cuando el prospecto autoriza una cotización desde la página pública';
COMMENT ON COLUMN studio_promises.share_auto_generate_contract IS 'Override opcional de la preferencia por defecto del studio para esta promesa específica';

