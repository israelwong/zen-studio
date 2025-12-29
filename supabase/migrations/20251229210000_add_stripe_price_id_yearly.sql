-- Migration: Add stripe_price_id_yearly to platform_plans
-- Date: 2025-12-29
-- Description: Agrega soporte para precios anuales en Stripe

-- Agregar columna stripe_price_id_yearly
ALTER TABLE "platform_plans"
ADD COLUMN IF NOT EXISTS "stripe_price_id_yearly" text;

-- Agregar constraint único
ALTER TABLE "platform_plans"
ADD CONSTRAINT "platform_plans_stripe_price_id_yearly_key" UNIQUE ("stripe_price_id_yearly");

-- Crear índice para búsquedas eficientes
CREATE INDEX IF NOT EXISTS "platform_plans_stripe_price_id_yearly_idx" 
ON "platform_plans"("stripe_price_id_yearly")
WHERE "stripe_price_id_yearly" IS NOT NULL;

-- Comentario para documentar el campo
COMMENT ON COLUMN "platform_plans"."stripe_price_id_yearly" IS 'Stripe Price ID para facturación anual. Se usa cuando el usuario selecciona el intervalo anual.';


