-- ============================================
-- APLICAR MIGRATIONS MANUALMENTE
-- ============================================
-- Ejecutar este SQL en Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Pegar y Run

-- ============================================
-- 1. SYNC AUTH → STUDIO_USER_PROFILES
-- ============================================

-- Función que sincroniza auth.users → studio_user_profiles
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_full_name TEXT;
  user_role TEXT;
  user_studio_slug TEXT;
BEGIN
  -- Extraer datos de user_metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'suscriptor');
  user_studio_slug := NEW.raw_user_meta_data->>'studio_slug';

  -- Insertar o actualizar perfil
  INSERT INTO studio_user_profiles (
    id,
    email,
    supabase_id,
    full_name,
    role,
    studio_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    NEW.email,
    NEW.id::text,
    user_full_name,
    CASE 
      WHEN user_role = 'super_admin' THEN 'SUPER_ADMIN'::text
      WHEN user_role = 'agente' THEN 'AGENTE'::text
      ELSE 'SUSCRIPTOR'::text
    END,
    (SELECT id FROM studios WHERE slug = user_studio_slug LIMIT 1),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (supabase_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    studio_id = EXCLUDED.studio_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Trigger en auth.users (si tienes permisos)
-- NOTA: En Supabase Cloud puede requerir configurarse desde el Dashboard
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();

-- Migrar usuarios existentes que no tienen supabase_id
UPDATE studio_user_profiles sup
SET supabase_id = au.id::text,
    updated_at = NOW()
FROM auth.users au
WHERE sup.email = au.email
  AND sup.supabase_id IS NULL;

COMMENT ON FUNCTION sync_auth_user_to_profile() IS 
  'Sincroniza automáticamente usuarios de auth.users a studio_user_profiles al crear/actualizar';

-- ============================================
-- 2. RLS EN STUDIO_USER_PROFILES
-- ============================================

-- Habilitar RLS
ALTER TABLE studio_user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden leer su propio perfil
DROP POLICY IF EXISTS "studio_user_profiles_read_own" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_read_own" ON studio_user_profiles
FOR SELECT TO authenticated
USING (
  supabase_id = auth.uid()::text
);

-- Política: Usuarios pueden leer perfiles del mismo studio
DROP POLICY IF EXISTS "studio_user_profiles_read_studio" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_read_studio" ON studio_user_profiles
FOR SELECT TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "studio_user_profiles_update_own" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_update_own" ON studio_user_profiles
FOR UPDATE TO authenticated
USING (supabase_id = auth.uid()::text)
WITH CHECK (supabase_id = auth.uid()::text);

COMMENT ON TABLE studio_user_profiles IS 
  'Perfiles de usuarios con RLS habilitado - sincronizado con auth.users';

-- ============================================
-- 3. ÍNDICES OPTIMIZADOS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_supabase_id_active 
ON studio_user_profiles(supabase_id, is_active) 
WHERE is_active = true AND supabase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_email_active 
ON studio_user_profiles(email, is_active) 
WHERE is_active = true;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver usuarios con y sin supabase_id
SELECT 
  email,
  supabase_id,
  CASE 
    WHEN supabase_id IS NOT NULL THEN '✅'
    ELSE '❌'
  END as status
FROM studio_user_profiles
ORDER BY email;

-- Ver políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'studio_user_profiles'
ORDER BY policyname;

-- ============================================
-- FIX TRIGGERS DEPRECADOS (realtime.send)
-- ============================================

-- Eliminar triggers viejos que usan realtime.send()
DROP TRIGGER IF EXISTS notify_agenda_changes ON studio_agenda;
DROP FUNCTION IF EXISTS notify_agenda_changes();

DROP TRIGGER IF EXISTS notify_studio_agenda_changes ON studio_agenda;
DROP FUNCTION IF EXISTS notify_studio_agenda_changes();

-- Crear trigger actualizado con realtime.broadcast_changes()
CREATE OR REPLACE FUNCTION studio_agenda_realtime_trigger()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  studio_slug_var TEXT;
BEGIN
  -- Obtener slug del studio
  SELECT slug INTO studio_slug_var
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug_var IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Broadcast al canal del studio
  PERFORM realtime.broadcast_changes(
    'studio:' || studio_slug_var || ':agenda',
    TG_OP,
    TG_OP,
    'studio_agenda',
    'public',
    NEW,
    OLD
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS studio_agenda_realtime_trigger ON studio_agenda;
CREATE TRIGGER studio_agenda_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_agenda
  FOR EACH ROW EXECUTE FUNCTION studio_agenda_realtime_trigger();

COMMENT ON FUNCTION studio_agenda_realtime_trigger() IS 
  'Trigger Realtime actualizado para studio_agenda usando broadcast_changes()';

-- ============================================
-- FIN
-- ============================================

-- Si todo está OK, deberías ver:
-- ✅ Función sync_auth_user_to_profile creada
-- ✅ Trigger on_auth_user_created_or_updated creado
-- ✅ Usuarios existentes migrados con supabase_id
-- ✅ 3 políticas RLS activas
-- ✅ 2 índices creados
-- ✅ Trigger studio_agenda actualizado (fix realtime.send)

