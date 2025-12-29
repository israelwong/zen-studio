-- Script para actualizar precios anuales y stripe_price_id_yearly
-- Uso: Ejecutar en Supabase SQL Editor después de crear los Prices anuales en Stripe
-- 
-- PASOS:
-- 1. Crear Prices anuales en Stripe Dashboard (interval: year)
-- 2. Copiar los price_ids anuales
-- 3. Reemplazar los placeholders en este script
-- 4. Ejecutar en Supabase SQL Editor

-- ⚠️ REEMPLAZAR ESTOS VALORES CON LOS PRICE_IDS REALES DE STRIPE:
-- Starter anual: price_xxx
-- Pro anual: price_xxx  
-- Premium anual: price_xxx

BEGIN;

-- Starter (basic): $299/mes → $2990/año
UPDATE platform_plans
SET
  stripe_price_id_yearly = 'REEMPLAZAR_CON_PRICE_ID_STARTER_ANUAL',
  price_yearly = price_monthly * 10,
  updated_at = NOW()
WHERE slug = 'basic';

-- Pro (pro): $599/mes → $5990/año
UPDATE platform_plans
SET
  stripe_price_id_yearly = 'REEMPLAZAR_CON_PRICE_ID_PRO_ANUAL',
  price_yearly = price_monthly * 10,
  updated_at = NOW()
WHERE slug = 'pro';

-- Premium (enterprise): $999/mes → $9990/año
UPDATE platform_plans
SET
  stripe_price_id_yearly = 'REEMPLAZAR_CON_PRICE_ID_PREMIUM_ANUAL',
  price_yearly = price_monthly * 10,
  updated_at = NOW()
WHERE slug = 'enterprise';

-- Verificar resultados
SELECT 
  slug,
  name,
  price_monthly,
  price_yearly,
  ROUND(price_yearly / price_monthly, 2) as months_included,
  ROUND((1 - (price_yearly / (price_monthly * 12))) * 100, 2) as discount_percentage,
  stripe_price_id as monthly_price_id,
  stripe_price_id_yearly as yearly_price_id
FROM platform_plans
WHERE active = true
ORDER BY "order" ASC;

COMMIT;

