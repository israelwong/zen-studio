-- ============================================
-- TRIGGER REALTIME PARA STUDIO_PROMISES
-- ============================================
-- Migrar de postgres_changes a broadcast con trigger

-- Función trigger para broadcast de cambios en promises
CREATE OR REPLACE FUNCTION studio_promises_broadcast_trigger()
RETURNS TRIGGER AS $$
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  studio_slug TEXT;
BEGIN
  -- Obtener slug del studio
  SELECT slug INTO studio_slug
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Broadcast al canal del studio usando realtime.broadcast_changes
  PERFORM realtime.broadcast_changes(
    'studio:' || studio_slug || ':promises',
    TG_OP,
    TG_OP,
    'studio_promises',
    'public',
    NEW,
    OLD
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger que se ejecuta después de INSERT, UPDATE o DELETE
DROP TRIGGER IF EXISTS studio_promises_realtime_trigger ON studio_promises;
CREATE TRIGGER studio_promises_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_promises
  FOR EACH ROW EXECUTE FUNCTION studio_promises_broadcast_trigger();

-- Comentario explicativo
COMMENT ON FUNCTION studio_promises_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime cuando se crean, actualizan o eliminan promesas del estudio';

-- Políticas RLS para realtime.messages (requeridas para canales privados)
-- Permitir lectura de mensajes de broadcast para usuarios autenticados del studio
CREATE POLICY "studio_promises_can_read_broadcasts" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'studio:%:promises' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

-- Permitir escritura de mensajes de broadcast (el trigger usa SECURITY DEFINER, pero esto es requerido)
CREATE POLICY "studio_promises_can_write_broadcasts" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE 'studio:%:promises' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);
