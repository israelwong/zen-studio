-- ============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================
-- Este archivo contiene SOLO el SQL necesario
-- Dashboard → SQL Editor → New Query → Pegar esto → RUN

-- ============================================
-- PARTE 1: AUTH SYNC + RLS
-- ============================================

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
  -- Solo ejecutar en INSERT (nuevo usuario), NO en UPDATE (login)
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

-- Trigger SOLO para INSERT (no UPDATE que se ejecuta en login)
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();

UPDATE studio_user_profiles sup
SET supabase_id = au.id::text, updated_at = NOW()
FROM auth.users au
WHERE sup.email = au.email AND sup.supabase_id IS NULL;

ALTER TABLE studio_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_user_profiles_read_own" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_read_own" ON studio_user_profiles
FOR SELECT TO authenticated
USING (supabase_id = auth.uid()::text);

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

DROP POLICY IF EXISTS "studio_user_profiles_update_own" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_update_own" ON studio_user_profiles
FOR UPDATE TO authenticated
USING (supabase_id = auth.uid()::text)
WITH CHECK (supabase_id = auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_supabase_id_active 
ON studio_user_profiles(supabase_id, is_active) 
WHERE is_active = true AND supabase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_email_active 
ON studio_user_profiles(email, is_active) 
WHERE is_active = true;

-- ============================================
-- PARTE 1.1: RLS STUDIOS (FIX 403)
-- ============================================

ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_supabase_studio
ON studio_user_profiles(supabase_id, studio_id, is_active)
WHERE is_active = true AND studio_id IS NOT NULL;

-- ============================================
-- PARTE 2: FIX TRIGGERS DEPRECADOS
-- ============================================

-- FIX STUDIO_AGENDA
DROP TRIGGER IF EXISTS notify_agenda_changes ON studio_agenda;
DROP TRIGGER IF EXISTS notify_studio_agenda_changes ON studio_agenda;
DROP FUNCTION IF EXISTS notify_agenda_changes();
DROP FUNCTION IF EXISTS notify_studio_agenda_changes();

CREATE OR REPLACE FUNCTION studio_agenda_realtime_trigger()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  studio_slug_var TEXT;
BEGIN
  SELECT slug INTO studio_slug_var
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug_var IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
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

DROP TRIGGER IF EXISTS studio_agenda_realtime_trigger ON studio_agenda;
CREATE TRIGGER studio_agenda_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_agenda
  FOR EACH ROW EXECUTE FUNCTION studio_agenda_realtime_trigger();

-- FIX STUDIO_NOTIFICATIONS
DROP TRIGGER IF EXISTS studio_notifications_realtime_trigger ON studio_notifications;
DROP FUNCTION IF EXISTS studio_notifications_broadcast_trigger();

CREATE OR REPLACE FUNCTION studio_notifications_broadcast_trigger()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  studio_slug_var TEXT;
BEGIN
  SELECT slug INTO studio_slug_var
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug_var IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  PERFORM realtime.broadcast_changes(
    'studio:' || studio_slug_var || ':notifications',
    TG_OP,
    TG_OP,
    'studio_notifications',
    'public',
    NEW,
    OLD
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS studio_notifications_realtime_trigger ON studio_notifications;
CREATE TRIGGER studio_notifications_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_notifications
  FOR EACH ROW EXECUTE FUNCTION studio_notifications_broadcast_trigger();

-- ============================================
-- FIN - Success esperado: No rows returned
-- ============================================

