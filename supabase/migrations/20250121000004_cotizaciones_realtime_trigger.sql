-- ============================================
-- TRIGGER REALTIME PARA STUDIO_COTIZACIONES
-- ============================================
-- Implementar broadcast para cambios en cotizaciones

-- Función trigger para broadcast de cambios en cotizaciones
CREATE OR REPLACE FUNCTION studio_cotizaciones_broadcast_trigger()
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
    'studio:' || studio_slug || ':cotizaciones',
    TG_OP,
    TG_OP,
    'studio_cotizaciones',
    'public',
    NEW,
    OLD
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger que se ejecuta después de INSERT, UPDATE o DELETE
DROP TRIGGER IF EXISTS studio_cotizaciones_realtime_trigger ON studio_cotizaciones;
CREATE TRIGGER studio_cotizaciones_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_cotizaciones
  FOR EACH ROW EXECUTE FUNCTION studio_cotizaciones_broadcast_trigger();

-- Comentario explicativo
COMMENT ON FUNCTION studio_cotizaciones_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime cuando se crean, actualizan o eliminan cotizaciones del estudio';

-- Políticas RLS para realtime.messages (requeridas para canales privados)
-- Permitir lectura de mensajes de broadcast para usuarios autenticados del studio
CREATE POLICY "studio_cotizaciones_can_read_broadcasts" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'studio:%:cotizaciones' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

-- Permitir escritura de mensajes de broadcast (el trigger usa SECURITY DEFINER, pero esto es requerido)
CREATE POLICY "studio_cotizaciones_can_write_broadcasts" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE 'studio:%:cotizaciones' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);
