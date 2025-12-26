# Plan de Trabajo: Integración Google Completa (Drive + Calendar)

**Fecha de creación:** 2025-01-29  
**Estado:** En progreso (Drive ✅, Calendar ⏳)  
**Prioridad:** Alta

---

## 📋 Resumen Ejecutivo

Implementar integración completa con Google APIs para optimizar entrega de contenido y sincronización de agenda:

- **Google Drive**: Vincular carpetas de Drive a eventos y gestionar entregables ✅ **COMPLETADO**
- **Google Calendar**: Sincronización inteligente con jerarquía de calendarios ⏳ **EN PROGRESO**
  - Eventos principales → Calendario Primario
  - Tareas de cronograma → Calendario Secundario "Tareas De ZEN"
- **Portal Cliente**: Visualizar galería con thumbnails y descargar desde Google ⏳ **PENDIENTE**
- **Beneficio**: $0 costo de almacenamiento, sincronización automática de eventos

---

## 🔍 Análisis del Estado Actual

### Componentes Existentes

**Estudio:**

- ✅ `EventDeliverablesCard.tsx` - Gestión básica de entregables con `file_url` manual
- ✅ `deliverables.actions.ts` - CRUD de entregables
- ✅ Schema: `studio_event_deliverables` con `file_url` (string opcional)
- ✅ Google Drive integrado y funcionando

**Portal Cliente:**

- ✅ `entrega-digital/page.tsx` - Placeholder vacío
- ✅ Layout y contexto de evento configurados
- ❌ Sin componente de galería

**Agenda y Eventos:**

- ✅ `studio_agenda` con `google_event_id` (ya implementado)
- ❌ `studio_events` sin `google_event_id`
- ❌ `studio_scheduler_event_tasks` sin campos de Google Calendar

### Limitaciones Actuales

1. ✅ **Google Drive**: Implementado y funcionando
2. ⏳ **Google Calendar**: Solo agenda básica, falta eventos principales y tareas
3. ⏳ **Portal Cliente**: Sin visualización de galería desde Drive

---

## 🗄️ Fase 1: Actualización de Schema

### Arquitectura Multi-Tenant

**Separación de responsabilidades:**

- **`platform_config`**: Credenciales OAuth compartidas (un solo set para toda la plataforma)
  - `google_oauth_client_id` - Client ID compartido ✅
  - `google_oauth_client_secret` - Client Secret (encriptado) ✅
  - `google_api_key` - API Key para Google Picker ✅
  - `google_oauth_redirect_uri` - URI de callback ✅
  - `timezone` - Timezone por defecto (default: "America/Mexico_City") ✅

- **`studios`**: Tokens específicos de cada estudio (cada estudio conecta su propia cuenta)
  - `google_oauth_refresh_token` - Token de refresh (encriptado) ✅
  - `google_oauth_email` - Email de la cuenta Google ✅
  - `google_oauth_scopes` - Scopes autorizados (JSON array) ✅
  - `is_google_connected` - Estado de conexión ✅
  - `google_calendar_secondary_id` - ID del calendario "Tareas De ZEN" ⏳ **NUEVO**

### 1.1 Migración: Campos en `platform_config` ✅ **COMPLETADO**

Ya implementado en migración anterior.

### 1.2 Migración: Campos en `studios` ✅ **COMPLETADO** + ⏳ **NUEVO**

**Ya implementado:**

- `google_oauth_refresh_token`
- `google_oauth_email`
- `google_oauth_scopes`
- `is_google_connected`

**Nuevo campo requerido:**

```sql
-- Agregar campo para calendario secundario
ALTER TABLE "studios"
ADD COLUMN IF NOT EXISTS "google_calendar_secondary_id" TEXT;
```

**Schema Prisma:**

```prisma
model studios {
  // ... campos existentes
  google_oauth_refresh_token     String?  // ✅ Ya existe
  google_oauth_email             String?  // ✅ Ya existe
  google_oauth_scopes            String?  // ✅ Ya existe
  is_google_connected            Boolean  @default(false) // ✅ Ya existe
  google_calendar_secondary_id   String?  // ⏳ NUEVO
}
```

### 1.3 Migración: Campos en `studio_event_deliverables` ✅ **COMPLETADO**

Ya implementado con `google_folder_id`, `delivery_mode`, `drive_metadata_cache`.

### 1.4 Migración: Campos en `studio_events` ⏳ **NUEVO**

```sql
-- Agregar google_event_id a eventos principales
ALTER TABLE studio_eventos
ADD COLUMN google_event_id TEXT;

CREATE INDEX idx_studio_events_google_event_id
ON studio_eventos(google_event_id);
```

**Schema Prisma:**

```prisma
model studio_events {
  // ... campos existentes
  google_event_id String?
  @@index([google_event_id])
}
```

### 1.5 Migración: Campos en `studio_scheduler_event_tasks` ⏳ **NUEVO**

```sql
-- Agregar campos de Google Calendar a tareas de cronograma
ALTER TABLE studio_scheduler_event_tasks
ADD COLUMN google_calendar_id TEXT,
ADD COLUMN google_event_id TEXT;

CREATE INDEX idx_scheduler_tasks_google_calendar_id
ON studio_scheduler_event_tasks(google_calendar_id);
CREATE INDEX idx_scheduler_tasks_google_event_id
ON studio_scheduler_event_tasks(google_event_id);
```

**Schema Prisma:**

```prisma
model studio_scheduler_event_tasks {
  // ... campos existentes
  google_calendar_id String?
  google_event_id    String?
  @@index([google_calendar_id])
  @@index([google_event_id])
}
```

### 1.6 Migración: Campo en `studio_agenda` ✅ **COMPLETADO**

Ya implementado con `google_event_id`.

---

## 🔐 Fase 2: Autenticación OAuth2 Google ✅ **COMPLETADO**

### 2.1-2.5 ✅ **YA IMPLEMENTADO**

- ✅ Configuración de credenciales
- ✅ Dependencias instaladas
- ✅ Server Actions OAuth2
- ✅ API Routes callback
- ✅ Utilidades de encriptación

**Nota:** Agregar scope `https://www.googleapis.com/auth/calendar` cuando se implemente Calendar.

---

## 📁 Fase 3: Server Actions Google Drive API ✅ **COMPLETADO**

### 3.1-3.6 ✅ **YA IMPLEMENTADO**

- ✅ Google Drive Client
- ✅ Server Actions para Drive
- ✅ Vincular carpetas a entregables

---

## 🎨 Fase 4: Componentes Estudio ✅ **COMPLETADO**

### 4.1-4.4 ✅ **YA IMPLEMENTADO**

- ✅ EventDeliverablesCard mejorado
- ✅ GoogleDriveFolderPicker
- ✅ Página de configuración integraciones

---

## 👤 Fase 5: Componentes Portal Cliente ⏳ **PENDIENTE**

### 5.1-5.3 ⏳ **PENDIENTE**

- ⏳ DeliverablesGallery component
- ⏳ Actualizar entrega-digital/page.tsx
- ⏳ Server Actions para cliente

---

## 📅 Fase 6: Integración Google Calendar (Sincronización Inteligente) ⏳ **EN PROGRESO**

### 6.1 Objetivo

Implementar sincronización bidireccional entre la agenda de De Sen y Google Calendar con:

- **Jerarquía de Calendarios:**
  - Eventos principales (`studio_events`) → Calendario Primario del usuario
  - Tareas de cronograma (`studio_scheduler_event_tasks`) → Calendario Secundario "Tareas De ZEN"
- **Invitaciones Automáticas:** Personal asignado recibe invitación como attendee
- **Timezone Dinámico:** Navegador → Estudio → Platform Config → Default
- **Manejo de Borrado:** Sincronizar eliminaciones con Google Calendar

### 6.2 Gestión de Calendario Secundario

**Estrategia:**

1. Verificar existencia del calendario "Tareas De ZEN" al conectar Google Calendar
2. Si no existe, crearlo usando `calendar.calendars.insert()`
3. Guardar `calendarId` en `studios.google_calendar_secondary_id`

**Implementación:**

```typescript
async function obtenerOCrearCalendarioSecundario(studioSlug: string) {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true, google_calendar_secondary_id: true },
  });

  // Si ya existe ID guardado, verificar que sigue existiendo
  if (studio.google_calendar_secondary_id) {
    try {
      const calendar = await calendarAPI.calendars.get({
        calendarId: studio.google_calendar_secondary_id,
      });
      if (calendar.data) return calendar.data.id;
    } catch (error) {
      console.warn(
        "[Google Calendar] Calendario secundario no encontrado, creando nuevo..."
      );
    }
  }

  // Obtener timezone del estudio o usar default
  const timezone = await obtenerTimezoneEstudio(studioSlug);

  // Crear nuevo calendario
  const newCalendar = await calendarAPI.calendars.insert({
    requestBody: {
      summary: "Tareas De ZEN",
      description: "Tareas de cronograma y post-producción",
      timeZone: timezone,
    },
  });

  // Guardar ID
  await prisma.studios.update({
    where: { id: studio.id },
    data: { google_calendar_secondary_id: newCalendar.data.id },
  });

  return newCalendar.data.id;
}
```

### 6.3 Timezone Dinámico

**Estrategia de Prioridad:**

1. **Timezone del navegador** (si se pasa como parámetro desde el cliente)
2. **Timezone del estudio** (si existe en `studios.timezone` - futuro)
3. **Timezone de `platform_config`** (default: "America/Mexico_City")

**Implementación:**

```typescript
async function obtenerTimezoneEstudio(
  studioSlug: string,
  userTimezone?: string
): Promise<string> {
  // 1. Prioridad: timezone del usuario (navegador)
  if (userTimezone) {
    return userTimezone;
  }

  // 2. Buscar timezone del estudio (si se agrega en el futuro)
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { timezone: true }, // Campo futuro
  });

  if (studio?.timezone) {
    return studio.timezone;
  }

  // 3. Fallback: platform_config
  const config = await prisma.platform_config.findFirst({
    select: { timezone: true },
  });

  return config?.timezone || "America/Mexico_City";
}
```

### 6.4 Flujo de Invitaciones

**Estructura del evento con attendees:**

```typescript
const eventResource = {
  summary: task.name,
  description: task.description || "",
  start: {
    dateTime: task.start_date.toISOString(),
    timeZone: await obtenerTimezoneEstudio(studioSlug),
  },
  end: {
    dateTime: task.end_date.toISOString(),
    timeZone: await obtenerTimezoneEstudio(studioSlug),
  },
  attendees: await obtenerEmailsColaboradores(task.assigned_to_user_id),
  sendUpdates: "all", // Envía notificaciones automáticas
};

// Obtener emails desde user_studio_roles → users
async function obtenerEmailsColaboradores(assignedToUserId: string | null) {
  if (!assignedToUserId) return [];

  const userRole = await prisma.user_studio_roles.findUnique({
    where: { id: assignedToUserId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  return userRole?.user?.email ? [{ email: userRole.user.email }] : [];
}
```

**Nota:** Para eventos principales (`studio_events`), **NO incluir attendees** por defecto (opcional: cliente si se requiere).

### 6.5 Estrategia de Actualización

**Principio:** Evitar duplicados verificando `google_event_id` antes de crear.

**Flujo de actualización:**

```typescript
async function sincronizarTareaConGoogle(
  taskId: string,
  userTimezone?: string
) {
  const task = await prisma.studio_scheduler_event_tasks.findUnique({
    where: { id: taskId },
    include: {
      scheduler_instance: {
        include: {
          event: {
            include: {
              studio: true,
            },
          },
        },
      },
    },
  });

  const studio = task.scheduler_instance.event.studio;
  const calendarId = await obtenerOCrearCalendarioSecundario(studio.slug);
  const timezone = await obtenerTimezoneEstudio(studio.slug, userTimezone);

  // Si ya tiene google_event_id, actualizar
  if (task.google_event_id) {
    await calendarAPI.events.update({
      calendarId,
      eventId: task.google_event_id,
      requestBody: {
        summary: task.name,
        description: task.description || "",
        start: {
          dateTime: task.start_date.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: task.end_date.toISOString(),
          timeZone: timezone,
        },
        attendees: await obtenerEmailsColaboradores(task.assigned_to_user_id),
      },
      sendUpdates: "all",
    });
  } else {
    // Crear nuevo evento
    const event = await calendarAPI.events.insert({
      calendarId,
      requestBody: {
        summary: task.name,
        description: task.description || "",
        start: {
          dateTime: task.start_date.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: task.end_date.toISOString(),
          timeZone: timezone,
        },
        attendees: await obtenerEmailsColaboradores(task.assigned_to_user_id),
      },
      sendUpdates: "all",
    });

    // Guardar google_event_id
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: {
        google_calendar_id: calendarId,
        google_event_id: event.data.id,
      },
    });
  }
}
```

### 6.6 Manejo de Borrado

**Estrategia:** Sincronizar eliminaciones con Google Calendar para mantener limpieza.

**Flujo de eliminación:**

```typescript
async function eliminarEventoDeGoogle(
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await calendarAPI.events.delete({
      calendarId,
      eventId,
      sendUpdates: "all", // Notificar a attendees que el evento fue cancelado
    });
  } catch (error) {
    // Si el evento ya no existe en Google, no es error crítico
    if (error.code === 404) {
      console.warn("[Google Calendar] Evento ya no existe en Google:", eventId);
      return;
    }
    throw error;
  }
}

async function sincronizarEliminacionTarea(taskId: string) {
  const task = await prisma.studio_scheduler_event_tasks.findUnique({
    where: { id: taskId },
    select: {
      google_calendar_id: true,
      google_event_id: true,
    },
  });

  // Solo eliminar si tiene google_event_id
  if (task?.google_event_id && task?.google_calendar_id) {
    await eliminarEventoDeGoogle(task.google_calendar_id, task.google_event_id);
  }
}

async function sincronizarEliminacionEvento(eventId: string) {
  const event = await prisma.studio_events.findUnique({
    where: { id: eventId },
    select: {
      google_event_id: true,
      studio: {
        select: {
          google_oauth_email: true, // Calendario primario del usuario
        },
      },
    },
  });

  // Solo eliminar si tiene google_event_id
  if (event?.google_event_id && event.studio?.google_oauth_email) {
    // Usar calendario primario (email del usuario)
    await eliminarEventoDeGoogle(
      event.studio.google_oauth_email,
      event.google_event_id
    );
  }
}
```

### 6.7 Server Actions: Google Calendar API

**Archivo:** `src/lib/integrations/google-calendar/client.ts` (nuevo)

**Cliente base (similar a Drive):**

```typescript
export async function getGoogleCalendarClient(studioSlug: string) {
  // Reutilizar patrón de getGoogleDriveClient
  // Obtener credenciales OAuth compartidas
  // Obtener refresh_token del estudio
  // Crear OAuth2 client con googleapis
  // Configurar refresh token
  // Retornar calendar API client
}
```

**Archivo:** `src/lib/integrations/google-calendar/sync-tasks.ts` (nuevo)

**Funciones:**

- `sincronizarTareaCronograma(taskId: string, userTimezone?: string)` - Sincronizar tarea
- `obtenerEmailsColaboradores(assignedToUserId: string | null)` - Obtener emails

**Archivo:** `src/lib/integrations/google-calendar/sync-events.ts` (nuevo)

**Funciones:**

- `sincronizarEventoPrincipal(eventId: string, userTimezone?: string)` - Sincronizar evento principal

**Archivo:** `src/lib/integrations/google-calendar/calendar-manager.ts` (nuevo)

**Funciones:**

- `obtenerOCrearCalendarioSecundario(studioSlug: string)` - Gestión de calendario secundario

**Archivo:** `src/lib/integrations/google-calendar/timezone.ts` (nuevo)

**Funciones:**

- `obtenerTimezoneEstudio(studioSlug: string, userTimezone?: string)` - Timezone dinámico

**Archivo:** `src/lib/integrations/google-calendar/delete-sync.ts` (nuevo)

**Funciones:**

- `eliminarEventoDeGoogle(calendarId: string, eventId: string)` - Eliminar evento
- `sincronizarEliminacionTarea(taskId: string)` - Sincronizar borrado de tarea
- `sincronizarEliminacionEvento(eventId: string)` - Sincronizar borrado de evento

### 6.8 Integración en Funciones Existentes

**Tareas de cronograma:**

**Archivo:** `src/lib/actions/studio/business/events/events.actions.ts`

1. **`crearSchedulerTask`** (línea 2174) - Después de crear:

   ```typescript
   const task = await prisma.studio_scheduler_event_tasks.create({
     /* ... */
   });

   // Sincronización en background
   setTimeout(async () => {
     try {
       await sincronizarTareaCronograma(task.id, userTimezone);
     } catch (error) {
       console.error("[Google Calendar] Error sincronizando tarea:", error);
     }
   }, 0);
   ```

2. **`actualizarSchedulerTask`** (línea 2283) - Después de actualizar:

   ```typescript
   await prisma.studio_scheduler_event_tasks.update({
     /* ... */
   });

   // Sincronización en background
   setTimeout(async () => {
     try {
       await sincronizarTareaCronograma(taskId, userTimezone);
     } catch (error) {
       console.error("[Google Calendar] Error sincronizando tarea:", error);
     }
   }, 0);
   ```

3. **`eliminarSchedulerTask`** (línea 2584) - Antes de eliminar:

   ```typescript
   // Obtener google_event_id antes de eliminar
   const task = await prisma.studio_scheduler_event_tasks.findUnique({
     where: { id: taskId },
     select: {
       google_calendar_id: true,
       google_event_id: true,
     },
   });

   // Eliminar de DB
   await prisma.studio_scheduler_event_tasks.delete({ where: { id: taskId } });

   // Sincronizar eliminación en background
   if (task?.google_event_id && task?.google_calendar_id) {
     setTimeout(async () => {
       try {
         await eliminarEventoDeGoogle(
           task.google_calendar_id,
           task.google_event_id
         );
       } catch (error) {
         console.error("[Google Calendar] Error eliminando evento:", error);
       }
     }, 0);
   }
   ```

4. **`asignarCrewAItem`** (línea 1895) - Si cambia asignación:
   ```typescript
   // Si se actualiza assigned_to_user_id, disparar sincronización
   if (crewMemberId !== previousCrewMemberId) {
     // Buscar tarea asociada y sincronizar
     setTimeout(async () => {
       try {
         await sincronizarTareaCronograma(task.id, userTimezone);
       } catch (error) {
         console.error("[Google Calendar] Error sincronizando tarea:", error);
       }
     }, 0);
   }
   ```

**Eventos principales:**

**Archivo:** `src/app/admin/_lib/actions/evento/evento.actions.ts`

1. **`crearEvento`** - Después de crear:

   ```typescript
   const nuevoEvento = await prisma.evento.create({
     /* ... */
   });

   // Sincronización en background
   setTimeout(async () => {
     try {
       await sincronizarEventoPrincipal(nuevoEvento.id, userTimezone);
     } catch (error) {
       console.error("[Google Calendar] Error sincronizando evento:", error);
     }
   }, 0);
   ```

2. **`actualizarEvento`** - Después de actualizar:

   ```typescript
   await prisma.evento.update({
     /* ... */
   });

   // Sincronización en background
   setTimeout(async () => {
     try {
       await sincronizarEventoPrincipal(eventId, userTimezone);
     } catch (error) {
       console.error("[Google Calendar] Error sincronizando evento:", error);
     }
   }, 0);
   ```

**Agenda (ya implementado):**

**Archivo:** `src/lib/actions/shared/agenda-unified.actions.ts`

- ✅ Ya tiene integración básica con `google_event_id`
- ⏳ Ampliar para usar timezone dinámico

### 6.9 Configuración de Scopes

**Scopes necesarios:**

- `https://www.googleapis.com/auth/drive.readonly` ✅ Ya implementado
- `https://www.googleapis.com/auth/calendar` ⏳ Agregar para Calendar
- `https://www.googleapis.com/auth/calendar.events` ⏳ Agregar para Calendar

**En OAuth flow:**

```typescript
const scopes = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];
```

### 6.10 UI: Configuración de Sincronización

**Archivo:** `src/app/[slug]/studio/config/integraciones/page.tsx`

**Agregar:**

- Toggle "Sincronizar con Google Calendar"
- Estado de sincronización (última sync)
- Botón "Sincronizar ahora" (manual)
- Lista de eventos sincronizados
- Configuración de calendario secundario

---

## 📊 Resumen de Arquitectura

| Acción en De Sen                     | Destino Google             | Invitación                   | Función                              | Timezone |
| ------------------------------------ | -------------------------- | ---------------------------- | ------------------------------------ | -------- |
| Crear `studio_events`                | Calendario Primario        | No (opcional cliente)        | `sincronizarEventoPrincipal()`       | Dinámico |
| Crear `studio_scheduler_event_tasks` | Calendario "Tareas De ZEN" | Sí (colaborador)             | `sincronizarTareaCronograma()`       | Dinámico |
| Actualizar fecha de tarea            | Actualizar evento          | Sí (notificación automática) | `sincronizarTareaCronograma()`       | Dinámico |
| Reasignar personal                   | Actualizar attendees       | Sí (notificación automática) | `sincronizarTareaCronograma()`       | Dinámico |
| **Eliminar tarea**                   | **Eliminar evento**        | Sí (notificación automática) | **`sincronizarEliminacionTarea()`**  | **N/A**  |
| **Eliminar evento**                  | **Eliminar evento**        | Sí (notificación automática) | **`sincronizarEliminacionEvento()`** | **N/A**  |
| Crear `studio_agenda`                | Calendario Primario        | No                           | `crearEventoCalendar()` ✅           | Dinámico |

---

## ⚙️ Consideraciones Técnicas

### 1. Scopes OAuth

- ✅ `https://www.googleapis.com/auth/drive.readonly` - Ya implementado
- ⏳ `https://www.googleapis.com/auth/calendar` - Agregar para Calendar
- ⏳ `https://www.googleapis.com/auth/calendar.events` - Agregar para Calendar

### 2. Rate Limits

Google Calendar permite ~1,000 requests/100s. Implementar throttling si es necesario.

### 3. Manejo de Errores

Si falla la sincronización, **NO debe afectar** la operación principal. Usar try-catch y logging.

### 4. Sincronización Bidireccional

Esta fase es **unidireccional** (De Sen → Google). La bidireccional requiere webhooks de Google (fase futura).

### 5. Timezone

- Prioridad: Navegador → Estudio → Platform Config → Default
- Siempre usar timezone dinámico, nunca hardcodear

### 6. Borrado

- Verificar `google_event_id` antes de intentar eliminar
- Manejar errores 404 (evento ya no existe) como no críticos
- Usar `sendUpdates: 'all'` para notificar a attendees

---

## 📋 Plan de Implementación

### ✅ Completado - Google Drive

- ✅ Fase 1: Migraciones de schema
- ✅ Fase 2: Autenticación OAuth2
- ✅ Fase 3: Google Drive API
- ✅ Fase 4: Componentes Estudio

### ⏳ Pendiente - Portal Cliente

- ⏳ Fase 5: Componentes Portal Cliente
  - ⏳ DeliverablesGallery component
  - ⏳ Actualizar entrega-digital/page.tsx
  - ⏳ Server Actions para cliente

### ⏳ En Progreso - Google Calendar

#### Fase 6.1: Migración de Base de Datos

- [ ] Crear migración SQL para agregar campos:
  - [ ] `google_calendar_secondary_id` en `studios`
  - [ ] `google_event_id` en `studio_events`
  - [ ] `google_calendar_id` y `google_event_id` en `studio_scheduler_event_tasks`
- [ ] Actualizar Prisma schema
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar índices

#### Fase 6.2: Cliente de Google Calendar

- [ ] Crear `getGoogleCalendarClient` (reutilizar patrón de Drive)
- [ ] Agregar scope `calendar` a OAuth
- [ ] Probar autenticación

#### Fase 6.3: Gestión de Calendario Secundario

- [ ] Implementar `obtenerOCrearCalendarioSecundario`
- [ ] Probar creación y verificación de calendario
- [ ] Guardar `google_calendar_secondary_id` en DB

#### Fase 6.4: Timezone Dinámico

- [ ] Implementar `obtenerTimezoneEstudio`
- [ ] Integrar en todas las funciones de sincronización
- [ ] Probar con diferentes timezones

#### Fase 6.5: Sincronización de Eventos Principales

- [ ] Implementar `sincronizarEventoPrincipal`
- [ ] Integrar en `crearEvento` y `actualizarEvento`
- [ ] Probar creación y actualización

#### Fase 6.6: Sincronización de Tareas con Invitaciones

- [ ] Implementar `obtenerEmailsColaboradores`
- [ ] Implementar `sincronizarTareaCronograma`
- [ ] Integrar en `crearSchedulerTask` y `actualizarSchedulerTask`
- [ ] Probar invitaciones automáticas

#### Fase 6.7: Manejo de Borrado

- [ ] Implementar `eliminarEventoDeGoogle`
- [ ] Implementar `sincronizarEliminacionTarea`
- [ ] Implementar `sincronizarEliminacionEvento`
- [ ] Integrar en `eliminarSchedulerTask`
- [ ] Probar eliminación y notificaciones

#### Fase 6.8: Hooks en Funciones Existentes

- [ ] Agregar hooks en todas las funciones identificadas
- [ ] Implementar ejecución en background
- [ ] Manejo de errores robusto

#### Fase 6.9: Testing y Manejo de Errores

- [ ] Tests unitarios para cada función
- [ ] Tests de integración con Google Calendar API
- [ ] Manejo de edge cases (eventos eliminados, timezones inválidos, etc.)
- [ ] Documentación de errores comunes

---

## 🎯 Checklist de Validación

### Google Drive ✅

- [x] Estudios pueden conectar Google Drive
- [x] Entregables vinculados a carpetas de Drive
- [x] Selector de carpetas funcionando
- [x] Página de configuración de integraciones

### Portal Cliente ⏳

- [ ] Clientes visualizan galería con thumbnails
- [ ] Descargas funcionan desde Google directamente
- [ ] Tiempo de carga < 2s para galerías

### Google Calendar ⏳

- [ ] Eventos principales se crean en calendario primario
- [ ] Tareas se crean en calendario secundario "Tareas De ZEN"
- [ ] Invitaciones se envían automáticamente a colaboradores
- [ ] Timezone se detecta dinámicamente (navegador/estudio/config)
- [ ] Actualizaciones de fecha sincronizan correctamente
- [ ] Reasignación de personal actualiza attendees
- [ ] Eliminación de tareas elimina eventos en Google
- [ ] Eliminación de eventos elimina eventos en Google
- [ ] Errores de sincronización no afectan operaciones principales
- [ ] Calendario secundario se crea automáticamente si no existe
- [ ] Rate limits de Google Calendar respetados

---

## 📚 Referencias y Recursos

- [Google Drive API Docs](https://developers.google.com/drive/api)
- [Google Calendar API Docs](https://developers.google.com/calendar/api)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Picker API](https://developers.google.com/picker)

---

## ⚠️ Consideraciones de Seguridad

1. **Tokens Encriptados**: `refresh_token` siempre encriptado en DB ✅
2. **Scopes Mínimos**: Solo scopes necesarios para cada funcionalidad
3. **Validación de Permisos**: Verificar que el estudio sea dueño del evento/tarea
4. **Rate Limiting**: Implementar límites en llamadas a Google API
5. **Error Handling**: Manejar tokens expirados, eventos eliminados, etc.

---

## 📝 Notas Adicionales

- **Prioridad de Timezone:** Navegador > Estudio > Platform Config > Default
- **Borrado:** Siempre verificar `google_event_id` antes de intentar eliminar
- **Errores:** Logging detallado pero no bloquear operaciones principales
- **Futuro:** Considerar sincronización bidireccional con webhooks de Google

---

**Última actualización:** 2025-01-29
