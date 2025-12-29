-- Agregar campo data_retention_until para tracking de retención de datos (30 días)
-- Fecha: 2025-12-29

ALTER TABLE "studios"
ADD COLUMN IF NOT EXISTS "data_retention_until" TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN "studios"."data_retention_until" IS 'Fecha hasta la cual se mantendrán los datos del studio después de cancelación (30 días después de subscription_end)';

-- Índice para búsquedas eficientes de studios que necesitan limpieza
CREATE INDEX IF NOT EXISTS "studios_data_retention_until_idx" ON "studios"("data_retention_until")
WHERE "data_retention_until" IS NOT NULL;

