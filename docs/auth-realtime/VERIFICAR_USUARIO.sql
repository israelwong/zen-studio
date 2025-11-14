-- Verificar usuario específico para Realtime
-- Reemplaza 'owner@demo-studio.com' con el email del usuario que está probando

SELECT 
    sup.email,
    sup.supabase_id,
    sup.studio_id,
    s.slug as studio_slug,
    sup.is_active,
    -- Verificar coincidencia con auth.users
    au.id as auth_user_id,
    au.email as auth_email,
    CASE 
        WHEN au.id IS NULL THEN '❌ Usuario no existe en auth.users'
        WHEN au.id::text = sup.supabase_id THEN '✅ Coincide perfectamente'
        WHEN sup.supabase_id IS NULL THEN '❌ supabase_id es NULL'
        ELSE '❌ No coincide - PROBLEMA'
    END as verificacion_coincidencia,
    -- Verificar acceso al studio
    CASE 
        WHEN sup.studio_id IS NULL THEN '❌ No tiene studio_id'
        WHEN sup.studio_id = s.id AND s.slug = 'demo-studio' THEN '✅ Studio correcto'
        ELSE '⚠️ Studio diferente'
    END as verificacion_studio
FROM studio_user_profiles sup
LEFT JOIN studios s ON s.id = sup.studio_id
LEFT JOIN auth.users au ON au.email = sup.email
WHERE sup.email = 'owner@demo-studio.com';

-- Si el usuario no aparece, verifica todos los usuarios con supabase_id
SELECT 
    email,
    supabase_id,
    studio_id,
    is_active
FROM studio_user_profiles 
WHERE supabase_id IS NOT NULL
ORDER BY email;

