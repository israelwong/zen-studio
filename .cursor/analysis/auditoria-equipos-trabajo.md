# Auditoría: Evolución a Modelo de Equipos de Trabajo

**Fecha:** 2025-01-08  
**Objetivo:** Evolucionar de modelo "Suscriptor Único" a "Equipos de Trabajo" con múltiples usuarios y roles por Studio

---

## 📋 RESUMEN EJECUTIVO

### Estado Actual
- **Modelo:** Un usuario (`studio_user_profiles`) → Un Studio (`studio_id` único)
- **Autenticación:** Basada en `user.user_metadata.role` y `user.user_metadata.studio_slug`
- **Relaciones:** Ya existe `user_studio_roles` pero no está completamente implementado
- **Trazabilidad:** `studio_events.user_id` apunta a `studio_users` (personal operativo), falta `created_by` en promesas

### Objetivo
- **Modelo:** Un usuario puede pertenecer a múltiples Studios con diferentes roles
- **Roles:** OWNER, ADMIN, OPERATIVE, SUPPLIER (mapeados desde `StudioRole` existente)
- **Trazabilidad:** Registrar `created_by` y `updated_by` en todas las acciones críticas
- **RBAC:** Interfaz única con restricciones basadas en roles

---

## 1. AUDITORÍA DE RELACIONES (Schema Prisma)

### 1.1 Estado Actual

```prisma
// ❌ PROBLEMA: Relación 1:1 (un usuario solo puede pertenecer a un studio)
model studio_user_profiles {
  id          String    @id @default(cuid())
  email       String    @unique
  supabase_id String?   @unique
  role        UserRole  // "suscriptor" | "agente" | "super_admin"
  studio_id   String?   // ⚠️ Opcional pero único por email
  // ...
}

// ✅ YA EXISTE: Tabla intermedia para múltiples studios
model user_studio_roles {
  id         String     @id @default(cuid())
  user_id    String
  studio_id  String
  role       StudioRole // OWNER | ADMIN | MANAGER | PHOTOGRAPHER | EDITOR | ASSISTANT | PROVIDER | CLIENT
  is_active  Boolean    @default(true)
  invited_at DateTime   @default(now())
  invited_by String?
  accepted_at DateTime?
  // ...
  @@unique([user_id, studio_id, role]) // ⚠️ Permite múltiples roles por studio
}
```

### 1.2 Cambios Necesarios en Schema

#### A. Modificar `studio_user_profiles` para soportar múltiples studios

```prisma
// ✅ SOLUCIÓN: Eliminar studio_id único, usar user_studio_roles como fuente de verdad
model studio_user_profiles {
  id          String    @id @default(cuid())
  email       String    @unique
  supabase_id String?   @unique
  role        UserRole  // Mantener para compatibilidad (platform-level roles)
  // ❌ REMOVER: studio_id String? (ya no es necesario)
  avatar_url  String?
  created_at  DateTime  @default(now())
  full_name   String?
  is_active   Boolean   @default(true)
  updated_at  DateTime  @updatedAt
  
  // ✅ AGREGAR: Relación con user_studio_roles para obtener studios
  studio_roles user_studio_roles[]
  
  // ... resto de relaciones existentes
}

// ✅ MEJORAR: user_studio_roles (ya existe, solo ajustar)
model user_studio_roles {
  id         String     @id @default(cuid())
  user_id    String
  studio_id  String
  role       StudioRole
  permissions Json?     // Para permisos granulares futuros
  is_active  Boolean    @default(true)
  invited_at DateTime   @default(now())
  invited_by String?    // ID del usuario que invitó
  accepted_at DateTime?
  revoked_at DateTime?
  
  // ✅ AGREGAR: Email de invitación (para usuarios sin cuenta)
  invited_email String? // Email usado en la invitación
  
  // ✅ AGREGAR: Token de invitación (para aceptar invitación)
  invitation_token String? @unique
  
  // Relaciones existentes...
  studio studios @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  user   users   @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@unique([user_id, studio_id]) // ⚠️ CAMBIO: Un usuario solo puede tener UN rol por studio
  @@index([user_id, is_active])
  @@index([studio_id, is_active])
  @@index([invitation_token])
  @@index([invited_email])
}
```

#### B. Agregar campos de trazabilidad a Promesas y Eventos

```prisma
model studio_promises {
  // ... campos existentes ...
  
  // ✅ AGREGAR: Trazabilidad
  created_by_user_id String? // ID de user_studio_roles que creó la promesa
  updated_by_user_id String? // ID de user_studio_roles que actualizó
  
  // Relaciones
  created_by user_studio_roles? @relation("PromiseCreatedBy", fields: [created_by_user_id], references: [id])
  updated_by user_studio_roles? @relation("PromiseUpdatedBy", fields: [updated_by_user_id], references: [id])
  
  @@index([created_by_user_id])
  @@index([updated_by_user_id])
}

model studio_events {
  // ... campos existentes ...
  user_id String? // Ya existe (apunta a studio_users - personal operativo)
  studio_manager_id String? // Ya existe (apunta a user_studio_roles - project manager)
  
  // ✅ AGREGAR: Trazabilidad de creación/conversión
  created_by_user_id String? // ID de user_studio_roles que convirtió promesa → evento
  converted_at DateTime? // Fecha de conversión
  
  // Relaciones
  created_by user_studio_roles? @relation("EventCreatedBy", fields: [created_by_user_id], references: [id])
  
  @@index([created_by_user_id])
}
```

#### C. Actualizar enum StudioRole para mapear roles de equipo

```prisma
enum StudioRole {
  OWNER      // Suscriptor original (equivalente a "suscriptor")
  ADMIN      // Administrativo (puede gestionar equipo, configuraciones)
  OPERATIVE  // Operativo (puede crear promesas, eventos, cotizaciones)
  SUPPLIER   // Proveedor (acceso limitado a eventos asignados)
  
  // Roles existentes (mantener para compatibilidad)
  MANAGER
  PHOTOGRAPHER
  EDITOR
  ASSISTANT
  PROVIDER
  CLIENT
}
```

---

## 2. LÓGICA DE ACCESO Y AUTH

### 2.1 Flujo de Invitación por Email

#### A. Server Action: Invitar Usuario a Studio

```typescript
// src/lib/actions/studio/team/invite-member.action.ts
"use server";

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const inviteMemberSchema = z.object({
  studioSlug: z.string(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'OPERATIVE', 'SUPPLIER']),
});

export async function inviteStudioMember(data: unknown) {
  try {
    const validated = inviteMemberSchema.parse(data);
    
    // 1. Verificar que el usuario actual tiene permisos (OWNER o ADMIN)
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return { success: false, error: 'No autenticado' };
    }
    
    const studio = await prisma.studios.findUnique({
      where: { slug: validated.studioSlug },
      select: { id: true },
    });
    
    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }
    
    // Verificar permisos del usuario actual
    const currentUserRole = await prisma.user_studio_roles.findFirst({
      where: {
        studio_id: studio.id,
        user: { supabase_id: authUser.id },
        is_active: true,
      },
      select: { role: true },
    });
    
    if (!currentUserRole || !['OWNER', 'ADMIN'].includes(currentUserRole.role)) {
      return { success: false, error: 'Sin permisos para invitar miembros' };
    }
    
    // 2. Verificar si el usuario ya existe
    const existingUser = await prisma.users.findUnique({
      where: { email: validated.email },
      select: { id: true },
    });
    
    // 3. Generar token de invitación
    const invitationToken = nanoid(32);
    
    if (existingUser) {
      // Usuario existe: crear/actualizar user_studio_roles directamente
      await prisma.user_studio_roles.upsert({
        where: {
          user_id_studio_id: {
            user_id: existingUser.id,
            studio_id: studio.id,
          },
        },
        create: {
          user_id: existingUser.id,
          studio_id: studio.id,
          role: validated.role,
          invited_by: currentUserRole.id,
          invited_email: validated.email,
          invitation_token: invitationToken,
          accepted_at: new Date(), // Aceptar automáticamente si ya tiene cuenta
        },
        update: {
          role: validated.role,
          is_active: true,
          accepted_at: new Date(),
        },
      });
    } else {
      // Usuario no existe: crear registro pendiente en user_studio_roles
      // Necesitamos crear un registro temporal sin user_id
      // ⚠️ REQUIERE: Modificar schema para permitir user_id nullable temporalmente
      await prisma.user_studio_roles.create({
        data: {
          studio_id: studio.id,
          role: validated.role,
          invited_by: currentUserRole.id,
          invited_email: validated.email,
          invitation_token: invitationToken,
          // user_id será null hasta que el usuario se registre
        },
      });
    }
    
    // 4. Enviar email de invitación (implementar con servicio de email)
    // await sendInvitationEmail(validated.email, invitationToken, validated.studioSlug);
    
    return { success: true, invitationToken };
  } catch (error) {
    console.error('[inviteStudioMember] Error:', error);
    return { success: false, error: 'Error al invitar miembro' };
  }
}
```

#### B. Modificar Callback OAuth para Vincular Invitaciones Pendientes

```typescript
// src/lib/actions/auth/oauth.actions.ts
export async function procesarUsuarioOAuth(
  user: User,
  session: Session
): Promise<ProcesarUsuarioOAuthResult> {
  try {
    const supabaseId = user.id;
    const email = user.email;
    
    if (!email) {
      return { success: false, error: 'Email no disponible' };
    }
    
    // ... código existente para crear/actualizar users y studio_user_profiles ...
    
    // ✅ NUEVO: Buscar invitaciones pendientes por email
    const pendingInvitations = await prisma.user_studio_roles.findMany({
      where: {
        invited_email: email,
        user_id: null, // Invitación pendiente
        is_active: true,
      },
      include: {
        studio: {
          select: { slug: true, studio_name: true },
        },
      },
    });
    
    // Vincular invitaciones pendientes al usuario recién creado/actualizado
    if (pendingInvitations.length > 0) {
      const dbUser = await prisma.users.findUnique({
        where: { supabase_id: supabaseId },
        select: { id: true },
      });
      
      if (dbUser) {
        await Promise.all(
          pendingInvitations.map((invitation) =>
            prisma.user_studio_roles.update({
              where: { id: invitation.id },
              data: {
                user_id: dbUser.id,
                accepted_at: new Date(),
                invitation_token: null, // Limpiar token usado
              },
            })
          )
        );
      }
    }
    
    // ... resto del código existente ...
  } catch (error) {
    // ...
  }
}
```

### 2.2 Middleware: Inyectar Contexto de Studio y Rol

```typescript
// src/middleware.ts (NUEVO - reemplazar proxy.ts)
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Verificar si es ruta de studio
  const studioMatch = pathname.match(/^\/([a-zA-Z0-9-]+)\/studio(\/.*)?$/);
  if (!studioMatch) {
    return NextResponse.next();
  }
  
  const studioSlug = studioMatch[1];
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // ✅ NUEVO: Obtener rol del usuario en este studio específico
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
  
  if (!studio) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  const dbUser = await prisma.users.findUnique({
    where: { supabase_id: user.id },
    select: { id: true },
  });
  
  if (!dbUser) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  const userStudioRole = await prisma.user_studio_roles.findFirst({
    where: {
      user_id: dbUser.id,
      studio_id: studio.id,
      is_active: true,
    },
    select: { id: true, role: true },
  });
  
  if (!userStudioRole) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  // ✅ INYECTAR: Headers con contexto de studio y rol
  response.headers.set('x-studio-id', studio.id);
  response.headers.set('x-studio-slug', studioSlug);
  response.headers.set('x-user-studio-role-id', userStudioRole.id);
  response.headers.set('x-user-studio-role', userStudioRole.role);
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 2.3 Helper: Obtener Contexto de Studio Actual

```typescript
// src/lib/utils/studio-context.ts
"use server";

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export interface StudioContext {
  studioId: string;
  studioSlug: string;
  userStudioRoleId: string;
  role: 'OWNER' | 'ADMIN' | 'OPERATIVE' | 'SUPPLIER';
  userId: string; // ID de users table
}

export async function getStudioContext(): Promise<StudioContext | null> {
  try {
    const headersList = await headers();
    const studioId = headersList.get('x-studio-id');
    const studioSlug = headersList.get('x-studio-slug');
    const userStudioRoleId = headersList.get('x-user-studio-role-id');
    const role = headersList.get('x-user-studio-role') as StudioContext['role'];
    
    if (!studioId || !studioSlug || !userStudioRoleId || !role) {
      return null;
    }
    
    // Obtener userId desde user_studio_roles
    const userStudioRole = await prisma.user_studio_roles.findUnique({
      where: { id: userStudioRoleId },
      select: { user_id: true },
    });
    
    if (!userStudioRole) {
      return null;
    }
    
    return {
      studioId,
      studioSlug,
      userStudioRoleId,
      role,
      userId: userStudioRole.user_id,
    };
  } catch (error) {
    console.error('[getStudioContext] Error:', error);
    return null;
  }
}

export async function requireStudioContext(): Promise<StudioContext> {
  const context = await getStudioContext();
  if (!context) {
    throw new Error('No se pudo obtener contexto de studio');
  }
  return context;
}
```

---

## 3. TRAZABILIDAD Y COMISIONES

### 3.1 Modificar Server Actions para Registrar `created_by`

#### A. Crear Promesa

```typescript
// src/lib/actions/studio/commercial/promises/promises.actions.ts
export async function createPromise(
  studioSlug: string,
  data: CreatePromiseData
): Promise<PromiseResponse> {
  try {
    // ✅ Obtener contexto de studio y usuario actual
    const context = await requireStudioContext();
    
    // ... validaciones existentes ...
    
    const promise = await prisma.studio_promises.create({
      data: {
        studio_id: context.studioId,
        contact_id: contact.id,
        // ... campos existentes ...
        
        // ✅ AGREGAR: Trazabilidad
        created_by_user_id: context.userStudioRoleId,
        updated_by_user_id: context.userStudioRoleId,
      },
      // ... include existente ...
    });
    
    // ... resto del código ...
  } catch (error) {
    // ...
  }
}
```

#### B. Convertir Promesa a Evento

```typescript
// src/lib/actions/studio/commercial/promises/cotizaciones-cierre.actions.ts
export async function autorizarYCrearEvento(
  studioSlug: string,
  promiseId: string,
  cotizacionId: string,
  options?: { registrarPago?: boolean; montoInicial?: number }
) {
  try {
    // ✅ Obtener contexto
    const context = await requireStudioContext();
    
    // ... validaciones existentes ...
    
    const result = await prisma.$transaction(async (tx) => {
      // ... código existente ...
      
      // Crear o actualizar evento
      const evento = await tx.studio_events.upsert({
        where: { promise_id: promiseId },
        create: {
          studio_id: studio.id,
          contact_id: contactId,
          promise_id: promiseId,
          cotizacion_id: cotizacionId,
          // ... campos existentes ...
          
          // ✅ AGREGAR: Trazabilidad
          created_by_user_id: context.userStudioRoleId,
          converted_at: new Date(),
        },
        update: {
          // ... campos de actualización ...
          updated_at: new Date(),
        },
      });
      
      // ... resto de la transacción ...
    });
    
    return result;
  } catch (error) {
    // ...
  }
}
```

### 3.2 Query para Cálculo de Comisiones

```typescript
// src/lib/actions/studio/team/commissions.actions.ts
"use server";

import { prisma } from '@/lib/prisma';
import { requireStudioContext } from '@/lib/utils/studio-context';

export async function getMemberCommissions(
  studioSlug: string,
  memberId: string, // ID de user_studio_roles
  startDate?: Date,
  endDate?: Date
) {
  const context = await requireStudioContext();
  
  // Verificar permisos (solo OWNER/ADMIN puede ver comisiones)
  if (!['OWNER', 'ADMIN'].includes(context.role)) {
    throw new Error('Sin permisos para ver comisiones');
  }
  
  // Obtener eventos creados por este miembro
  const events = await prisma.studio_events.findMany({
    where: {
      studio_id: context.studioId,
      created_by_user_id: memberId,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      promise: {
        include: {
          cotizaciones: {
            where: { status: 'autorizada' },
            include: {
              items: true,
            },
          },
        },
      },
    },
  });
  
  // Calcular comisiones según configuración del studio
  // (implementar lógica de cálculo según reglas de negocio)
  
  return {
    memberId,
    eventsCount: events.length,
    totalCommission: 0, // Calcular según reglas
    events,
  };
}
```

---

## 4. ESTRATEGIA DE INTERFAZ ÚNICA (RBAC)

### 4.1 Componente: Restricción de Acciones por Rol

```typescript
// src/components/studio/rbac/RoleGuard.tsx
"use client";

import { ReactNode } from 'react';
import { useStudioContext } from '@/hooks/use-studio-context';

interface RoleGuardProps {
  allowedRoles: Array<'OWNER' | 'ADMIN' | 'OPERATIVE' | 'SUPPLIER'>;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, fallback = null, children }: RoleGuardProps) {
  const { role } = useStudioContext();
  
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
```

### 4.2 Hook: Contexto de Studio en Cliente

```typescript
// src/hooks/use-studio-context.ts
"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface StudioContext {
  studioSlug: string;
  role: 'OWNER' | 'ADMIN' | 'OPERATIVE' | 'SUPPLIER' | null;
  loading: boolean;
}

export function useStudioContext(): StudioContext {
  const pathname = usePathname();
  const [context, setContext] = useState<StudioContext>({
    studioSlug: '',
    role: null,
    loading: true,
  });
  
  useEffect(() => {
    const match = pathname.match(/^\/([a-zA-Z0-9-]+)\/studio/);
    if (!match) {
      setContext({ studioSlug: '', role: null, loading: false });
      return;
    }
    
    const studioSlug = match[1];
    
    // Obtener rol desde headers (inyectado por middleware)
    fetch(`/api/studio/context?slug=${studioSlug}`)
      .then((res) => res.json())
      .then((data) => {
        setContext({
          studioSlug,
          role: data.role,
          loading: false,
        });
      })
      .catch(() => {
        setContext({ studioSlug, role: null, loading: false });
      });
  }, [pathname]);
  
  return context;
}
```

### 4.3 Ejemplo: Restringir Configuraciones Globales

```typescript
// src/app/[slug]/studio/config/page.tsx
import { RoleGuard } from '@/components/studio/rbac/RoleGuard';
import { ZenButton } from '@/components/ui/zen';

export default function ConfigPage() {
  return (
    <div>
      <h1>Configuración</h1>
      
      {/* Sección visible para todos */}
      <section>
        <h2>Preferencias</h2>
        {/* Contenido accesible para todos los roles */}
      </section>
      
      {/* Sección solo para OWNER/ADMIN */}
      <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
        <section>
          <h2>Configuración Global</h2>
          <ZenButton>Gestionar Plan</ZenButton>
          <ZenButton>Gestionar Equipo</ZenButton>
        </section>
      </RoleGuard>
      
      {/* Sección solo para OWNER */}
      <RoleGuard allowedRoles={['OWNER']}>
        <section>
          <h2>Facturación</h2>
          <ZenButton>Ver Facturas</ZenButton>
          <ZenButton>Cambiar Plan</ZenButton>
        </section>
      </RoleGuard>
    </div>
  );
}
```

### 4.4 Server Action: Verificar Permisos

```typescript
// src/lib/utils/studio-permissions.ts
"use server";

import { requireStudioContext } from './studio-context';

export async function canManageTeam(): Promise<boolean> {
  const context = await requireStudioContext();
  return ['OWNER', 'ADMIN'].includes(context.role);
}

export async function canManageBilling(): Promise<boolean> {
  const context = await requireStudioContext();
  return context.role === 'OWNER';
}

export async function canCreatePromises(): Promise<boolean> {
  const context = await requireStudioContext();
  return ['OWNER', 'ADMIN', 'OPERATIVE'].includes(context.role);
}

export async function canViewEvents(): Promise<boolean> {
  const context = await requireStudioContext();
  return ['OWNER', 'ADMIN', 'OPERATIVE', 'SUPPLIER'].includes(context.role);
}
```

---

## 5. PLAN DE IMPLEMENTACIÓN

### Fase 1: Migración de Schema (Semana 1)

1. **Modificar `user_studio_roles`**
   - Agregar `invited_email` y `invitation_token`
   - Cambiar `@@unique([user_id, studio_id, role])` → `@@unique([user_id, studio_id])`
   - Permitir `user_id` nullable temporalmente (para invitaciones pendientes)

2. **Agregar campos de trazabilidad**
   - `studio_promises.created_by_user_id` y `updated_by_user_id`
   - `studio_events.created_by_user_id` y `converted_at`

3. **Crear migración**
   ```bash
   npx prisma migrate dev --name add_team_support_and_tracking
   ```

### Fase 2: Lógica de Invitación (Semana 1-2)

1. **Server Action: `inviteStudioMember`**
2. **Modificar `procesarUsuarioOAuth`** para vincular invitaciones pendientes
3. **Endpoint API: `/api/studio/invite`** (opcional, para UI)

### Fase 3: Middleware y Contexto (Semana 2)

1. **Crear `middleware.ts`** (reemplazar `proxy.ts`)
2. **Helper `getStudioContext()`** y `requireStudioContext()`
3. **Hook `useStudioContext()`** para cliente

### Fase 4: Actualizar Server Actions (Semana 2-3)

1. **Modificar todas las acciones que crean promesas/eventos**
   - `createPromise` → agregar `created_by_user_id`
   - `autorizarYCrearEvento` → agregar `created_by_user_id`
   - `createCotizacion` → agregar `created_by_user_id` (si aplica)

2. **Actualizar queries** para incluir relaciones de trazabilidad

### Fase 5: RBAC en UI (Semana 3)

1. **Componente `RoleGuard`**
2. **Actualizar layouts** para restringir secciones sensibles
3. **Actualizar navegación** (sidebar) según rol

### Fase 6: Testing y Ajustes (Semana 4)

1. **Testing de flujo completo:**
   - Invitación → Registro → Acceso
   - Creación de promesa → Conversión a evento
   - Verificación de permisos por rol

2. **Migración de datos existentes:**
   - Vincular usuarios existentes a `user_studio_roles`
   - Asignar rol `OWNER` a suscriptores actuales

---

## 6. MIGRACIÓN DE DATOS EXISTENTES

```sql
-- Migración: Vincular usuarios existentes a user_studio_roles
-- Ejecutar después de aplicar cambios en schema

-- 1. Crear registros en user_studio_roles para usuarios existentes
INSERT INTO user_studio_roles (id, user_id, studio_id, role, is_active, invited_at, accepted_at)
SELECT 
  gen_random_uuid()::text,
  u.id,
  sup.studio_id,
  CASE 
    WHEN sup.role = 'suscriptor' THEN 'OWNER'
    WHEN sup.role = 'agente' THEN 'ADMIN'
    ELSE 'OPERATIVE'
  END,
  sup.is_active,
  sup.created_at,
  sup.created_at
FROM studio_user_profiles sup
INNER JOIN users u ON u.email = sup.email
WHERE sup.studio_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_studio_roles usr 
    WHERE usr.user_id = u.id AND usr.studio_id = sup.studio_id
  );

-- 2. Actualizar studio_promises con created_by (asignar al OWNER del studio)
UPDATE studio_promises sp
SET created_by_user_id = (
  SELECT usr.id 
  FROM user_studio_roles usr
  WHERE usr.studio_id = sp.studio_id
    AND usr.role = 'OWNER'
    AND usr.is_active = true
  LIMIT 1
)
WHERE created_by_user_id IS NULL;

-- 3. Actualizar studio_events con created_by
UPDATE studio_events se
SET created_by_user_id = (
  SELECT usr.id 
  FROM user_studio_roles usr
  WHERE usr.studio_id = se.studio_id
    AND usr.role = 'OWNER'
    AND usr.is_active = true
  LIMIT 1
)
WHERE created_by_user_id IS NULL;
```

---

## 7. CHECKLIST DE IMPLEMENTACIÓN

### Schema
- [ ] Modificar `user_studio_roles` (agregar `invited_email`, `invitation_token`)
- [ ] Cambiar unique constraint en `user_studio_roles`
- [ ] Agregar `created_by_user_id` y `updated_by_user_id` a `studio_promises`
- [ ] Agregar `created_by_user_id` y `converted_at` a `studio_events`
- [ ] Crear migración

### Auth & Invitaciones
- [ ] Server Action `inviteStudioMember`
- [ ] Modificar `procesarUsuarioOAuth` para vincular invitaciones
- [ ] Endpoint API `/api/studio/invite` (opcional)

### Middleware & Contexto
- [ ] Crear `middleware.ts` con inyección de headers
- [ ] Helper `getStudioContext()` y `requireStudioContext()`
- [ ] Hook `useStudioContext()` para cliente

### Server Actions
- [ ] Actualizar `createPromise` con trazabilidad
- [ ] Actualizar `autorizarYCrearEvento` con trazabilidad
- [ ] Actualizar otras acciones críticas

### RBAC UI
- [ ] Componente `RoleGuard`
- [ ] Actualizar layouts con restricciones
- [ ] Actualizar navegación según rol

### Testing
- [ ] Testing de flujo de invitación
- [ ] Testing de permisos por rol
- [ ] Testing de trazabilidad

### Migración de Datos
- [ ] Script SQL para vincular usuarios existentes
- [ ] Script SQL para asignar `created_by` en registros existentes

---

## 8. NOTAS IMPORTANTES

### Compatibilidad hacia atrás
- Mantener `studio_user_profiles` para compatibilidad temporal
- Gradualmente migrar a `user_studio_roles` como fuente de verdad

### Seguridad
- Validar permisos en cada Server Action (no confiar solo en UI)
- Usar RLS (Row Level Security) en Supabase para protección adicional

### Performance
- Indexar `user_studio_roles` por `user_id`, `studio_id`, `is_active`
- Cachear contexto de studio en sesión cuando sea posible

### Escalabilidad Futura
- `permissions` JSON en `user_studio_roles` permite permisos granulares
- Considerar sistema de "permisos personalizados" por studio

---

**Fin del Documento**

