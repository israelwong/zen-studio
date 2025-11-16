# Análisis de Arquitectura: Events Management System

## 📋 Contexto y Caso de Uso

### Flujo Principal

1. **Promise → Cotización → Autorización → Event**
   - Se crea una Promise (negociación con cliente)
   - Se genera 1+ Cotización con N items
   - Al autorizar, se crea/actualiza un Event
   - El Event entra al pipeline operativo

### Operación del Evento

- **Items de Cotización**: Cada item representa trabajo a realizar
- **Tipos de Items** (fotografía/video ejemplo):
  - **Operación** (día N): Fotógrafo, Asistente, Camarógrafo
  - **Edición** (días variables): Revelado digital, Retoque avanzado, Edición video
  - **Entrega**: Impresión cuadro, Entrega digital

### Gestión del Ciclo

- Items → Asignación Crew → Seguimiento → Revisión interna → Revisión cliente → Aprobación
- Tracking de costos por item y persona
- Pagos a crew members asociados a items completados

---

## 🔍 Estado Actual: Modelos y Relaciones

### ✅ CORE: Bien Estructurado

#### `studio_events` - Hub Central

```prisma
- id, studio_id, contact_id
- promise_id (unique)       ✓ 1:1 con promise
- cotizacion_id (unique)    ✓ 1:1 con cotización autorizada
- event_type_id             ✓ Tipo de evento
- event_stage_id            ⚠️ LEGACY (ver análisis)
- stage_id                  ⚠️ DUPLICADO (manager pipeline)
- name, event_date, address, sede
- status                    ✓ active/cancelled

// Operativo
- contract_value            ✓ Monto contratado
- paid_amount               ✓ Pagado
- pending_amount            ✓ Por pagar
- studio_manager_id         ✓ Project manager
- started_at, completed_at  ✓ Fechas operativas
```

#### `studio_cotizaciones` - Cotización

```prisma
- id, studio_id, evento_id, promise_id
- event_type_id
- name, description, price
- status: pendiente/autorizada/cancelada
- visible_to_client
```

#### `studio_cotizacion_items` - Items de Trabajo

```prisma
- id, cotizacion_id, item_id
- quantity, position
- assigned_to_crew_member_id  ✅ CRÍTICO: Asignación
- gantt_task_id (unique)      ✅ CRÍTICO: Link a Gantt
- assignment_date
- delivery_date
- task_type                   ⚠️ Necesita enum: operation/editing/delivery
- internal_delivery_days      ✅ Para revisión interna
- client_delivery_days        ✅ Para revisión cliente
- status                      ✅ Tracking: pendiente/en_progreso/revisión_interna/revisión_cliente/completado
- cost, expense, profit       ✅ Métricas financieras
```

---

### ⚠️ PROBLEMA 1: Pipelines Duplicados

#### `studio_events_stage` - Pipeline Commercial (LEGACY)

```prisma
model studio_events_stage {
  id, studio_id, name, slug, order
  is_active, is_system
  eventos studio_events[]  // Relación: event_stage_id
}
```

#### `studio_manager_pipeline_stages` - Pipeline Manager (ACTUAL)

```prisma
model studio_manager_pipeline_stages {
  id, studio_id, name, slug
  stage_type: ManagerStageType
  color, order
  is_active, is_system
  events studio_events[]  // Relación: stage_id
}
```

**📊 Análisis:**

- `studio_events_stage` parece ser legacy del flujo comercial
- `studio_manager_pipeline_stages` es el pipeline operativo actual
- **Problema**: `studio_events` tiene AMBOS campos (`event_stage_id` + `stage_id`)
- **Decisión**: Usar SOLO `studio_manager_pipeline_stages`

**✅ Solución:**

```prisma
studio_events {
  // ELIMINAR
  - event_stage_id String?
  - event_stage studio_events_stage?

  // MANTENER
  stage_id String?
  stage studio_manager_pipeline_stages?
}
```

---

### ✅ GANTT System: Bien Diseñado

#### Templates → Event Instances → Tasks

**1. Templates** (Plantillas reutilizables)

```prisma
studio_gantt_templates {
  - name, description
  - event_type_id              ✅ Por tipo de evento
  - estimated_duration_days
  - pre_event_days             ✅ Días antes
  - post_event_days            ✅ Días después
  - is_default                 ✅ Template por defecto
  - tasks []                   → Tareas plantilla
}

studio_gantt_template_tasks {
  - template_id
  - name, description
  - days_before_event          ✅ Relativo al evento
  - days_after_event
  - duration_days
  - category: TaskCategory     ✅ PRE_PRODUCTION/PRODUCTION/POST_PRODUCTION
  - priority: TaskPriority
  - depends_on_task_id         ✅ Dependencias
  - suggested_role             ✅ Rol sugerido
  - checklist_items            ✅ JSON checklist
}
```

**2. Event Instances** (Instancia del evento)

```prisma
studio_gantt_event_instances {
  - event_id (unique)          ✅ 1:1 con evento
  - template_id                ✅ Template usado
  - is_custom                  ✅ Custom o template
  - event_date
  - start_date, end_date       ✅ Rango calculado
  - tasks []                   → Tareas del evento
}
```

**3. Event Tasks** (Tareas ejecutables)

```prisma
studio_gantt_event_tasks {
  - gantt_instance_id
  - template_task_id           ✅ De dónde viene
  - cotizacion_item_id         ✅✅✅ CRÍTICO: Link con item
  - name, description
  - start_date, end_date
  - category, priority
  - assigned_to_user_id        ✅ Asignación
  - status: TaskStatus         ✅ PENDING/IN_PROGRESS/COMPLETED/CANCELLED
  - progress_percent
  - completed_at, completed_by_user_id
  - depends_on_task_id         ✅ Dependencias
  - budget_amount              ✅ Presupuesto
  - actual_cost                ✅ Costo real
  - checklist_items            ✅ JSON checklist
  - activity_log []            → Historial
}
```

**✅ Evaluación Gantt:**

- Excelente diseño para gestión de proyectos
- Templates reutilizables por tipo de evento
- Dependencias y checklist items
- Link directo con cotizacion_items ✅
- Tracking financiero por tarea

---

### ✅ CREW & ASSIGNMENTS: Bien Estructurado

#### Crew Members

```prisma
studio_crew_members {
  - id, studio_id, name
  - tipo: PersonalType         ✅ INTERNO/EXTERNO/FREELANCE
  - category_id                ✅ Fotógrafo/Editor/etc
  - fixed_salary               ✅ Salario fijo
  - variable_salary            ✅ Por evento/hora
  - status: activo/inactivo
}

studio_crew_categories {
  - id, studio_id, name
  - tipo: PersonalType
  - color, icono
  - order
}

studio_crew_profiles {
  - id, studio_id, name        ✅ Perfiles/Equipos
  - description
  - crew_assignments []        → Asignaciones de crew
}
```

**✅ Evaluación Crew:**

- Sistema completo de gestión de personal
- Categorización flexible
- Salarios fijos y variables
- Perfiles para equipos

---

### ✅ PAYMENTS & PAYROLL: Integración Clara

#### Event Payments (Pagos del Cliente)

```prisma
studio_event_payments {
  - event_id
  - amount
  - payment_method
  - payment_date
  - stripe_payment_id
}
```

#### Nominas (Pagos al Crew)

```prisma
studio_nominas {
  - id, studio_id
  - evento_id                  ✅ Asociado al evento
  - personal_id                ✅ Crew member
  - concept, description
  - gross_amount, net_amount
  - deductions
  - status: pendiente/autorizado/pagado
  - payment_date, payment_method
  - payroll_services []        → Servicios incluidos
}

studio_nomina_servicios {
  - payroll_id
  - quote_service_id           ✅✅✅ CRÍTICO: Link con cotizacion_item
  - service_name
  - assigned_cost
  - assigned_quantity
}
```

**✅ Evaluación Payments:**

- Separación clara: pagos recibidos vs pagos a crew
- Link directo nomina → cotizacion_items ✅
- Tracking de servicios específicos pagados

---

### ⚠️ PROBLEMA 2: Event Team vs Crew Assignments

#### `studio_event_team` - Asignación de Crew a Evento

```prisma
studio_event_team {
  - event_id
  - crew_member_id
  - role                       ⚠️ Rol en el evento
  - hours, cost
}
```

**📊 Análisis:**

- Parece ser un modelo simplificado/legacy
- **Pregunta**: ¿Se usa actualmente?
- **Conflicto**: La asignación real debería estar en:
  - `studio_cotizacion_items.assigned_to_crew_member_id` (por item)
  - `studio_gantt_event_tasks.assigned_to_user_id` (por tarea)

**❓ Decisión Pendiente:**

- Verificar uso actual de `studio_event_team`
- Si no se usa → Eliminar
- Si se usa → Definir propósito específico (¿resumen del equipo?)

---

### ✅ DELIVERABLES, TIMELINE, TASKS: Operación Completa

#### Deliverables

```prisma
studio_event_deliverables {
  - event_id
  - type: DeliverableType      ✅ Enum específico
  - name, description
  - file_url, file_size_mb
  - delivered_at
  - client_approved_at         ✅ Aprobación cliente
}
```

#### Timeline (Historial)

```prisma
studio_event_timeline {
  - event_id
  - user_id
  - action_type                ✅ Tipo de acción
  - description
  - metadata: Json             ✅ Flexible
}
```

#### Simple Tasks (adicional a Gantt)

```prisma
studio_event_tasks {
  - event_id
  - title, description
  - assigned_to_id             ✅ user_studio_roles
  - due_date
  - completed_at
  - is_completed
}
```

**📊 Análisis:**

- `studio_event_tasks`: Tareas simples no ligadas a items/gantt
- Gantt tasks son las principales para tracking de items
- Uso válido: notas/recordatorios adicionales

---

## 📦 Relaciones Clave: Flujo de Datos

### 1. Promise → Cotización → Event

```
studio_promises (1)
  ↓ promise_id
studio_cotizaciones (N) → se autoriza UNA
  ↓ cotizacion_id (unique)
studio_events (1) ← Hub central
```

### 2. Cotización Items → Asignación → Pago

```
studio_cotizaciones (1)
  ↓ cotizacion_id
studio_cotizacion_items (N)
  ↓ assigned_to_crew_member_id
studio_crew_members (1)
  ↑
studio_nominas (1)
  ↓ quote_service_id
studio_nomina_servicios (N) → Pago por items
```

### 3. Items → Gantt Tasks → Tracking

```
studio_cotizacion_items (1)
  ↓ cotizacion_item_id (unique)
studio_gantt_event_tasks (1)
  - Tracking operativo
  - Fechas, progreso, dependencias
  - Budget vs actual cost
```

### 4. Event → Pipeline → Stages

```
studio_events (1)
  ↓ stage_id
studio_manager_pipeline_stages (1)
  - Planeación
  - Producción
  - Revisión
  - Entrega
  - Archivado
```

---

## 🎯 Propuesta de Refactorización

### ✅ MANTENER (Bien diseñados)

- `studio_events` (limpiar campos)
- `studio_cotizaciones`
- `studio_cotizacion_items` (ampliar task_type)
- `studio_manager_pipeline_stages`
- Todo el sistema Gantt (templates, instances, tasks)
- `studio_crew_members`, `studio_crew_categories`
- `studio_nominas`, `studio_nomina_servicios`
- `studio_event_payments`
- `studio_event_deliverables`
- `studio_event_timeline`

### 🗑️ ELIMINAR

1. **`studio_events_stage`** - Legacy, reemplazado por manager_pipeline
2. **Campo `event_stage_id`** en `studio_events`

### ❓ EVALUAR

1. **`studio_event_team`** - ¿Se usa? ¿Propósito vs assignments en items/gantt?
2. **`studio_event_tasks`** - Validar uso vs gantt tasks

### 🔧 MEJORAR

#### 1. `studio_events` - Limpiar

```prisma
model studio_events {
  id, studio_id
  contact_id, promise_id (unique), cotizacion_id (unique)
  event_type_id

  // ELIMINAR: event_stage_id
  stage_id                     ✅ ÚNICO pipeline

  name, event_date, address, sede
  status: active/cancelled/completed

  // Operativo
  contract_value, paid_amount, pending_amount
  studio_manager_id            ✅ Project manager
  started_at, completed_at

  // Relaciones
  stage studio_manager_pipeline_stages
  gantt studio_gantt_event_instances?
  cotizacion studio_cotizaciones?
  deliverables [], payments [], timeline []
  tasks [], team_assignments []
  nominas []
}
```

#### 2. `studio_cotizacion_items` - Ampliar task_type

```prisma
model studio_cotizacion_items {
  // Actual
  assigned_to_crew_member_id   ✅
  gantt_task_id                ✅

  // MEJORAR: task_type como ENUM
  task_type CotizacionItemType // operation/editing/delivery/custom

  // Status como ENUM
  status ItemStatus            // pendiente/assigned/in_progress/
                               // internal_review/client_review/
                               // approved/cancelled

  // Delivery tracking
  internal_delivery_days       ✅
  client_delivery_days         ✅
  internal_delivered_at        ← AGREGAR
  client_delivered_at          ← AGREGAR
  internal_approved_at         ← AGREGAR
  client_approved_at           ← AGREGAR
  revision_count               ← AGREGAR (contador de revisiones)
}
```

#### 3. Enums Faltantes

```prisma
enum CotizacionItemType {
  OPERATION    // Día del evento
  EDITING      // Post-producción
  DELIVERY     // Entrega física/digital
  CUSTOM       // Personalizado
}

enum ItemStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  INTERNAL_REVIEW
  CLIENT_REVIEW
  APPROVED
  CANCELLED
}

enum EventStatus {
  ACTIVE
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

---

## 🏗️ Arquitectura Propuesta: Flujo Completo

### Fase 1: Autorización (Commercial)

```
Promise → Cotización → Autorizar
  ↓
Event CREATED
  - stage_id = "planeacion" (primera etapa)
  - status = "active"
  - cotizacion_id vinculada
```

### Fase 2: Inicialización (Business)

```
Event autorizado
  ↓
1. Crear Gantt Instance (opcional)
   - Desde template por event_type_id
   - O custom manualmente

2. Asociar items → gantt tasks
   - cotizacion_items.gantt_task_id

3. Asignar crew a items
   - cotizacion_items.assigned_to_crew_member_id

4. Calcular fechas
   - item.task_type determina cuándo
   - operation: event_date
   - editing: event_date + N días
   - delivery: + M días más
```

### Fase 3: Operación

```
Por cada item/tarea:
  1. Crew asignado trabaja
  2. Status: assigned → in_progress

  3. Revisión interna (si aplica)
     - status → internal_review
     - internal_delivered_at
     - Aprobado: internal_approved_at

  4. Revisión cliente (si aplica)
     - status → client_review
     - client_delivered_at
     - Aprobado: client_approved_at

  5. Status final → approved
```

### Fase 4: Pipeline Movement

```
Event avanza por stages según progreso:
  - Planeación: Items siendo asignados
  - Producción: Items en progreso
  - Revisión: Items en review
  - Entrega: Todos aprobados
  - Archivado: Event completado
```

### Fase 5: Pagos

```
1. Cliente paga
   - studio_event_payments
   - event.paid_amount actualizado

2. Crew cobra
   - Por items completados
   - studio_nominas
   - studio_nomina_servicios (link a cotizacion_items)
```

---

## 📊 Métricas y Tracking

### Event Level

```typescript
{
  contract_value: Decimal,
  paid_amount: Decimal,
  pending_amount: Decimal,

  // Calculado
  items_total: number,
  items_completed: number,
  items_pending: number,
  completion_percentage: number,

  // Costos
  estimated_crew_cost: Decimal,  // suma cotizacion_items.cost
  actual_crew_cost: Decimal,      // suma nominas pagadas
  profit_margin: Decimal
}
```

### Item Level

```typescript
{
  assigned_to_crew_member_id: string?,
  assignment_date: DateTime?,

  status: ItemStatus,

  internal_delivery_days: number?,
  client_delivery_days: number?,

  internal_delivered_at: DateTime?,
  internal_approved_at: DateTime?,

  client_delivered_at: DateTime?,
  client_approved_at: DateTime?,

  revision_count: number,

  cost: Decimal,         // Presupuestado
  actual_cost: Decimal   // Real (desde nomina)
}
```

---

## 🎬 Orden de Ejecución Propuesto

### 1. Refactorización DB (Push sin migración)

```bash
# 1. Eliminar studio_events_stage
# 2. Eliminar event_stage_id de studio_events
# 3. Agregar enums: CotizacionItemType, ItemStatus, EventStatus
# 4. Agregar campos de tracking en cotizacion_items
# 5. Validar relaciones crew/items/nominas

npx prisma db push
npx prisma generate
```

### 2. Validar Seeds (si hay migración)

```
- Seeds de studio_manager_pipeline_stages por defecto
- Seeds de crew_categories comunes
- Seeds de gantt_templates básicos
```

### 3. Actualizar Actions

```
- autorizarCotizacion → usar stage_id
- events.actions → limpiar event_stage_id
- items asignación → validar crew
```

### 4. UI Events

```
- Pipeline visual (stages)
- Items list con asignaciones
- Tracking de revisiones
- Métricas de progreso
```

---

## ❓ Preguntas Críticas

1. **studio_event_team**: ¿Se usa actualmente? ¿Eliminar?
2. **studio_event_tasks**: ¿Separar de gantt tasks o unificar?
3. **Revisiones**: ¿Todas las tareas tienen revisión interna + cliente o depende del tipo?
4. **Gantt obligatorio**: ¿Todo evento debe tener gantt o es opcional?
5. **Tags en events**: ¿Necesitamos etiquetas adicionales a stages?

---

## ✅ Evaluación Final

### Fortalezas

- ✅ Estructura general bien pensada
- ✅ Separación clara: Commercial → Business → Operations
- ✅ Sistema Gantt robusto y escalable
- ✅ Tracking financiero completo (pagos in/out)
- ✅ Relaciones items → crew → nominas bien definidas

### Debilidades

- ⚠️ Pipelines duplicados (events_stage vs manager_pipeline)
- ⚠️ Campos legacy en studio_events
- ⚠️ Falta enums para task_type y status
- ⚠️ Tracking de revisiones incompleto

### Recomendación

**✅ LA ESTRUCTURA ES SÓLIDA Y ESCALABLE**

Requiere:

1. Limpieza de legacy (eliminar studio_events_stage)
2. Agregar enums y campos de tracking
3. Validar uso de event_team
4. Sin migración necesaria si se usa `db push`

**La base de datos CUMPLE con el caso de uso y está lista para refactorización limpia.**
