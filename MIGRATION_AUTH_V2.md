# 🔄 Migración a Sistema de Auth V2 - Limpio

## Archivos Nuevos Creados

### 1. Cliente Browser Limpio
**`src/lib/supabase/browser.ts`**
- Cliente simple sin singleton ni configuraciones complejas
- Usa `createBrowserClient` de `@supabase/ssr`

### 2. Context de Auth Simple
**`src/contexts/AuthContext.tsx`**
- Solo maneja estado: `user` y `loading`
- Listener automático de cambios
- Refresca router cuando cambia sesión

### 3. LoginForm Directo
**`src/components/forms/LoginForm.tsx`**
- Login directo con `signInWithPassword`
- Redirección con `window.location.href` (fuerza recarga)
- Sin timeouts ni trucos

### 4. Middleware Actualizado
**`src/middleware.ts`**
- Usa `createServerClient` directo (sin wrapper)
- Sincroniza cookies correctamente
- Lógica simplificada

### 5. Nueva Página de Login
**`src/app/(auth)/login/page-new.tsx`**
- Página limpia lista para usar

## Pasos para Migrar

### Paso 1: Actualizar Root Layout
```tsx
// src/app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Paso 2: Reemplazar Login Page
```bash
# Respaldar página actual
mv src/app/(auth)/login/page.tsx src/app/(auth)/login/page.old.tsx

# Activar nueva página
mv src/app/(auth)/login/page-new.tsx src/app/(auth)/login/page.tsx
```

### Paso 3: Actualizar Componentes que Usan Sesión
```tsx
// Antes
import { useSession } from '@/components/providers/SessionProvider'
const { user, loading } = useSession()

// Ahora
import { useAuth } from '@/contexts/AuthContext'
const { user, loading } = useAuth()
```

### Paso 4: Actualizar imports de Supabase Client
```tsx
// Antes
import { createClient } from '@/lib/supabase/client'

// Ahora (en client components)
import { createClient } from '@/lib/supabase/browser'
```

## Archivos a Archivar (No Eliminar Aún)

Mover a carpeta `migrate/`:
- `src/lib/supabase/client.ts` (viejo)
- `src/lib/supabase/client-singleton.ts` (viejo)
- `src/components/providers/SessionProvider.tsx` (viejo)
- `src/components/login-form.tsx` (viejo)

## Beneficios

✅ **Sin singleton complejo** - Cada componente crea su cliente
✅ **Sin logs excesivos** - Solo errores
✅ **Sin timeouts artificiales** - Redirección directa
✅ **Middleware limpio** - Sincronización automática de cookies
✅ **Fácil debug** - Flujo lineal sin abstracciones

## Flujo Final

```
1. Usuario → LoginForm
2. signInWithPassword() → Supabase valida
3. Cookies + localStorage sincronizados (automático @supabase/ssr)
4. window.location.href → Redirección forzada
5. Middleware → Lee cookies → Permite acceso
6. AuthProvider → Detecta sesión → UI actualizado
```

## Testing

```bash
# 1. Probar login
# - Ir a /login
# - Ingresar credenciales válidas
# - Debe redirigir a dashboard sin congelarse

# 2. Probar sesión persistente
# - Refrescar página
# - Debe mantener sesión

# 3. Probar logout
# - Cerrar sesión
# - Debe redirigir a /login
```

