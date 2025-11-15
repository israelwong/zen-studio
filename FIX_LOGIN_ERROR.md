# 🔧 FIX: "Database error granting user" en Login

## ❌ PROBLEMA IDENTIFICADO

**Error:** `POST .../auth/v1/token?grant_type=password 500 (Internal Server Error)`  
**Mensaje:** "Database error granting user"

### Causa Raíz

El **trigger `on_auth_user_created_or_updated`** se ejecuta en **INSERT OR UPDATE** de `auth.users`.

Cuando un usuario hace **login**, Supabase actualiza `auth.users` (registra `last_sign_in_at`), lo que dispara el trigger. Si el trigger falla (por constraint violation, studio_id null, etc.), **el login completo falla con error 500**.

---

## ✅ SOLUCIÓN

**Cambiar trigger de `INSERT OR UPDATE` a `INSERT only`**

### Por qué funciona

- **Login** → UPDATE en `auth.users` → **NO ejecuta trigger**
- **Signup** → INSERT en `auth.users` → **SÍ ejecuta trigger** (crea profile)

---

## 🛠️ APLICAR FIX

### Opción 1: Ejecutar SQL directo (RECOMENDADO)

```bash
# Supabase Dashboard → SQL Editor → New Query
# Copiar contenido de: scripts/fix-login-trigger.sql
# RUN
```

### Opción 2: Ejecutar archivo completo actualizado

```bash
# Supabase Dashboard → SQL Editor → New Query
# Copiar contenido de: scripts/EJECUTAR_ESTO_EN_SUPABASE.sql
# RUN (reemplaza el trigger viejo)
```

---

## 📝 CAMBIOS REALIZADOS

### Antes (Trigger problemático)

```sql
CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users  -- ❌ Se ejecuta en LOGIN
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();
```

### Después (Trigger corregido)

```sql
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- ✅ Solo ejecutar en INSERT (nuevo usuario)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- ... resto de lógica
  
EXCEPTION
  WHEN OTHERS THEN
    -- ✅ Log error pero NO bloquear
    RAISE WARNING 'Error en sync: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users  -- ✅ Solo INSERT
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();
```

### Cambios Clave

1. **Guard clause:** `IF TG_OP != 'INSERT' THEN RETURN NEW; END IF;`
2. **Exception handler:** `EXCEPTION WHEN OTHERS` para no bloquear login
3. **Trigger name:** `on_auth_user_created` (más descriptivo)
4. **Event:** `AFTER INSERT` solamente

---

## 🧪 TESTING

### 1. Aplicar el fix

```bash
# En Supabase SQL Editor
scripts/fix-login-trigger.sql → RUN
```

### 2. Verificar trigger actualizado

```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';
```

**Resultado esperado:**
```
trigger_name: on_auth_user_created
event_manipulation: INSERT  (no UPDATE)
```

### 3. Test login

```bash
cd /Users/israelwong/Documents/Desarrollo/zen-platform
npx tsx scripts/debug-auth-users.ts
```

**Resultado esperado:**
```
✅ Login exitoso!
   User ID: 673b55f9-1053-42a0-bd80-931ad203c1b6
   Session: Creada
```

### 4. Test en UI

```bash
npm run dev
# → /login
# → Email: owner@demo-studio.com
# → Password: Owner123!
# → Click "Iniciar sesión"
# → ✅ Debe entrar sin error
```

---

## 📂 ARCHIVOS ACTUALIZADOS

- ✅ `scripts/fix-login-trigger.sql` (nuevo)
- ✅ `scripts/EJECUTAR_ESTO_EN_SUPABASE.sql` (actualizado)
- ✅ `scripts/debug-auth-users.ts` (herramienta de diagnóstico)
- ✅ `FIX_LOGIN_ERROR.md` (este documento)

---

## 🚨 IMPORTANTE

### ¿Y si necesito actualizar profiles en login?

Si necesitas sincronizar datos del `user_metadata` en cada login, **NO uses triggers en auth.users**. En su lugar:

**Opción A: Middleware**
```typescript
// middleware.ts
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await prisma.studio_user_profiles.update({
    where: { supabase_id: user.id },
    data: { 
      full_name: user.user_metadata.full_name,
      updated_at: new Date()
    }
  });
}
```

**Opción B: Login callback**
```typescript
// En componente de login
const { data } = await supabase.auth.signInWithPassword({ email, password });
if (data.user) {
  await updateProfileFromMetadata(data.user);
}
```

---

## ✅ CHECKLIST

- [ ] Ejecutar `scripts/fix-login-trigger.sql` en Supabase SQL Editor
- [ ] Verificar trigger con query de `information_schema.triggers`
- [ ] Ejecutar `npx tsx scripts/debug-auth-users.ts` → debe pasar
- [ ] Probar login en UI → debe funcionar
- [ ] Verificar que signup sigue creando profiles automáticamente

---

**Fix aplicado! Login debería funcionar ahora! 🎉**

