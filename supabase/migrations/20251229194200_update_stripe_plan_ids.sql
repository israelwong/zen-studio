-- Migration: Update Stripe Product IDs and Price IDs for subscription plans
-- Date: 2025-12-29
-- Description: Actualiza los Product IDs y Price IDs de Stripe para los planes de suscripción
-- 
-- Planes actualizados:
-- - Starter (basic): prod_Th9NR9W7LV3yQb / price_1Sjl51LbRD5egtvrcdmu5nWj
-- - Pro (pro): prod_Th9OnyjTk3S3O6 / price_1Sjl5RLbRD5egtvrwRPLTiGJ
-- - Premium (enterprise): prod_Th9OfNMhz3qLlG / price_1Sjl5wLbRD5egtvrrrGVy2g9

-- Actualizar Starter (basic)
UPDATE platform_plans
SET
  name = 'Starter',
  stripe_product_id = 'prod_Th9NR9W7LV3yQb',
  stripe_price_id = 'price_1Sjl51LbRD5egtvrcdmu5nWj',
  price_monthly = 299.00,
  updated_at = NOW()
WHERE slug = 'basic';

-- Actualizar Pro (pro)
UPDATE platform_plans
SET
  stripe_product_id = 'prod_Th9OnyjTk3S3O6',
  stripe_price_id = 'price_1Sjl5RLbRD5egtvrwRPLTiGJ',
  price_monthly = 599.00,
  updated_at = NOW()
WHERE slug = 'pro';

-- Actualizar Premium (enterprise)
UPDATE platform_plans
SET
  name = 'Premium',
  stripe_product_id = 'prod_Th9OfNMhz3qLlG',
  stripe_price_id = 'price_1Sjl5wLbRD5egtvrrrGVy2g9',
  price_monthly = 999.00,
  updated_at = NOW()
WHERE slug = 'enterprise';

