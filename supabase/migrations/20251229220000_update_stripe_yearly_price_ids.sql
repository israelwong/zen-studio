-- Migration: Update Stripe Yearly Price IDs and Annual Prices
-- Date: 2025-12-29
-- Description: Actualiza los Price IDs anuales de Stripe y calcula precios anuales (mensual * 10)
-- 
-- IMPORTANTE: Reemplaza los price_ids con los que creaste en Stripe Dashboard
-- 
-- Fórmula: price_yearly = price_monthly * 10 (2 meses gratis = ~16.67% descuento)

-- Actualizar Starter (basic) - Reemplaza 'price_xxx_yearly' con el price_id real
UPDATE platform_plans
SET
  stripe_price_id_yearly = 'price_xxx_yearly_starter', -- ⚠️ REEMPLAZAR con price_id real
  price_yearly = price_monthly * 10, -- 299 * 10 = 2990
  updated_at = NOW()
WHERE slug = 'basic';

-- Actualizar Pro (pro) - Reemplaza 'price_xxx_yearly' con el price_id real
UPDATE platform_plans
SET
  stripe_price_id_yearly = 'price_xxx_yearly_pro', -- ⚠️ REEMPLAZAR con price_id real
  price_yearly = price_monthly * 10, -- 599 * 10 = 5990
  updated_at = NOW()
WHERE slug = 'pro';

-- Actualizar Premium (enterprise) - Reemplaza 'price_xxx_yearly' con el price_id real
UPDATE platform_plans
SET
  stripe_price_id_yearly = 'price_xxx_yearly_premium', -- ⚠️ REEMPLAZAR con price_id real
  price_yearly = price_monthly * 10, -- 999 * 10 = 9990
  updated_at = NOW()
WHERE slug = 'enterprise';

-- Verificar actualización
SELECT 
  slug,
  name,
  price_monthly,
  price_yearly,
  stripe_price_id as price_id_monthly,
  stripe_price_id_yearly as price_id_yearly,
  ROUND((price_yearly / (price_monthly * 12)) * 100, 2) as discount_percentage
FROM platform_plans
WHERE active = true
ORDER BY "order" ASC;

