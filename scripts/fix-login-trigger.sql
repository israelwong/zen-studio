-- ============================================
-- FIX LOGIN - Desactivar trigger problemático
-- ============================================
--
-- El trigger sync_auth_user_to_profile está causando
-- "Database error granting user" en login.
--
-- SOLUCIÓN: Cambiar trigger a BEFORE INSERT solamente
-- y NO ejecutar en UPDATE (que se dispara en login)

-- 1. Eliminar trigger viejo
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;

-- 2. Recrear función con mejor manejo de errores
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_full_name TEXT;
  user_role TEXT;
  user_studio_slug TEXT;
  target_studio_id TEXT;
BEGIN
  -- Solo ejecutar en INSERT (nuevo usuario)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'suscriptor');
  user_studio_slug := NEW.raw_user_meta_data->>'studio_slug';

  -- Buscar studio_id si hay slug
  IF user_studio_slug IS NOT NULL THEN
    SELECT id INTO target_studio_id
    FROM studios
    WHERE slug = user_studio_slug
    LIMIT 1;
  END IF;

  -- Insertar o actualizar profile
  INSERT INTO studio_user_profiles (
    id, email, supabase_id, full_name, role, studio_id, is_active, created_at, updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    NEW.email,
    NEW.id::text,
    user_full_name,
    CASE 
      WHEN user_role = 'super_admin' THEN 'SUPER_ADMIN'::"UserRole"
      WHEN user_role = 'agente' THEN 'AGENTE'::"UserRole"
      ELSE 'SUSCRIPTOR'::"UserRole"
    END,
    target_studio_id,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (supabase_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    studio_id = COALESCE(EXCLUDED.studio_id, studio_user_profiles.studio_id),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero NO bloquear el login
    RAISE WARNING 'Error en sync_auth_user_to_profile: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- 3. Crear trigger SOLO para INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Sincroniza nuevos usuarios de auth.users a studio_user_profiles (solo INSERT)';

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

