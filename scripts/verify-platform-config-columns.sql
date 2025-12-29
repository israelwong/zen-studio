-- Script: Verificar columnas de platform_config
-- Ejecutar en Supabase para verificar qué columnas existen

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'platform_config'
  AND table_schema = 'public'
ORDER BY ordinal_position;

