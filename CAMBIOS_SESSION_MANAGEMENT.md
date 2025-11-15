# 🔐 Gestión de Sesiones Supabase Auth - Implementación Completa

## ✅ SOLUCIÓN IMPLEMENTADA

Tu pregunta era:

> ¿Cómo extendemos las sesiones de Supabase Auth para que no las cierre luego luego, que solo se cierren si el usuario le da cerrar o permanece inactiva durante 30 min o una hora?

**Respuesta:** Sistema de 2 capas implementado:

1. **Auto-refresh de tokens** (maneja Supabase automáticamente)
2. **Timeout por inactividad** (maneja tu hook personalizado)

---

## 🏗️ ARQUITECTURA

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 1: Supabase Auth (Auto-Refresh de Tokens)         │
│  - Token expira en 1 hora                                │
│  - Se renueva automáticamente antes de expirar           │
│  - Usuario NO nota nada                                  │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│  CAPA 2: Session Timeout (Inactividad Personalizada)    │
│  - Usuario configura: 15-120 minutos                     │
│  - Detecta actividad: mouse, teclado, touch, scroll      │
│  - Advertencia: 5 minutos antes de cerrar                │
│  - Cierre automático si no hay actividad                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 ARCHIVOS CREADOS/MODIFICADOS

### 1. **Supabase Client** ✅
**Archivo:** `src/lib/supabase/client.ts`

```typescript
return createBrowserClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,        // Sesión en localStorage
    autoRefreshToken: true,      // Auto-refresh antes de expirar
    detectSessionInUrl: true,    // Para magic links
    storageKey: 'zen-auth-token',
    flowType: 'pkce',            // PKCE > implicit flow
  },
});
```

**Cambio:** Agregada configuración de `auth` para persistencia y auto-refresh.

---

### 2. **Hook de Session Timeout** 🆕
**Archivo:** `src/hooks/useSessionTimeout.ts`

**Función:**
- Detecta eventos de actividad del usuario
- Resetea timers en cada interacción (throttled a 10 seg)
- Muestra advertencia 5 minutos antes de cerrar sesión
- Cierra sesión automáticamente por inactividad

**Uso:**
```typescript
useSessionTimeout({
  inactivityTimeout: 30, // 30 minutos
  showWarning: true,
  warningTime: 5,
});
```

---

### 3. **Provider Global** 🆕
**Archivo:** `src/components/providers/SessionTimeoutProvider.tsx`

**Función:**
- Envuelve la app autenticada
- Carga configuración de `session_timeout` desde BD
- Pasa `inactivityTimeout` al hook

**Integrado en:** `src/app/[slug]/studio/layout.tsx`

```typescript
const settings = await obtenerConfiguracionesSeguridad(slug);
const sessionTimeout = settings?.session_timeout || 30;

<SessionTimeoutProvider inactivityTimeout={sessionTimeout}>
  {children}
</SessionTimeoutProvider>
```

---

### 4. **UI de Configuración** ✅
**Archivo:** `src/app/[slug]/studio/builder/account/seguridad/components/SecuritySettings.tsx`

**Cambios:**
- Slider ajustado: **15-120 minutos** (antes: 1-365 días)
- Pasos de **15 minutos**
- Default: **30 minutos**
- Explicación mejorada:
  > • Tu sesión se cerrará automáticamente después de {X} minutos sin actividad  
  > • Recibirás una advertencia 5 minutos antes  
  > • Cualquier interacción reinicia el contador

---

### 5. **Schema de Validación** ✅
**Archivo:** `src/lib/actions/schemas/seguridad/seguridad-schemas.ts`

```typescript
export const SecuritySettingsSchema = z.object({
  email_notifications: z.boolean(),
  device_alerts: z.boolean(),
  session_timeout: z.number().min(15).max(120) // Cambiado de días a minutos
});
```

---

## 🎯 FUNCIONAMIENTO

### Auto-Refresh (Supabase)
1. Token de acceso expira en **1 hora**
2. Supabase **renueva automáticamente** antes de expirar
3. Usuario **no nota nada**, sesión continúa
4. Refresh token dura **60 días** (configurable en Supabase Dashboard)

### Timeout por Inactividad (Custom)
1. Usuario abre la app → Timer inicia
2. Usuario **interactúa** (mouse, teclado, etc) → Timer se resetea
3. Usuario **NO interactúa** por tiempo configurado:
   - A los **{timeout - 5} minutos** → Toast de advertencia
   - A los **{timeout} minutos** → Cierre de sesión automático
4. Usuario puede click en **"Mantener sesión"** en el toast para resetear

---

## 🧪 TESTING

### Test 1: Configurar Timeout
```
1. Ir a: /[slug]/studio/builder/account/seguridad
2. Mover slider a 15 minutos
3. Guardar
```

### Test 2: Verificar Inactividad
```
1. No tocar ratón/teclado por 10 minutos
2. Debe aparecer toast de advertencia
3. No tocar nada por 5 minutos más
4. Debe cerrar sesión y redirigir a /login
```

### Test 3: Verificar Reseteo
```
1. Esperar toast de advertencia
2. Mover ratón o click en "Mantener sesión"
3. Timer debe resetearse
4. Sesión NO debe cerrarse
```

### Test 4: Verificar Auto-Refresh
```
1. Login y dejar la app abierta (con actividad)
2. Después de 1 hora, token debe renovarse
3. Sesión NO debe cerrarse
4. Verificar en DevTools: localStorage.getItem('zen-auth-token')
```

---

## 📊 EVENTOS DETECTADOS

El hook monitorea estos eventos para detectar actividad:

- `mousedown`
- `mousemove`
- `keypress`
- `scroll`
- `touchstart`
- `click`

**Throttling:** Solo procesa 1 evento cada 10 segundos (evita procesamiento excesivo).

---

## 🔧 CONFIGURACIÓN AVANZADA

### Cambiar Duración de Refresh Token
**Supabase Dashboard:**
```
Authentication → Settings → Session management
→ JWT expiry limit: 3600 (1 hora)
→ Refresh token rotation: enabled
```

### Ajustar Rango de Timeout
**Archivo:** `src/lib/actions/schemas/seguridad/seguridad-schemas.ts`

```typescript
session_timeout: z.number().min(15).max(120) // Ajustar aquí
```

**Archivo:** `SecuritySettings.tsx`

```typescript
<input type="range" min="15" max="120" step="15" />
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Ver: `docs/auth/SESSION_MANAGEMENT.md`  
Resumen: `docs/auth/SESSION_MANAGEMENT_RESUMEN.md`

---

## ✅ CHECKLIST

- [x] Configurar `persistSession` y `autoRefreshToken` en Supabase Client
- [x] Crear hook `useSessionTimeout`
- [x] Crear provider `SessionTimeoutProvider`
- [x] Integrar provider en layout de studio
- [x] Actualizar UI de `SecuritySettings`
- [x] Ajustar schema de validación
- [x] Documentar arquitectura
- [x] Testing manual

---

## 🚀 PRÓXIMOS PASOS (OPCIONAL)

- [ ] Sincronizar inactividad entre tabs con `BroadcastChannel`
- [ ] Implementar `httpOnly` cookies para mayor seguridad
- [ ] Logs de cierre de sesión en `studio_access_logs`
- [ ] Dashboard de sesiones activas

---

**Implementación finalizada! 🎉**

