-- ============================================
-- FIX ALL DEPRECATED TRIGGERS (realtime.send)
-- ============================================
-- Encuentra y reemplaza TODOS los triggers que usan realtime.send()
-- con la función actualizada realtime.broadcast_changes()
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de apply-migrations-manual.sql

-- ============================================
-- 1. BUSCAR TRIGGERS DEPRECADOS
-- ============================================

-- Query para ver todos los triggers problemáticos
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_body
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE pg_get_functiondef(p.oid) LIKE '%realtime.send%'
  AND c.relname NOT LIKE 'pg_%'
ORDER BY c.relname;

-- ============================================
-- 2. FIX STUDIO_AGENDA
-- ============================================

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

-- ============================================
-- 3. FIX STUDIO_NOTIFICATIONS
-- ============================================

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
-- 4. FIX OTRAS TABLAS (si existen triggers)
-- ============================================

-- Patrón genérico para otras tablas
-- Reemplazar {TABLE_NAME} con el nombre real de la tabla

/*
DROP TRIGGER IF EXISTS notify_{TABLE_NAME}_changes ON {TABLE_NAME};
DROP FUNCTION IF EXISTS notify_{TABLE_NAME}_changes();

CREATE OR REPLACE FUNCTION {TABLE_NAME}_realtime_trigger()
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
    'studio:' || studio_slug_var || ':{TABLE_NAME}',
    TG_OP,
    TG_OP,
    '{TABLE_NAME}',
    'public',
    NEW,
    OLD
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS {TABLE_NAME}_realtime_trigger ON {TABLE_NAME};
CREATE TRIGGER {TABLE_NAME}_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON {TABLE_NAME}
  FOR EACH ROW EXECUTE FUNCTION {TABLE_NAME}_realtime_trigger();
*/

-- ============================================
-- 4. VERIFICAR RESULTADOS
-- ============================================

-- Ver triggers actualizados
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('studio_agenda', 'studio_notifications')
  AND c.relnamespace = 'public'::regnamespace
ORDER BY c.relname;

-- Buscar cualquier referencia restante a realtime.send()
SELECT 
  p.proname as function_name,
  'STILL USING realtime.send()' as status
FROM pg_proc p
WHERE pg_get_functiondef(p.oid) LIKE '%realtime.send(%'
  AND p.pronamespace = 'public'::regnamespace;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================

-- Debe mostrar:
-- ✅ studio_agenda_realtime_trigger usando broadcast_changes
-- ✅ studio_notifications_broadcast_trigger usando broadcast_changes
-- ✅ 0 funciones usando realtime.send()

