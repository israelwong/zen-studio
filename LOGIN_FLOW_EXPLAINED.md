# 🔐 FLUJO DE LOGIN - EXPLICACIÓN COMPLETA

## 📋 PROCESO ACTUAL (PASO A PASO)

### 1. Usuario ingresa credenciales
- El formulario captura email y password

### 2. Validación en Supabase Auth
- **NO** se hace consulta directa a la BD
- Se usa `supabase.auth.signInWithPassword()` que:
  - Valida credenciales contra Supabase Auth (no BD directa)
  - Si es válido, Supabase Auth genera:
    - `access_token` (JWT)
    - `refresh_token`
    - `session_id`
  - Retorna el objeto `session` con estos tokens

### 3. Almacenamiento de sesión
**PROBLEMA ACTUAL:**
- `createBrowserClient` guarda la sesión en **localStorage** (cliente)
- El **middleware** lee de **cookies** (servidor)
- **DESCONEXIÓN:** localStorage ≠ cookies

### 4. Redirección
- Se determina la ruta según el rol
- Se intenta redirigir a `/{slug}/studio`

### 5. Middleware verifica autenticación
**PROBLEMA:**
- El middleware lee cookies (servidor)
- La sesión está en localStorage (cliente)
- **Resultado:** Middleware no encuentra sesión → redirige a `/login`

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambio 1: Sincronización de sesión
Después del login exitoso:
1. Login guarda en localStorage (cliente)
2. Llamamos `syncSessionAction()` que:
   - Lee la sesión del cliente
   - La sincroniza con cookies del servidor
   - Revalida rutas para que el middleware detecte

### Cambio 2: Middleware mejorado
El middleware ahora:
1. Intenta leer cookies primero
2. Si no encuentra, intenta refrescar la sesión
3. Si encuentra sesión después de refresh, permite acceso

### Cambio 3: Hard redirect
Usamos `window.location.href` en lugar de `router.push()` porque:
- Fuerza una recarga completa
- El middleware se ejecuta en el servidor
- Las cookies se sincronizan correctamente

---

## 🔄 FLUJO CORRECTO (DESPUÉS DE FIX)

```
1. Usuario → Login Form
2. signInWithPassword() → Supabase Auth valida
3. ✅ Sesión creada → Guardada en localStorage (cliente)
4. syncSessionAction() → Sincroniza con cookies (servidor)
5. Hard redirect → window.location.href = '/{slug}/studio'
6. Middleware ejecuta → Lee cookies → ✅ Encuentra sesión
7. Usuario accede al studio → ✅
```

---

## 🐛 SI AÚN NO FUNCIONA

### Verificar en DevTools Console:

```javascript
// 1. Ver localStorage
localStorage.getItem('zen-auth-token')

// 2. Ver cookies
document.cookie

// 3. Ver sesión en Supabase
const { createClient } = await import("@/lib/supabase/client");
const supabase = createClient();
const { data } = await supabase.auth.getSession();
console.log("Session:", data.session);
```

### Posibles problemas:

1. **Cookies no se están creando**
   - Verificar que `syncSessionAction` se ejecute
   - Verificar logs del servidor

2. **Middleware no lee cookies**
   - Verificar logs del middleware
   - Verificar que las cookies tengan el nombre correcto

3. **Sesión expirada**
   - Verificar `expires_at` en la sesión
   - Hacer logout y login de nuevo

---

## 📝 NOTAS TÉCNICAS

### Cliente vs Servidor

- **Cliente (`createBrowserClient`):**
  - Guarda en `localStorage`
  - Usa `storageKey: 'zen-auth-token'`
  - Solo accesible desde el navegador

- **Servidor (`createServerClient`):**
  - Lee de `cookies`
  - Usa cookies HTTP
  - Accesible desde middleware y server components

### Sincronización

La sincronización es necesaria porque:
- Next.js App Router separa cliente y servidor
- El middleware corre en el servidor (edge runtime)
- No puede acceder a `localStorage` del cliente
- Necesita cookies HTTP para leer la sesión

