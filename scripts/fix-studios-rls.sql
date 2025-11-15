-- ============================================
-- FIX 403 FORBIDDEN: studios table RLS
-- ============================================
-- Ejecutar en Supabase SQL Editor

-- Habilitar RLS (si no está ya)
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

-- Política de lectura: usuarios autenticados pueden leer studios
-- donde tienen un perfil activo
DROP POLICY IF EXISTS "studios_read_by_user" ON studios;
CREATE POLICY "studios_read_by_user" ON studios
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT studio_id 
    FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
      AND is_active = true
      AND studio_id IS NOT NULL
  )
);

-- Índice para optimizar queries
CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_supabase_studio
ON studio_user_profiles(supabase_id, studio_id, is_active)
WHERE is_active = true AND studio_id IS NOT NULL;

-- Verificar políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'studios';

