# Decisiones de Refactorización: Events Architecture

## 📊 Análisis de Uso Actual

### 1. `studio_event_team` - ❌ ELIMINAR

**Búsqueda en código:**

```bash
grep -r "studio_event_team" src/
# Resultado: NO SE USA
```

**Razón:**

- Modelo no utilizado en ninguna action o componente
- La asignación real se hace en:
  - `studio_cotizacion_items.assigned_to_crew_member_id` (por item)
  - `studio_gantt_event_tasks.assigned_to_user_id` (por tarea gantt)
- Duplica funcionalidad sin aportar valor

**✅ DECISIÓN: ELIMINAR**

---

### 2. `studio_event_tasks` vs Gantt Tasks - ✅ MANTENER SEPARADOS

**Búsqueda en código:**

```bash
grep -r "studio_event_tasks" src/
# Resultado: NO SE USA actualmente
```

**Análisis:**

- `studio_event_tasks`: Tareas simples sin estructura (notas/recordatorios)
- `studio_gantt_event_tasks`: Tareas estructuradas ligadas a items/presupuesto

**Propósito diferente:**

- **Gantt tasks**: Tracking operativo de items cotizados
- **Event tasks**: To-do list flexible, notas rápidas

**✅ DECISIÓN: MANTENER AMBOS**

- Gantt = Operación formal
- Event tasks = Gestión informal/notas

**Consideración:** Si NO se usa `studio_event_tasks`, considerar eliminarlo en el futuro si no se implementa su UI.

---

### 3. Pipelines: `studio_events_stage` vs `studio_manager_pipeline_stages`

#### Uso Actual

**`studio_events_stage`:**

```typescript
// src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts:1053
const primeraEtapa = await prisma.studio_events_stage.findFirst({
  where: {
    studio_id: studio.id,
    is_active: true,
  },
  orderBy: { order: "asc" },
});

// Usado SOLO al AUTORIZAR cotización
event_stage_id: primeraEtapa.id;
```

**`studio_manager_pipeline_stages`:**

```bash
grep -r "studio_manager_pipeline" src/
# Resultado: NO SE USA en código actual
```

#### Análisis Semántico

**`studio_events_stage` (Actual)**

- Nombre: "Etapa de Evento"
- Simple: `name`, `slug`, `order`, `is_active`, `is_system`
- Sin `color`, sin `description`, sin `stage_type`
- **Contexto**: Parece ser pipeline inicial/legacy

**`studio_manager_pipeline_stages` (Más completo)**

- Nombre: "Etapa de Pipeline Manager"
- Rico: `name`, `slug`, `description`, `color`, `order`
- **Tiene `stage_type: ManagerStageType`** ← IMPORTANTE
- `is_active`, `is_system`
- **Contexto**: Diseñado para gestión operativa avanzada

#### ManagerStageType Enum

```prisma
enum ManagerStageType {
  PLANNING
  PRODUCTION
  REVIEW
  DELIVERY
  ARCHIVED
}
```

### 📊 Comparación

| Feature                 | `studio_events_stage`      | `studio_manager_pipeline_stages` |
| ----------------------- | -------------------------- | -------------------------------- |
| Color                   | ❌                         | ✅                               |
| Description             | ❌                         | ✅                               |
| Stage Type Enum         | ❌                         | ✅ (crítico)                     |
| Usado actualmente       | ✅ (solo autorizar)        | ❌                               |
| Semánticamente correcto | ⚠️ "events stage" genérico | ✅ "manager pipeline" específico |
| Escalabilidad           | ⚠️ Limitado                | ✅ Completo                      |

#### Propuesta: Migración Semántica

**Problema:**

- `studio_events_stage` tiene nombre genérico pero se usa solo para operación
- `studio_manager_pipeline_stages` es más rico pero NO se usa
- Tener ambos duplica funcionalidad

**Solución: Unificar en `studio_manager_pipeline_stages`**

**Razones:**

1. **Más semántico**: "Manager Pipeline" indica gestión operativa del evento
2. **Más completo**: Color, description, stage_type
3. **stage_type enum** permite lógica por tipo de etapa
4. **Escalable**: Preparado para features avanzadas

**✅ DECISIÓN FINAL: Eliminar `studio_events_stage`, usar `studio_manager_pipeline_stages`**

**Renaming semántico opcional:**

```prisma
// Opción 1: Mantener nombre actual
studio_manager_pipeline_stages

// Opción 2: Simplificar (más claro)
studio_event_pipeline_stages

// Opción 3: Más corto
studio_event_stages_v2
```

**Recomendación: Mantener `studio_manager_pipeline_stages`**

- Ya está en schema
- Nombre correcto: indica gestión operativa
- Cambiar nombre requiere migración adicional
- Beneficio no justifica complejidad

---

### 4. Revisiones en Items - ✅ OPCIONAL por tipo

**Propuesta:**

```prisma
model studio_cotizacion_items {
  // Tracking de revisiones (OPCIONAL según task_type)
  internal_review_required    Boolean @default(false)
  client_review_required      Boolean @default(false)

  internal_delivered_at       DateTime?
  internal_approved_at        DateTime?
  internal_rejected_at        DateTime?
  internal_rejection_notes    String?

  client_delivered_at         DateTime?
  client_approved_at          DateTime?
  client_rejected_at          DateTime?
  client_rejection_notes      String?

  revision_count              Int @default(0)
  max_revisions_allowed       Int? // null = ilimitadas
}
```

**Lógica:**

- Items tipo `OPERATION` → No requieren revisión (fotografía del día)
- Items tipo `EDITING` → Requieren ambas revisiones
- Items tipo `DELIVERY` → Solo revisión de entrega

**✅ DECISIÓN: Campos opcionales + flags de requerimiento**

---

### 5. Gantt - ✅ COMPLETAMENTE OPCIONAL

**Análisis:**

```bash
grep -r "gantt_templates|gantt_event_instances" src/
# Resultado: NO se usa actualmente
```

**Sistema Gantt:**

- ✅ Bien diseñado y preparado
- ❌ No implementado en UI
- ✅ Relación `cotizacion_item_id` lista

**Flujo propuesto:**

**Opción A: Sin Gantt (Simple)**

```
Event creado → Items sin gantt_task_id
Tracking directo en cotizacion_items:
  - assigned_to_crew_member_id
  - status
  - delivery dates
```

**Opción B: Con Gantt (Avanzado)**

```
Event creado → User activa Gantt
  ↓
1. Selecciona template (opcional)
2. Crea gantt_event_instance
3. Genera gantt_event_tasks desde:
   - Template tasks (si hay)
   - O crea custom tasks
4. Asocia items existentes:
   cotizacion_items.gantt_task_id → gantt_event_tasks.id
5. Items SIN gantt_task_id siguen funcionando normal
```

**Ventajas Gantt opcional:**

- Studios básicos: tracking simple en items
- Studios avanzados: gantt completo
- Migración gradual: pueden activar después
- Items sin gantt siguen funcionando

**✅ DECISIÓN: Gantt 100% opcional, items funcionan sin él**

---

### 6. Tags en Events - ❌ OMITIR

**Propuesta del usuario:**

> "Mejor la etapa del gantt se muestre como badge"

**Análisis:**

- Events ya tienen `stage_id` (pipeline)
- Gantt tasks ya tienen `category` (PRE_PRODUCTION/PRODUCTION/POST_PRODUCTION)
- Agregar tags sería redundante

**Alternativa:**

```typescript
// Badge del evento = Stage actual
<Badge color={event.stage.color}>
  {event.stage.name}
</Badge>

// Badge de tarea gantt = Category
<Badge>
  {task.category} // PRE_PRODUCTION, etc
</Badge>

// Badge de item = Status
<Badge>
  {item.status} // PENDING, IN_PROGRESS, etc
</Badge>
```

**✅ DECISIÓN: NO agregar tags, usar stages + categories + status como badges**

---

## 🎯 Decisiones Finales Consolidadas

### ✅ MANTENER

1. ✅ `studio_manager_pipeline_stages` (único pipeline)
2. ✅ `studio_cotizacion_items` (con mejoras)
3. ✅ Todo sistema Gantt (opcional)
4. ✅ `studio_event_tasks` (tareas simples, diferente propósito)
5. ✅ `studio_crew_members` y asignaciones
6. ✅ `studio_nominas` con link a items

### 🗑️ ELIMINAR

1. ❌ `studio_events_stage` (legacy)
2. ❌ `studio_event_team` (no usado, duplicado)
3. ❌ Campo `event_stage_id` en `studio_events`

### 🔧 MODIFICAR

#### 1. `studio_events`

```prisma
model studio_events {
  // ELIMINAR
  - event_stage_id String?
  - event_stage studio_events_stage?

  // CAMBIAR status a enum
  status EventStatus @default(ACTIVE)

  // MANTENER
  stage_id String?
  stage studio_manager_pipeline_stages?
}
```

#### 2. `studio_cotizacion_items`

```prisma
model studio_cotizacion_items {
  // AGREGAR enums
  task_type CotizacionItemType?
  status ItemStatus @default(PENDING)

  // AGREGAR tracking revisiones (opcional)
  internal_review_required Boolean @default(false)
  client_review_required Boolean @default(false)

  internal_delivered_at DateTime?
  internal_approved_at DateTime?
  internal_rejected_at DateTime?

  client_delivered_at DateTime?
  client_approved_at DateTime?
  client_rejected_at DateTime?

  revision_count Int @default(0)
  max_revisions_allowed Int?
}
```

#### 3. Agregar Enums

```prisma
enum CotizacionItemType {
  OPERATION    // Día evento
  EDITING      // Post-producción
  DELIVERY     // Entrega
  CUSTOM       // Personalizado
}

enum ItemStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  INTERNAL_REVIEW
  INTERNAL_APPROVED
  CLIENT_REVIEW
  CLIENT_APPROVED
  COMPLETED
  CANCELLED
}

enum EventStatus {
  ACTIVE
  IN_PROGRESS
  COMPLETED
  CANCELLED
  ARCHIVED
}
```

---

## 📝 Orden de Refactorización

### Paso 1: Migración de Stages (Crítico)

```typescript
// Migrar datos de studio_events_stage → studio_manager_pipeline_stages
// Si no existen etapas en manager_pipeline, crear defaults:

const defaultStages = [
  { name: "Planeación", slug: "planning", stage_type: "PLANNING", order: 1 },
  {
    name: "Producción",
    slug: "production",
    stage_type: "PRODUCTION",
    order: 2,
  },
  { name: "Revisión", slug: "review", stage_type: "REVIEW", order: 3 },
  { name: "Entrega", slug: "delivery", stage_type: "DELIVERY", order: 4 },
  { name: "Archivado", slug: "archived", stage_type: "ARCHIVED", order: 5 },
];
```

### Paso 2: Actualizar eventos existentes

```sql
-- Mapear event_stage_id → stage_id
UPDATE studio_events
SET stage_id = (
  SELECT id FROM studio_manager_pipeline_stages
  WHERE studio_id = studio_events.studio_id
  AND stage_type = 'PLANNING'
  LIMIT 1
)
WHERE event_stage_id IS NOT NULL AND stage_id IS NULL;
```

### Paso 3: Schema Changes (db push)

```prisma
// 1. Eliminar studio_events_stage
// 2. Eliminar event_stage_id
// 3. Eliminar studio_event_team
// 4. Agregar enums
// 5. Agregar campos tracking en items
```

### Paso 4: Actualizar Actions

```typescript
// cotizaciones.actions.ts
- const primeraEtapa = await prisma.studio_events_stage.findFirst(...)
+ const primeraEtapa = await prisma.studio_manager_pipeline_stages.findFirst({
+   where: { studio_id, stage_type: 'PLANNING', is_active: true },
+   orderBy: { order: 'asc' }
+ })

// events.actions.ts
- event_stage_id: string | null
+ // Usar solo stage_id
```

---

## 🎬 Resumen Ejecutivo

### Cambios Críticos

1. **Pipeline único**: `studio_manager_pipeline_stages`
2. **Eliminar duplicados**: `studio_events_stage`, `studio_event_team`
3. **Enums**: Tipar status y tipos
4. **Tracking revisiones**: Campos opcionales en items
5. **Gantt opcional**: Funciona sin él

### Impacto

- ✅ Simplifica arquitectura
- ✅ Elimina ambigüedades
- ✅ Mantiene flexibilidad
- ✅ Preparado para scaling
- ⚠️ Requiere migración de datos existentes

### Próximos Pasos

1. Crear script de migración de stages
2. db push con cambios
3. Actualizar actions
4. Implementar UI de pipeline
5. Implementar Gantt (opcional) en fase 2
