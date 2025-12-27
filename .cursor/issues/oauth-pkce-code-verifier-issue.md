# Problema: OAuth PKCE `code_verifier` Error - `bad_code_verifier`

## 📋 Resumen del Problema

El callback de OAuth (`/auth/callback`) está fallando consistentemente con el error:
```
Error [AuthApiError]: code challenge does not match previously saved code verifier
status: 400
code: 'bad_code_verifier'
```

**Contexto:** Integración de Google OAuth (Calendar y Drive) usando Supabase Auth con PKCE (Proof Key for Code Exchange).

---

## 🔍 Síntomas Observados

1. **Error en el callback:**
   - La cookie `sb-*-auth-token-code-verifier` está presente en el request (159 caracteres)
   - El callback recibe el `code` correctamente de Google
   - `exchangeCodeForSession(code)` falla con `bad_code_verifier`

2. **Logs del callback:**
   ```
   [OAuth Callback] Cookies presentes: [
     '_ga',
     '_fbp',
     '_ga_J67HTDDYKM',
     'sb-fhwfdwrrnwkbnwxabkcq-auth-token',
     'sb-fhwfdwrrnwkbnwxabkcq-auth-token-code-verifier',  // ✅ Presente
     '__next_hmr_refresh_hash__'
   ]
   [OAuth Callback] Cookies de PKCE encontradas: [
     {
       name: 'sb-fhwfdwrrnwkbnwxabkcq-auth-token-code-verifier',
       hasValue: true,
       valueLength: 159  // ✅ Tiene valor
     }
   ]
   [OAuth Callback] Error intercambiando código: Error [AuthApiError]: code challenge does not match previously saved code verifier
   ```

3. **Flujo afectado:**
   - Google Calendar OAuth (`iniciarVinculacionRecursoGoogleClient`)
   - Google Drive OAuth (`iniciarVinculacionDriveClient`)
   - Ambos usan el mismo callback unificado `/auth/callback`

---

## 🏗️ Arquitectura Actual

### Cliente (Browser)
**Archivo:** `src/lib/actions/auth/oauth-client.actions.ts`

- Usa `createClient()` de `@/lib/supabase/browser`
- `createClient()` usa `createBrowserClient` con storage personalizado (`createRememberMeStorage`)
- El storage respeta `rememberMe` (localStorage vs sessionStorage)
- **Limpieza de cookies:** Se limpian cookies residuales de Supabase (`sb-*` con `auth` o `code`) antes de iniciar OAuth

**Flujo de inicio OAuth:**
```typescript
// 1. Limpiar cookies residuales
document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

// 2. Crear cliente Supabase
const supabase = createClient();

// 3. Iniciar OAuth
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback?type=link_resource&...`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    scopes: '...',
  },
});
```

### Servidor (Callback)
**Archivo:** `src/app/(auth)/auth/callback/route.ts`

**Implementación actual:**
```typescript
// Usa createServerClient directamente con cookies del request
const response = NextResponse.next();

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return request.cookies.getAll(); // ✅ Lee directamente del request
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

// Intercambiar código
const { data, error } = await supabase.auth.exchangeCodeForSession(code);
```

### Storage Adapter
**Archivo:** `src/lib/supabase/storage-adapter.ts`

- Usa `localStorage` o `sessionStorage` según `rememberMe`
- **Problema potencial:** Supabase guarda `code_verifier` en localStorage/sessionStorage, pero el servidor necesita leerlo de cookies HTTP

---

## 🔧 Intentos de Solución Realizados

### 1. ✅ Limpieza de cookies residuales
- **Implementado:** Limpieza de cookies `sb-*` antes de iniciar OAuth
- **Resultado:** No resolvió el problema

### 2. ✅ Logging detallado
- **Implementado:** Logs de cookies presentes, cookies PKCE, valores
- **Resultado:** Confirma que la cookie `code-verifier` está presente con valor

### 3. ✅ Uso directo de `createServerClient` con cookies del request
- **Implementado:** Leer cookies directamente de `request.cookies` antes de `exchangeCodeForSession`
- **Resultado:** No resolvió el problema

### 4. ✅ Helper para propagar cookies en redirecciones
- **Implementado:** `createRedirectResponse()` que copia cookies de Supabase a respuestas
- **Resultado:** No resolvió el problema (el error ocurre antes de la redirección)

### 5. ❌ Eliminación de limpieza de storage
- **Intentado:** Remover limpieza de localStorage/sessionStorage
- **Resultado:** No resolvió el problema

---

## 🤔 Hipótesis del Problema

### Hipótesis Principal
**El `code_verifier` se guarda en localStorage/sessionStorage en el cliente, pero Supabase no lo sincroniza correctamente a cookies HTTP antes de la redirección a Google OAuth.**

**Evidencia:**
- La cookie `code-verifier` está presente en el callback, pero Supabase no puede validarla
- Esto sugiere que el `code_verifier` en la cookie no coincide con el `code_challenge` que se envió a Google
- El storage adapter personalizado podría estar interfiriendo con la sincronización de cookies

### Posibles Causas

1. **Storage Adapter Personalizado:**
   - `createRememberMeStorage()` podría no estar sincronizando `code_verifier` a cookies HTTP
   - Supabase espera que el storage sincronice automáticamente, pero el adapter personalizado podría no hacerlo

2. **Timing de Cookies:**
   - El `code_verifier` se guarda en localStorage, pero la cookie HTTP se establece después de la redirección
   - Cuando Google redirige al callback, la cookie podría no estar sincronizada

3. **Dominio/Path de Cookies:**
   - La cookie podría estar guardada con un path o dominio diferente al que Supabase espera
   - El callback lee la cookie, pero Supabase no la encuentra en el storage interno

4. **Múltiples Instancias de Cliente:**
   - El cliente de Supabase es singleton (`let client`), pero podría estar usando una instancia diferente en el callback

---

## 📁 Archivos Clave

### Cliente
- `src/lib/actions/auth/oauth-client.actions.ts` - Inicio de OAuth
- `src/lib/supabase/browser.ts` - Cliente de Supabase para browser
- `src/lib/supabase/storage-adapter.ts` - Storage adapter personalizado

### Servidor
- `src/app/(auth)/auth/callback/route.ts` - Callback de OAuth
- `src/lib/supabase/server.ts` - Cliente de Supabase para servidor (no usado en callback actualmente)

### Middleware
- `src/proxy.ts` - Middleware (no intercepta `/auth/callback`)

---

## 🔬 Información de Debugging

### Cookies en el Request
```
Cookies presentes: [
  'sb-fhwfdwrrnwkbnwxabkcq-auth-token',
  'sb-fhwfdwrrnwkbnwxabkcq-auth-token-code-verifier'  // ✅ Presente, 159 chars
]
```

### URL de Callback
```
/auth/callback?code=...&next=...&type=link_resource&studioSlug=...&resourceType=calendar
```

### Configuración de Supabase
- **Provider:** Google OAuth
- **PKCE:** Habilitado (por defecto en Supabase)
- **Scopes:** `calendar` + `calendar.events` o `drive.readonly`

---

## 🎯 Próximos Pasos Sugeridos

1. **Verificar sincronización de cookies:**
   - Inspeccionar si Supabase está guardando `code_verifier` en cookies HTTP cuando se inicia OAuth
   - Verificar si el storage adapter está interfiriendo

2. **Probar sin storage adapter personalizado:**
   - Temporalmente usar el storage por defecto de Supabase
   - Verificar si el problema persiste

3. **Inspeccionar cookies en el navegador:**
   - Verificar cookies HTTP después de `signInWithOAuth` pero antes de la redirección
   - Confirmar que la cookie `code-verifier` tiene el mismo valor que en localStorage

4. **Revisar versión de `@supabase/ssr`:**
   - Verificar si hay issues conocidos con PKCE en la versión actual
   - Considerar actualizar o revisar changelog

5. **Probar con `createClient()` del helper:**
   - Volver a usar `createClient()` de `@/lib/supabase/server` en lugar de `createServerClient` directo
   - Verificar si el problema es específico de cómo se leen las cookies

---

## 📝 Notas Adicionales

- **Next.js Version:** 15.5.2
- **Supabase SSR:** `@supabase/ssr` (versión actual en package.json)
- **Contexto:** Este problema surgió después de refactorizar el flujo OAuth para unificar Calendar y Drive
- **Antes de la refactorización:** El flujo funcionaba correctamente (usando callback separado para Drive)

---

## 🔗 Referencias

- [Supabase Auth Debugging - Error Codes](https://supabase.com/docs/guides/auth/debugging/error-codes)
- [Next.js 14+ Cookies Lazy Getter Issue](https://github.com/orgs/supabase/discussions/21183)
- [Supabase SSR PKCE Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

---

## ✅ Solución Implementada

### Problema Identificado
El storage adapter personalizado (`createRememberMeStorage`) no sincronizaba automáticamente el `code_verifier` de localStorage/sessionStorage a cookies HTTP. Supabase guarda el `code_verifier` en storage cuando se inicia OAuth, pero el callback del servidor necesita leerlo de cookies HTTP.

### Solución
Se modificó `src/lib/supabase/storage-adapter.ts` para sincronizar automáticamente las cookies de PKCE a cookies HTTP cuando Supabase las guarda en storage.

**Cambios realizados:**
1. **Función `syncPkceToCookies()`**: Detecta cuando se guarda/elimina un `code_verifier` o `code_challenge` en storage y lo sincroniza a cookies HTTP
2. **Integración en `setItem()`**: Cada vez que Supabase guarda un valor en storage, se verifica si es una cookie de PKCE y se sincroniza
3. **Integración en `removeItem()`**: Cuando se elimina una cookie de PKCE del storage, también se elimina de las cookies HTTP

**Características de la solución:**
- Sincronización automática y transparente
- Establece cookies en ambos paths (`/` y `/auth`) para máxima compatibilidad
- Usa `SameSite=Lax` para permitir redirecciones cross-site desde Google
- Agrega flag `Secure` solo cuando está en HTTPS
- TTL de 10 minutos (suficiente para el flujo OAuth)
- Logging para debugging

**Archivo modificado:**
- `src/lib/supabase/storage-adapter.ts`

### Próximos Pasos de Verificación
1. Probar flujo OAuth de Google Calendar
2. Probar flujo OAuth de Google Drive
3. Verificar que las cookies de PKCE se establezcan correctamente antes de la redirección
4. Confirmar que el callback puede leer el `code_verifier` correctamente

---

**Estado:** 🟡 Solución implementada - Pendiente de verificación

**Última actualización:** 2025-01-XX

