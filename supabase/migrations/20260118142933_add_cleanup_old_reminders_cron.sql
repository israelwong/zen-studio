-- ============================================
-- JOB DE LIMPIEZA AUTOMÁTICA: SEGUIMIENTOS COMPLETADOS
-- ============================================
-- Elimina seguimientos completados con más de 30 días de antigüedad
-- Se ejecuta cada domingo a las 03:00 AM UTC

-- ============================================
-- HABILITAR EXTENSIÓN pg_cron
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- VERIFICACIÓN DE SEGURIDAD
-- ============================================
-- Confirmar que eliminar studio_reminders NO afecta studio_promise_logs
-- 
-- Relaciones verificadas:
-- - studio_reminders.promise_id → studio_promises.id (ON DELETE CASCADE)
-- - studio_promise_logs.promise_id → studio_promises.id (ON DELETE CASCADE)
-- 
-- CONCLUSIÓN: Los logs están relacionados directamente con la promise,
-- no con el reminder. Eliminar un reminder NO afecta los logs porque:
-- 1. Los logs tienen su propia relación con promises
-- 2. El reminder solo tiene una relación 1:1 con la promise
-- 3. No hay CASCADE desde reminders hacia logs
--
-- El historial en studio_promise_logs permanecerá intacto.

-- ============================================
-- ELIMINAR JOB EXISTENTE (SI EXISTE)
-- ============================================
-- Permite re-ejecutar la migración de forma idempotente

DO $$
BEGIN
  -- Intentar eliminar el job si existe (ignorar error si no existe)
  PERFORM cron.unschedule('cleanup-old-reminders');
EXCEPTION
  WHEN OTHERS THEN
    -- El job no existe, continuar normalmente
    NULL;
END $$;

-- ============================================
-- CREAR JOB DE LIMPIEZA
-- ============================================
-- Cron: '0 3 * * 0' = Cada domingo a las 03:00 AM UTC
-- 
-- El job elimina seguimientos que:
-- - Están completados (is_completed = true)
-- - Tienen más de 30 días desde su última actualización (updated_at)
--
-- Usamos updated_at en lugar de completed_at porque:
-- - updated_at se actualiza cuando se completa el seguimiento
-- - Es más confiable para determinar la antigüedad real
-- - completed_at podría ser NULL en casos edge

SELECT cron.schedule(
  'cleanup-old-reminders',                    -- Nombre del job
  '0 3 * * 0',                                -- Cron: Domingos a las 03:00 AM UTC
  $$ 
    DELETE FROM public.studio_reminders 
    WHERE is_completed = true 
      AND updated_at < NOW() - INTERVAL '30 days';
  $$
);

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON EXTENSION pg_cron IS 
  'Extensión para programar tareas automáticas en PostgreSQL';

-- Verificar que el job se creó correctamente
DO $$
DECLARE
  job_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO job_count
  FROM cron.job
  WHERE jobname = 'cleanup-old-reminders';
  
  IF job_count = 0 THEN
    RAISE EXCEPTION 'Error: El job cleanup-old-reminders no se creó correctamente';
  ELSE
    RAISE NOTICE '✅ Job cleanup-old-reminders creado exitosamente';
    RAISE NOTICE '📅 Programado para ejecutarse cada domingo a las 03:00 AM UTC';
    RAISE NOTICE '🗑️  Eliminará seguimientos completados con más de 30 días';
  END IF;
END $$;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. SEGURIDAD DE DATOS:
--    - Los logs en studio_promise_logs NO se ven afectados
--    - El historial de acciones permanece intacto
--    - Solo se eliminan registros de seguimientos completados antiguos
--
-- 2. RETENCIÓN:
--    - Se mantienen seguimientos completados por 30 días
--    - Después de 30 días, se eliminan automáticamente
--    - Los seguimientos activos (is_completed = false) NO se eliminan
--
-- 3. EJECUCIÓN:
--    - El job se ejecuta automáticamente cada domingo
--    - No requiere intervención manual
--    - Los errores se registran en los logs de Supabase
--
-- 4. MONITOREO:
--    - Verificar logs en Supabase Dashboard → Database → Cron Jobs
--    - Consultar historial: SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-reminders');
--
-- 5. DESHABILITAR:
--    - Para deshabilitar temporalmente: SELECT cron.unschedule('cleanup-old-reminders');
--    - Para reactivar: Re-ejecutar esta migración o usar cron.schedule nuevamente
