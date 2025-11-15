# 🛠️ Scripts Utilidad

Scripts de desarrollo y mantenimiento para ZEN Platform.

---

## 📋 Scripts Disponibles

### `validate-auth-setup.ts`

**Propósito:** Validar que el sistema Auth + Realtime esté configurado correctamente

**Ejecutar:**
```bash
npx tsx scripts/validate-auth-setup.ts
```

**Validaciones:**
1. ✅ Usuarios existen en `auth.users`
2. ✅ Perfiles tienen `supabase_id` en `studio_user_profiles`
3. ✅ Auth y Profiles están sincronizados
4. ✅ RLS habilitado en `studio_user_profiles`
5. ✅ Políticas RLS existen y son correctas
6. ✅ Políticas Realtime configuradas

**Output esperado:**
```
🔍 VALIDACIÓN SETUP AUTH + REALTIME
============================================================

📋 1. Verificando usuarios en Supabase Auth...
   ✅ Encontrados 3 usuarios en auth.users
      - admin@prosocial.mx (uuid-123...)
      - owner@demo-studio.com (uuid-456...)
      - fotografo@demo-studio.com (uuid-789...)

📋 2. Verificando studio_user_profiles.supabase_id...
   ✅ Encontrados 3 perfiles
      ✅ admin@prosocial.mx → supabase_id: uuid-123...
      ✅ owner@demo-studio.com → supabase_id: uuid-456...
      ✅ fotografo@demo-studio.com → supabase_id: uuid-789...

📋 3. Verificando sincronización Auth ↔ Profiles...
   ✅ admin@prosocial.mx sincronizado correctamente
   ✅ owner@demo-studio.com sincronizado correctamente
   ✅ fotografo@demo-studio.com sincronizado correctamente

📋 4. Verificando RLS habilitado...
   ✅ RLS habilitado en studio_user_profiles

📋 5. Verificando políticas RLS...
   ✅ Encontradas 3 políticas:
      - studio_user_profiles_read_own (SELECT)
      - studio_user_profiles_read_studio (SELECT)
      - studio_user_profiles_update_own (UPDATE)

📋 6. Verificando políticas Realtime...
   ✅ Encontradas 2 políticas Realtime:
      - studio_notifications_can_read_broadcasts
      - studio_notifications_can_write_broadcasts

============================================================

📊 RESUMEN VALIDACIÓN:

✅ authUsers
✅ profilesSupabaseId
✅ syncAuthProfiles
✅ rlsEnabled
✅ rlsPolicies
✅ realtimePolicies

6 passed, 0 failed

🎉 ¡TODAS LAS VALIDACIONES PASARON!
   Sistema listo para usar Auth + Realtime
```

**Cuándo ejecutar:**
- Después de `npx supabase db reset`
- Después de ejecutar seed
- Antes de probar Realtime
- Al hacer debug de auth issues

**Si falla:**
```bash
# 1. Reset DB
npx supabase db reset

# 2. Re-ejecutar seed
npx tsx prisma/seed-demo-users.ts

# 3. Validar nuevamente
npx tsx scripts/validate-auth-setup.ts
```

---

## 🔜 Futuros Scripts

### `cleanup-inactive-users.ts` (Planeado)
Limpiar usuarios inactivos > 90 días sin login

### `migrate-legacy-auth.ts` (Planeado)
Migrar usuarios sin `supabase_id` desde sistema legacy

### `generate-test-notifications.ts` (Planeado)
Generar notificaciones de prueba para testing Realtime

---

## 📝 Convenciones

**Naming:** `kebab-case.ts`
**Shebang:** `#!/usr/bin/env tsx`
**Error handling:** Exit code 0 (success) / 1 (error)
**Logs:** Usar emojis para clarity 🎯

---

**Última actualización: 2025-01-20**

