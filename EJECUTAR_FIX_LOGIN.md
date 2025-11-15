# ⚡ FIX LOGIN - Ejecutar AHORA

## 🎯 PROBLEMA

Login falla con: **"Database error granting user"**

## ✅ SOLUCIÓN (1 minuto)

### Paso 1: Copiar SQL

Abrir archivo: **`scripts/fix-login-trigger.sql`**

### Paso 2: Supabase Dashboard

```
1. Ir a: https://supabase.com/dashboard
2. Seleccionar proyecto
3. SQL Editor (menú izquierdo)
4. New Query
5. Pegar contenido de fix-login-trigger.sql
6. RUN
```

### Paso 3: Verificar

```bash
npx tsx scripts/debug-auth-users.ts
```

**Resultado esperado:**
```
✅ Login exitoso!
```

### Paso 4: Probar en UI

```bash
npm run dev
# Login con: owner@demo-studio.com / Owner123!
```

---

## 📋 CAUSA

Trigger `on_auth_user_created_or_updated` se ejecutaba en **UPDATE** (login), causando error.

**Fix:** Cambiar a `INSERT only` (signup).

---

## 📚 Docs Completo

Ver: `FIX_LOGIN_ERROR.md`

---

**Ejecuta el SQL y listo! 🚀**

