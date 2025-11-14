-- Verificar usuario actual para Realtime
-- Ejecuta esto DESPUÉS de iniciar sesión en la aplicación web
-- Luego ejecuta este SQL en Supabase SQL Editor (se ejecutará como el usuario autenticado)

-- 1. Verificar auth.uid() actual
SELECT 
    auth.uid()::text as mi_auth_uid,
    auth.email() as mi_email;

-- 2. Verificar si existe perfil con este supabase_id
SELECT 
    sup.email,
    sup.supabase_id,
    sup.studio_id,
    s.slug as studio_slug,
    sup.is_active,
    CASE 
        WHEN sup.supabase_id = auth.uid()::text THEN '✅ Coincide'
        WHEN sup.supabase_id IS NULL THEN '❌ supabase_id es NULL'
        ELSE '❌ No coincide'
    END as verificacion_coincidencia
FROM studio_user_profiles sup
LEFT JOIN studios s ON s.id = sup.studio_id
WHERE sup.supabase_id = auth.uid()::text
AND s.slug = 'demo-studio';

-- 3. Probar la política manualmente
SELECT 
    'studio:demo-studio:notifications' as topic,
    auth.uid()::text as mi_auth_uid,
    EXISTS (
        SELECT 1 FROM studio_user_profiles sup
        JOIN studios s ON s.id = sup.studio_id
        WHERE sup.supabase_id = auth.uid()::text
        AND sup.is_active = true
        AND s.slug = 'demo-studio'
    ) as tengo_acceso;

-- Si tengo_acceso es false, el problema está en:
-- - supabase_id no coincide con auth.uid()
-- - is_active = false
-- - studio_id incorrecto
-- - slug incorrecto

