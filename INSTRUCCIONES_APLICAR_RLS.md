# Instrucciones para Aplicar Políticas RLS Actualizadas

## ✅ Cambios Realizados

1. **Schema Prisma actualizado:**
   - Agregado campo `supabase_id` a `studio_user_profiles`
   - Índice creado para `supabase_id`

2. **Base de datos actualizada:**
   - Ejecutado `prisma db push` (preserva datos existentes)
   - Columna `supabase_id` agregada a la tabla

3. **Usuarios migrados:**
   - Ejecutado script `migrate-existing-users.ts`
   - Usuarios existentes ahora tienen `supabase_id` poblado

4. **Código actualizado:**
   - `getCurrentUserId` ahora usa `supabase_id` directamente
   - Seed actualizado para crear `studio_user_profiles` con `supabase_id`

## 🔧 Aplicar Políticas RLS

Las políticas RLS necesitan ser aplicadas manualmente en la base de datos. Ejecuta:

```bash
# Opción 1: Usando psql directamente
psql $DATABASE_URL -f supabase/migrations/20250120000000_studio_notifications_realtime_trigger.sql

# Opción 2: Copiar y pegar el SQL en Supabase Dashboard > SQL Editor
```

O ejecuta este SQL directamente:

```sql
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "studio_notifications_can_read_broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "studio_notifications_can_write_broadcasts" ON realtime.messages;

-- Crear políticas actualizadas usando supabase_id
-- Nota: auth.uid() devuelve UUID, pero supabase_id es TEXT, por lo que necesitamos cast
CREATE POLICY "studio_notifications_can_read_broadcasts" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

CREATE POLICY "studio_notifications_can_write_broadcasts" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

-- Crear índice para rendimiento
CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_supabase_id_active 
ON studio_user_profiles(supabase_id, is_active) 
WHERE is_active = true AND supabase_id IS NOT NULL;
```

## ✅ Verificación

Después de aplicar las políticas, verifica:

1. **Realtime funciona:**
   - Inicia sesión con `owner@demo-studio.com`
   - Abre la consola del navegador
   - Deberías ver logs de suscripción exitosa
   - Crea una notificación y verifica que llega en tiempo real

2. **Usuarios tienen supabase_id:**
   ```sql
   SELECT email, supabase_id, studio_id 
   FROM studio_user_profiles 
   WHERE supabase_id IS NOT NULL;
   ```

## 📝 Notas

- Los usuarios nuevos creados con el seed ahora incluyen `supabase_id` automáticamente
- El script `migrate-existing-users.ts` puede ejecutarse nuevamente si hay usuarios sin `supabase_id`
- Las políticas RLS ahora usan `auth.uid()` directamente, lo cual es más seguro y eficiente

