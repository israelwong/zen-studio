# 📊 Análisis Técnico: Google Drive vs Google Calendar

**Fecha:** 2025-01-29  
**Objetivo:** Auditar la implementación actual de Google Drive y compararla con la nueva lógica de Calendar para identificar diferencias y aplicar los principios de Desacoplamiento, Autorización Incremental y Desconexión Limpia.

---

## 🔍 1. IDENTIDAD VS. RECURSOS

### ✅ **Google Drive - Estado Actual**

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`

**Implementación:**

- ✅ **USA `google_oauth_email` del Studio** (línea 217)
- ✅ **NO depende del email de sesión** (`auth.user.email`)
- ✅ Obtiene email desde `userinfo` API usando `access_token` (líneas 169-180)
- ✅ Guarda `google_oauth_email` en la tabla `studios` (línea 217)

**Código clave:**

```typescript
// Líneas 169-180: Obtiene email de Google desde access_token
const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
});
const userInfo = await userInfoResponse.json();
email = userInfo.email;

// Línea 217: Guarda en google_oauth_email (independiente de sesión)
google_oauth_email: email,
```

**Cliente Drive:**

- ✅ `getGoogleDriveClient()` usa `studio.google_oauth_refresh_token` (línea 26)
- ✅ NO usa `auth.user.email` en ningún momento
- ✅ Completamente desacoplado de la sesión del usuario

### ✅ **Google Calendar - Nueva Lógica**

**Archivo:** `src/lib/actions/auth/oauth.actions.ts`

**Implementación:**

- ✅ **USA `google_oauth_email` del Studio** (línea 356)
- ✅ Obtiene email desde `provider_token` de la sesión (líneas 288-307)
- ✅ Función `vincularRecursoGoogle()` permite conectar cuenta diferente a la de sesión

**Conclusión:** ✅ **AMBOS están desacoplados correctamente**

---

## 🔐 2. SCOPES - AUTORIZACIÓN INCREMENTAL

### ⚠️ **Google Drive - Estado Actual**

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`

**Problema Identificado:**

- ⚠️ **Tiene su propio flujo OAuth** (`iniciarConexionGoogle`, `procesarCallbackGoogle`)
- ⚠️ **NO usa el callback unificado** (`/auth/callback/route.ts`)
- ⚠️ Usa callback separado: `/api/auth/google/callback/route.ts` (línea 2)
- ✅ **SÍ implementa autorización incremental** (líneas 70-74):
  ```typescript
  const scopes = ["https://www.googleapis.com/auth/drive.readonly"];
  ```
- ✅ **Combina scopes existentes** (líneas 188-204) para no sobrescribir Calendar

**Flujo Actual:**

1. `iniciarConexionGoogle()` → Genera URL OAuth con scopes de Drive
2. Usuario autoriza en Google
3. Callback a `/api/auth/google/callback` (separado)
4. `procesarCallbackGoogle()` → Intercambia code por tokens
5. Guarda tokens en `studios` con scopes combinados

### ✅ **Google Calendar - Nueva Lógica**

**Archivo:** `src/lib/actions/auth/oauth.actions.ts`

**Implementación:**

- ✅ Usa callback unificado `/auth/callback/route.ts`
- ✅ Función `vincularRecursoGoogle()` con scopes de Calendar (líneas 326-329)
- ✅ **PERO:** Hardcodea scopes de Calendar, no Drive (línea 326)

**Problema en Calendar:**

- ⚠️ `vincularRecursoGoogle()` asume Calendar por defecto (línea 325)
- ⚠️ No detecta automáticamente qué recurso se está vinculando

**Conclusión:**

- ⚠️ **Drive tiene flujo separado** (no usa callback unificado)
- ⚠️ **Calendar hardcodea scopes** (no detecta tipo de recurso)
- ✅ Ambos implementan autorización incremental (combinan scopes)

---

## 💾 3. PERSISTENCIA - TOKENS ENCRIPTADOS

### ✅ **Google Drive - Estado Actual**

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`

**Implementación:**

- ✅ **USA `encryptToken()`** (línea 183)
- ✅ Guarda `google_oauth_refresh_token` encriptado (línea 216)
- ✅ Usa `decryptToken()` en cliente (línea 42 de `google-drive.client.ts`)
- ✅ Persistencia correcta en tabla `studios`

**Código:**

```typescript
// Línea 183: Encripta antes de guardar
const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

// Línea 216: Guarda encriptado
google_oauth_refresh_token: encryptedRefreshToken,
```

### ✅ **Google Calendar - Nueva Lógica**

**Archivo:** `src/lib/actions/auth/oauth.actions.ts`

**Implementación:**

- ✅ **USA `encryptToken()`** (línea 321)
- ✅ Guarda `google_oauth_refresh_token` encriptado (línea 355)
- ✅ Mismo patrón que Drive

**Conclusión:** ✅ **AMBOS usan encriptación correctamente**

---

## 📁 4. ESTRUCTURA DE CARPETAS

### ✅ **Google Drive - Estado Actual**

**Persistencia de Carpetas:**

- ✅ **Guarda `google_folder_id` en `studio_event_deliverables`** (schema línea 1658)
- ✅ Campo `delivery_mode` distingue entre `native` y `google_drive` (línea 1659)
- ✅ Índice en `google_folder_id` para búsquedas eficientes (línea 1664)

**Archivo:** `src/lib/actions/studio/business/events/deliverables.actions.ts`

**Función `vincularCarpetaDrive()`:**

- ✅ Valida que la carpeta existe (línea 363)
- ✅ Valida permisos de lectura (línea 372)
- ✅ Establece permisos públicos recursivamente (línea 383)
- ✅ Actualiza `google_folder_id` y `delivery_mode` (líneas 390-401)

**Código:**

```typescript
// Línea 390-401: Actualiza entregable con folder_id
await prisma.studio_event_deliverables.update({
  where: { id: entregableId },
  data: {
    google_folder_id: folderId,
    delivery_mode: "google_drive",
  },
});
```

**Conclusión:** ✅ **Estructura de carpetas bien implementada**

---

## 🧹 5. DESCONEXIÓN LIMPIA

### ⚠️ **Google Drive - Estado Actual**

**Archivo:** `src/lib/actions/studio/integrations/google-drive.actions.ts`

**Función `desconectarGoogle()` (líneas 240-275):**

**Problemas Identificados:**

- ❌ **NO limpia archivos de Drive** (solo limpia tokens)
- ❌ **NO elimina permisos públicos** de carpetas vinculadas
- ❌ **NO actualiza entregables** (quedan con `google_folder_id` pero sin acceso)
- ⚠️ Comentario indica intención (líneas 262-265):
  ```typescript
  // Nota: No eliminamos los entregables con delivery_mode='google_drive'
  // porque el estudio puede reconectar más tarde y recuperar el acceso
  // Los entregables quedarán sin contenido hasta que se reconecte Google Drive
  // o se cambie el modo de entrega
  ```

**Lo que SÍ hace:**

- ✅ Limpia tokens (`google_oauth_refresh_token: null`)
- ✅ Limpia email (`google_oauth_email: null`)
- ✅ Limpia scopes (`google_oauth_scopes: null`)
- ✅ Marca como desconectado (`is_google_connected: false`)

**Lo que NO hace:**

- ❌ No revoca permisos públicos de carpetas
- ❌ No elimina `google_folder_id` de entregables
- ❌ No limpia `google_integrations_config`

### ✅ **Google Calendar - Nueva Lógica**

**Archivo:** `src/lib/actions/auth/desconectar-google-calendar.actions.ts`

**Función `desvincularRecursoGoogle()` (líneas 304-375):**

**Implementación Completa:**

- ✅ **Elimina eventos de Google Calendar** (líneas 125-299)
- ✅ **Limpia campos en DB** (`google_event_id: null`)
- ✅ **Elimina en lotes** para evitar timeouts (BATCH_SIZE = 20)
- ✅ **Limpia calendario secundario** (`google_calendar_secondary_id: null`)
- ✅ **Limpia tokens y configuración** (líneas 344-355)
- ✅ **Opción de limpiar eventos** (`limpiarEventos: boolean`)

**Código clave:**

```typescript
// Líneas 194-213: Elimina eventos de Google Calendar
await eliminarEventoGoogle(tarea.google_calendar_id, tarea.google_event_id);

// Líneas 217-227: Limpia campos en DB
await prisma.studio_scheduler_event_tasks.updateMany({
  data: { google_event_id: null, google_calendar_id: null },
});
```

**Conclusión:**

- ❌ **Drive NO tiene desconexión limpia** (solo limpia tokens)
- ✅ **Calendar SÍ tiene desconexión limpia** (elimina eventos y limpia DB)

---

## 📋 RESUMEN EJECUTIVO

### ✅ Aspectos Correctos en Drive

1. **Identidad vs. Recursos:** ✅ Desacoplado (usa `google_oauth_email`)
2. **Persistencia:** ✅ Tokens encriptados correctamente
3. **Estructura de Carpetas:** ✅ `google_folder_id` guardado en DB

### ⚠️ Problemas Identificados

1. **Scopes:**
   - ⚠️ Flujo OAuth separado (no usa callback unificado)
   - ⚠️ Callback en `/api/auth/google/callback` (separado de `/auth/callback`)

2. **Desconexión:**
   - ❌ **NO limpia permisos públicos** de carpetas
   - ❌ **NO elimina `google_folder_id`** de entregables
   - ❌ **NO limpia `google_integrations_config`**

### 🎯 Recomendaciones para Refactorización

1. **Migrar a Callback Unificado:**
   - Usar `/auth/callback/route.ts` con parámetro `type=link_resource`
   - Eliminar `/api/auth/google/callback/route.ts`
   - Usar `vincularRecursoGoogle()` para Drive también

2. **Implementar Desconexión Limpia:**
   - Crear función `desconectarGoogleDrive()` similar a `desvincularRecursoGoogle()`
   - Revocar permisos públicos de carpetas vinculadas
   - Opcional: Eliminar `google_folder_id` de entregables (o mantener para reconexión)
   - Limpiar `google_integrations_config.drive`

3. **Mejorar Detección de Scopes:**
   - Modificar `vincularRecursoGoogle()` para detectar tipo de recurso desde `state`
   - Permitir scopes de Drive o Calendar según el flujo

---

## 📊 COMPARACIÓN LADO A LADO

| Aspecto          | Google Drive (Actual)   | Google Calendar (Nuevo) | Estado       |
| ---------------- | ----------------------- | ----------------------- | ------------ |
| **Identidad**    | `google_oauth_email` ✅ | `google_oauth_email` ✅ | ✅ Igual     |
| **Scopes**       | Flujo separado ⚠️       | Callback unificado ✅   | ⚠️ Diferente |
| **Persistencia** | `encryptToken()` ✅     | `encryptToken()` ✅     | ✅ Igual     |
| **Estructura**   | `google_folder_id` ✅   | `google_event_id` ✅    | ✅ Similar   |
| **Desconexión**  | Solo tokens ❌          | Limpia eventos ✅       | ❌ Diferente |

---

## 🔧 ARCHIVOS CLAVE PARA REFACTORIZACIÓN

1. **`src/lib/actions/studio/integrations/google-drive.actions.ts`**
   - Migrar `procesarCallbackGoogle()` a usar `vincularRecursoGoogle()`
   - Crear `desconectarGoogleDrive()` con limpieza completa

2. **`src/app/api/auth/google/callback/route.ts`**
   - **ELIMINAR** (migrar a callback unificado)

3. **`src/lib/actions/auth/oauth.actions.ts`**
   - Mejorar `vincularRecursoGoogle()` para detectar tipo de recurso
   - Agregar soporte para scopes de Drive

4. **`src/lib/integrations/google-drive.client.ts`**
   - Crear función `revocarPermisosPublicos()` para desconexión limpia

---

**Fin del Análisis**
