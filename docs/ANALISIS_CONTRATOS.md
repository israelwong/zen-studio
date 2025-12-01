# Análisis y Plan de Trabajo: Sistema de Contratos

## 📋 RESUMEN EJECUTIVO

Sistema para gestionar contratos de eventos con plantillas maestras editables, versionado por tipo de evento y generación automática de contratos personalizados por evento.

---

## 🎯 CASO DE USO

### Flujo Comercial

1. **Prospecto contacta** → Negocio comparte paquetes/cotizaciones
2. **Prospecto autoriza cotización** → Sistema envía a revisión manual
3. **Aprobación manual** → Se crea evento
4. **Gestión de contrato** → Desde panel del evento

### Relación de Entidades

```
studio_promises (promesa)
  └── studio_cotizaciones (1+ cotizaciones)
       └── cotización autorizada → studio_events (evento)
            └── studio_event_contracts (contrato)
```

---

## 🏗️ ARQUITECTURA DE DATOS

### Nuevos Modelos Prisma

#### 1. `studio_contract_templates`

Plantillas maestras de contratos por studio.

```prisma
model studio_contract_templates {
  id              String   @id @default(cuid())
  studio_id       String
  name            String   // "Contrato XV Años", "Contrato Bodas"
  slug            String   // "contrato-xv-anos", "contrato-bodas"
  description     String?
  event_type_id   String?  // Opcional: asociar a tipo de evento
  content         String   @db.Text // Contenido con variables @nombre_cliente
  is_active       Boolean  @default(true)
  is_default      Boolean  @default(false) // Plantilla por defecto
  version         Int      @default(1)
  created_by      String?  // user_id
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  studio          studios              @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  event_type      studio_event_types?  @relation(fields: [event_type_id], references: [id])
  created_by_user studio_users?        @relation(fields: [created_by], references: [id])
  contracts       studio_event_contracts[]

  @@unique([studio_id, slug])
  @@index([studio_id, is_active])
  @@index([event_type_id])
}
```

**Variables soportadas:**

- `@nombre_cliente` → Nombre del cliente
- `@fecha_evento` → Fecha del evento
- `@tipo_evento` → Tipo de evento
- `@nombre_evento` → Nombre del evento
- `@total_contrato` → Total de la cotización
- `@condiciones_pago` → Condiciones comerciales
- `@servicios_incluidos` → Lista de servicios (block especial)

---

#### 2. `studio_event_contracts`

Contratos específicos generados por evento.

```prisma
model studio_event_contracts {
  id                    String   @id @default(cuid())
  studio_id             String
  event_id              String   @unique // Un contrato por evento
  template_id           String?  // Referencia a plantilla usada
  content               String   @db.Text // Contenido renderizado
  status                String   @default("draft") // draft, published, signed
  version               Int      @default(1)
  signed_at             DateTime?
  signed_by_client      Boolean  @default(false)
  client_signature_url  String?  // URL a firma digital
  created_by            String?  // user_id
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  studio                studios                     @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  event                 studio_events               @relation(fields: [event_id], references: [id], onDelete: Cascade)
  template              studio_contract_templates?  @relation(fields: [template_id], references: [id])
  created_by_user       studio_users?               @relation(fields: [created_by], references: [id])

  @@index([studio_id, status])
  @@index([event_id])
  @@index([template_id])
}
```

---

## 🎨 EXPERIENCIA DE USUARIO

### 1. Gestión de Plantillas Maestras

**Ubicación:** `/studio/[slug]/contratos`

**Funcionalidades:**

- ✅ Listar plantillas activas
- ✅ Crear nueva plantilla
- ✅ Editar plantilla existente
- ✅ Activar/desactivar plantillas
- ✅ Definir plantilla por defecto
- ✅ Asociar plantilla a tipo de evento (opcional)
- ✅ Versionado de plantillas

**UI:**

```
┌─────────────────────────────────────┐
│ Plantillas de Contratos             │
│                                     │
│ [+ Nueva Plantilla]                 │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Contrato General (v2)       │   │
│ │ Por defecto • Todos eventos │   │
│ │ [Editar] [Duplicar] [•••]   │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Contrato XV Años (v1)       │   │
│ │ XV Años                     │   │
│ │ [Editar] [Duplicar] [•••]   │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### 2. Editor de Plantillas

**Características:**

- Editor de texto enriquecido (WYSIWYG)
- Toolbar: H1, H2, H3, P, Lista numerada, Lista con viñetas
- Panel lateral con variables disponibles
- Preview en tiempo real

**Variables dinámicas:**

```
Clic en variable → Inserta @variable en el texto
@nombre_cliente
@fecha_evento
@tipo_evento
@nombre_evento
@total_contrato
@condiciones_pago
```

**Sección especial para servicios:**

```html
<!-- Block especial en el contenido -->
[SERVICIOS_INCLUIDOS]
```

---

### 3. Contrato en Detalle de Evento

**Botón en header:** "Contratos" (ya existe en línea 296-304)

**Flujo:**

#### A. Primera vez (sin contrato)

```
Clic en "Contratos"
  ↓
Modal o ruta: /studio/[slug]/business/events/[eventId]/contrato
  ↓
"No hay contrato generado"
  ↓
[Generar contrato desde plantilla]
  ↓
Selector de plantilla (o usa por defecto)
  ↓
Genera contrato con datos del evento
  ↓
Vista de edición
```

#### B. Contrato existente

```
Clic en "Contratos"
  ↓
Vista del contrato renderizado
  ↓
[Editar] [Descargar PDF] [Enviar a cliente]
```

---

### 4. Vista/Edición de Contrato

**Layout:**

```
┌────────────────────────────────────────┐
│ Contrato - Boda Sara & Juan            │
│ [← Volver] [Guardar] [PDF] [Enviar]    │
├────────────────────────────────────────┤
│                                        │
│  CONTRATO DE PRESTACIÓN DE SERVICIOS   │
│                                        │
│  Evento: Boda Sara & Juan              │
│  Fecha: 15 de diciembre de 2025        │
│  Cliente: Sara López                   │
│                                        │
│  DECLARACIONES                         │
│  [contenido del contrato...]           │
│                                        │
│  SERVICIOS INCLUIDOS                   │
│  ✓ Fotografía                          │
│    - Cobertura 8 horas                 │
│    - 300 fotos editadas                │
│  ✓ Video                               │
│    - Highlights 5 min                  │
│                                        │
└────────────────────────────────────────┘

[Modal de confirmación al guardar:]
┌──────────────────────────────────┐
│ ¿Cómo guardar los cambios?      │
│                                  │
│ ○ Solo este contrato             │
│ ○ Actualizar plantilla maestra   │
│                                  │
│ [Cancelar] [Guardar]             │
└──────────────────────────────────┘
```

---

## 🔧 COMPONENTES TÉCNICOS

### Estructura de Carpetas

```
src/
├── app/[slug]/studio/
│   ├── contratos/                    # Gestión de plantillas
│   │   ├── page.tsx
│   │   ├── [templateId]/
│   │   │   └── editar/
│   │   │       └── page.tsx
│   │   └── nuevo/
│   │       └── page.tsx
│   └── business/events/[eventId]/
│       └── contrato/                 # Contrato del evento
│           └── page.tsx
│
├── components/ui/zen/
│   ├── contract/
│   │   ├── ContractEditor.tsx       # Editor WYSIWYG
│   │   ├── ContractPreview.tsx      # Vista previa
│   │   ├── ContractVariables.tsx    # Panel de variables
│   │   ├── ContractTemplate.tsx     # Card de plantilla
│   │   └── index.ts
│   └── ...
│
├── lib/actions/studio/business/
│   └── contracts/
│       ├── templates.actions.ts     # CRUD plantillas
│       ├── contracts.actions.ts     # CRUD contratos evento
│       └── renderer.actions.ts      # Renderizado de variables
│
└── types/
    └── contracts.ts                 # Tipos TypeScript
```

---

### Server Actions

#### `templates.actions.ts`

```typescript
// Listar plantillas
export async function getContractTemplates(
  studioSlug: string,
  filters?: { eventTypeId?: string }
);

// Crear plantilla
export async function createContractTemplate(
  studioSlug: string,
  data: CreateTemplateInput
);

// Actualizar plantilla
export async function updateContractTemplate(
  studioSlug: string,
  templateId: string,
  data: UpdateTemplateInput
);

// Obtener plantilla por defecto
export async function getDefaultContractTemplate(
  studioSlug: string,
  eventTypeId?: string
);

// Activar/desactivar
export async function toggleContractTemplate(
  studioSlug: string,
  templateId: string
);
```

#### `contracts.actions.ts`

```typescript
// Generar contrato desde plantilla
export async function generateEventContract(
  studioSlug: string,
  eventId: string,
  templateId?: string // Si no se pasa, usa default
);

// Obtener contrato del evento
export async function getEventContract(studioSlug: string, eventId: string);

// Actualizar contrato
export async function updateEventContract(
  studioSlug: string,
  contractId: string,
  data: UpdateContractInput,
  updateTemplate: boolean // Si true, actualiza plantilla
);

// Exportar a PDF
export async function exportContractToPDF(
  studioSlug: string,
  contractId: string
);
```

#### `renderer.actions.ts`

```typescript
// Renderizar variables en contenido
export async function renderContractContent(
  content: string,
  eventData: EventContractData
): Promise<string>;

// Obtener datos del evento para contrato
export async function getEventContractData(
  studioSlug: string,
  eventId: string
): Promise<EventContractData>;
```

---

### Tipos TypeScript

```typescript
// contracts.ts

export interface ContractTemplate {
  id: string;
  studio_id: string;
  name: string;
  slug: string;
  description?: string;
  event_type_id?: string;
  content: string;
  is_active: boolean;
  is_default: boolean;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface EventContract {
  id: string;
  studio_id: string;
  event_id: string;
  template_id?: string;
  content: string;
  status: "draft" | "published" | "signed";
  version: number;
  signed_at?: Date;
  signed_by_client: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EventContractData {
  nombre_cliente: string;
  fecha_evento: string;
  tipo_evento: string;
  nombre_evento: string;
  total_contrato: string;
  condiciones_pago: string;
  servicios_incluidos: ServiceCategory[];
}

export interface ServiceCategory {
  categoria: string;
  servicios: {
    nombre: string;
    descripcion?: string;
    precio: number;
  }[];
}

export interface CreateTemplateInput {
  name: string;
  slug?: string; // Auto-generate si no se pasa
  description?: string;
  event_type_id?: string;
  content: string;
  is_default?: boolean;
}

export interface UpdateContractInput {
  content: string;
  status?: "draft" | "published" | "signed";
}
```

---

## 📦 COMPONENTES ZEN

### 1. `ContractEditor`

Editor WYSIWYG basado en TipTap o Lexical.

**Props:**

```typescript
interface ContractEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables?: string[];
  readonly?: boolean;
}
```

**Características:**

- Toolbar: H1, H2, H3, P, Lists, Bold, Italic
- Insertar variables con autocomplete
- Syntax highlight para variables

---

### 2. `ContractPreview`

Vista previa renderizada del contrato.

**Props:**

```typescript
interface ContractPreviewProps {
  content: string;
  eventData?: EventContractData;
  showVariables?: boolean; // Mostrar @variables sin renderizar
}
```

---

### 3. `ContractVariables`

Panel lateral con variables disponibles.

**Props:**

```typescript
interface ContractVariablesProps {
  onVariableClick: (variable: string) => void;
}
```

**UI:**

```
Variables Disponibles
━━━━━━━━━━━━━━━━━━
Datos del Cliente
  @nombre_cliente

Datos del Evento
  @fecha_evento
  @tipo_evento
  @nombre_evento

Datos Comerciales
  @total_contrato
  @condiciones_pago

Bloques Especiales
  [SERVICIOS_INCLUIDOS]
```

---

### 4. `ContractTemplate`

Card para listar plantillas.

**Props:**

```typescript
interface ContractTemplateProps {
  template: ContractTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}
```

---

## 🗂️ DATOS INICIALES (SEED)

### Plantilla General (Default)

```typescript
const defaultContractTemplate = {
  name: "Contrato General",
  slug: "contrato-general",
  description: "Plantilla de contrato por defecto para todos los eventos",
  is_default: true,
  content: `
<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</h1>

<h2>GENERALES DEL EVENTO</h2>
<ul>
  <li><strong>Nombre del evento:</strong> @nombre_evento</li>
  <li><strong>Fecha de celebración:</strong> @fecha_evento</li>
  <li><strong>Tipo de evento:</strong> @tipo_evento</li>
  <li><strong>Cliente:</strong> @nombre_cliente</li>
</ul>

<h2>OBJETO DEL CONTRATO</h2>
<p>Contrato de prestación de servicios profesionales de fotografía y cinematografía que celebran por una parte <strong>@nombre_studio</strong> y por la otra el cliente <strong>@nombre_cliente</strong>, de conformidad con las siguientes declaraciones y cláusulas:</p>

<h2>DECLARACIONES</h2>
<ol>
  <li>Declara el prestador que cuenta con la capacidad técnica, equipo y material para el desempeño de las actividades profesionales en medios audiovisuales encomendadas.</li>
  <li>Declara el cliente que conoce los servicios ofrecidos y reconoce la capacidad técnica necesaria para el cumplimiento del presente contrato.</li>
</ol>

<h2>SERVICIOS INCLUIDOS</h2>
[SERVICIOS_INCLUIDOS]

<h2>HONORARIOS</h2>
<p>Por la prestación de los servicios establecidos, el cliente pagará la cantidad de <strong>@total_contrato</strong> (pesos mexicanos 00/100 M.N.)</p>
<p><strong>Condiciones de pago:</strong> @condiciones_pago</p>

<h2>REQUERIMIENTOS</h2>
<ul>
  <li>El cliente proporcionará acceso a la locación y las facilidades necesarias.</li>
  <li>El cliente proporcionará acceso a servicios de alimentación para el equipo.</li>
</ul>

<h2>GARANTÍAS EN PRODUCCIÓN</h2>
<ul>
  <li><strong>Puntualidad:</strong> La producción llegará 30 minutos antes al lugar pactado.</li>
  <li><strong>Equipo técnico:</strong> Se llevará todo el equipo contratado y accesorios.</li>
</ul>

<h2>ENTREGA DEL SERVICIO</h2>
<ul>
  <li>Entrega digital máxima en 20 días hábiles después del evento.</li>
  <li>Entrega impresa máximo 30 días tras autorizar el diseño.</li>
</ul>

<h2>CANCELACIÓN</h2>
<p>El anticipo no es reembolsable por cancelaciones ajenas al prestador. Si se cambia la fecha y el prestador está disponible, se respeta el anticipo.</p>

<h2>GARANTÍAS EN SERVICIO</h2>
<ul>
  <li>Respaldo de material audiovisual en disco dedicado.</li>
  <li>Fotos en alta resolución JPG con revelado digital.</li>
  <li>Calidad de video en alta definición.</li>
  <li>Plazo de observaciones: 30 días para ajustes.</li>
</ul>
  `,
};
```

---

## 📋 PLAN DE TRABAJO

### FASE 1: Modelos y Migraciones ✅

**Objetivo:** Crear estructura de base de datos

- [ ] 1.1 Crear modelo `studio_contract_templates` en schema.prisma
- [ ] 1.2 Crear modelo `studio_event_contracts` en schema.prisma
- [ ] 1.3 Agregar relación en `studio_events`
- [ ] 1.4 Generar migración
- [ ] 1.5 Crear seed con plantilla por defecto
- [ ] 1.6 Ejecutar migración y seed

**Archivos afectados:**

- `prisma/schema.prisma`
- `prisma/migrations/[timestamp]_create_contracts.sql`
- `prisma/seed.ts` (o crear nuevo seed)

---

### FASE 2: Tipos y Schemas ✅

**Objetivo:** Definir tipos TypeScript y validaciones Zod

- [ ] 2.1 Crear `/types/contracts.ts` con interfaces
- [ ] 2.2 Crear schemas Zod en `/lib/actions/schemas/contracts-schemas.ts`
- [ ] 2.3 Exportar desde index

**Archivos a crear:**

- `src/types/contracts.ts`
- `src/lib/actions/schemas/contracts-schemas.ts`

---

### FASE 3: Server Actions - Plantillas ✅

**Objetivo:** CRUD de plantillas maestras

- [ ] 3.1 `getContractTemplates` - Listar plantillas
- [ ] 3.2 `getContractTemplate` - Obtener una plantilla
- [ ] 3.3 `getDefaultContractTemplate` - Plantilla por defecto
- [ ] 3.4 `createContractTemplate` - Crear plantilla
- [ ] 3.5 `updateContractTemplate` - Actualizar plantilla
- [ ] 3.6 `deleteContractTemplate` - Eliminar plantilla (soft delete)
- [ ] 3.7 `toggleContractTemplate` - Activar/desactivar
- [ ] 3.8 `duplicateContractTemplate` - Duplicar plantilla

**Archivo a crear:**

- `src/lib/actions/studio/business/contracts/templates.actions.ts`

---

### FASE 4: Server Actions - Contratos ✅

**Objetivo:** Gestión de contratos por evento

- [ ] 4.1 `getEventContract` - Obtener contrato de evento
- [ ] 4.2 `generateEventContract` - Generar desde plantilla
- [ ] 4.3 `updateEventContract` - Actualizar contrato
- [ ] 4.4 `deleteEventContract` - Eliminar contrato
- [ ] 4.5 `getEventContractData` - Obtener datos para renderizar
- [ ] 4.6 `renderContractContent` - Renderizar variables
- [ ] 4.7 `exportContractToPDF` - Exportar a PDF (Fase 2)

**Archivos a crear:**

- `src/lib/actions/studio/business/contracts/contracts.actions.ts`
- `src/lib/actions/studio/business/contracts/renderer.actions.ts`

---

### FASE 5: Componentes Base ZEN ✅

**Objetivo:** Componentes reutilizables del sistema

- [ ] 5.1 `ContractEditor` - Editor WYSIWYG
- [ ] 5.2 `ContractPreview` - Vista previa
- [ ] 5.3 `ContractVariables` - Panel de variables
- [ ] 5.4 `ContractTemplate` - Card de plantilla
- [ ] 5.5 Exportar desde `/components/ui/zen/contract/index.ts`

**Archivos a crear:**

- `src/components/ui/zen/contract/ContractEditor.tsx`
- `src/components/ui/zen/contract/ContractPreview.tsx`
- `src/components/ui/zen/contract/ContractVariables.tsx`
- `src/components/ui/zen/contract/ContractTemplate.tsx`
- `src/components/ui/zen/contract/index.ts`

---

### FASE 6: Gestión de Plantillas ✅

**Objetivo:** Sección en utility bar para CRUD plantillas

- [ ] 6.1 Agregar ítem "Contratos" en utility bar
- [ ] 6.2 Página listado: `/studio/[slug]/contratos/page.tsx`
- [ ] 6.3 Página nueva plantilla: `/studio/[slug]/contratos/nuevo/page.tsx`
- [ ] 6.4 Página editar plantilla: `/studio/[slug]/contratos/[templateId]/editar/page.tsx`
- [ ] 6.5 Modal de confirmación para eliminar
- [ ] 6.6 Toast notifications

**Archivos a crear:**

- `src/app/[slug]/studio/contratos/page.tsx`
- `src/app/[slug]/studio/contratos/nuevo/page.tsx`
- `src/app/[slug]/studio/contratos/[templateId]/editar/page.tsx`
- `src/app/[slug]/studio/contratos/components/...`

---

### FASE 7: Contrato en Detalle de Evento ✅

**Objetivo:** Vista/edición de contrato desde evento

- [ ] 7.1 Modificar botón "Contratos" en `/events/[eventId]/page.tsx` (línea 296-304)
- [ ] 7.2 Crear ruta: `/events/[eventId]/contrato/page.tsx`
- [ ] 7.3 Componente `EventContractView` con lógica:
  - Sin contrato → Generar desde plantilla
  - Con contrato → Mostrar + Editar
- [ ] 7.4 Modal "¿Actualizar plantilla maestra?"
- [ ] 7.5 Vista previa renderizada con datos reales

**Archivos a crear/modificar:**

- `src/app/[slug]/studio/business/events/[eventId]/page.tsx` (modificar)
- `src/app/[slug]/studio/business/events/[eventId]/contrato/page.tsx` (crear)
- `src/app/[slug]/studio/business/events/[eventId]/contrato/components/EventContractView.tsx`

---

### FASE 8: Renderizado de Variables ✅

**Objetivo:** Sistema de reemplazo de variables dinámicas

- [ ] 8.1 Función para obtener datos del evento completo
- [ ] 8.2 Parser de variables `@variable` → valor
- [ ] 8.3 Parser de bloque especial `[SERVICIOS_INCLUIDOS]`
- [ ] 8.4 Generación HTML de servicios por categoría
- [ ] 8.5 Tests de renderizado

**Variables a mapear:**

```typescript
{
  '@nombre_cliente': event.contact.nombre,
  '@fecha_evento': formatDate(event.event_date),
  '@tipo_evento': event.event_type.name,
  '@nombre_evento': event.name,
  '@total_contrato': formatCurrency(cotizacion.precio),
  '@condiciones_pago': condiciones.descripcion,
  '[SERVICIOS_INCLUIDOS]': renderServicios(cotizacion.items)
}
```

---

### FASE 9: Integración y Testing ✅

**Objetivo:** Pruebas E2E y ajustes finales

- [ ] 9.1 Crear plantilla desde UI
- [ ] 9.2 Editar plantilla existente
- [ ] 9.3 Generar contrato desde evento sin contrato
- [ ] 9.4 Editar contrato de evento
- [ ] 9.5 Actualizar plantilla desde contrato evento
- [ ] 9.6 Verificar renderizado correcto de variables
- [ ] 9.7 Verificar bloque especial de servicios
- [ ] 9.8 Testing en diferentes tipos de evento
- [ ] 9.9 Verificar permisos por rol

---

### FASE 10: Mejoras Futuras (Post-MVP) 📦

**Objetivo:** Funcionalidades avanzadas

- [ ] 10.1 Exportar contrato a PDF (con logo studio)
- [ ] 10.2 Enviar contrato por email a cliente
- [ ] 10.3 Firma digital del cliente (integración DocuSign/similar)
- [ ] 10.4 Historial de versiones del contrato
- [ ] 10.5 Comparación de versiones (diff)
- [ ] 10.6 Variables personalizadas por studio
- [ ] 10.7 Bloques reutilizables (clausulas comunes)
- [ ] 10.8 Plantillas públicas compartibles entre studios

---

## 🎨 CONSIDERACIONES DE DISEÑO

### Editor WYSIWYG

**Opción 1: TipTap** (Recomendada)

- Basado en ProseMirror
- Extensible y moderno
- Soporta React out-of-the-box
- Package: `@tiptap/react`, `@tiptap/starter-kit`

**Opción 2: Lexical**

- De Meta (Facebook)
- Más control bajo nivel
- Más complejo de implementar

**Opción 3: Quill**

- Más simple pero menos flexible
- No recomendado para este caso

### PDF Generation

**Opción 1: React-PDF** (Recomendada)

- `@react-pdf/renderer`
- Genera PDFs desde componentes React
- Control total del layout

**Opción 2: Puppeteer/Playwright**

- Renderiza HTML → PDF
- Más pesado (requiere Chrome headless)
- Mejor para casos complejos

---

## 🔐 PERMISOS Y SEGURIDAD

### Permisos por Rol

```typescript
// Gestión de plantillas
"contracts:templates:view"; // Ver plantillas
"contracts:templates:create"; // Crear plantillas
"contracts:templates:edit"; // Editar plantillas
"contracts:templates:delete"; // Eliminar plantillas

// Gestión de contratos
"contracts:view"; // Ver contratos de eventos
"contracts:create"; // Generar contratos
"contracts:edit"; // Editar contratos
"contracts:delete"; // Eliminar contratos
"contracts:export"; // Exportar a PDF
"contracts:send"; // Enviar a clientes
```

### Roles sugeridos

- **Owner/Admin:** Todos los permisos
- **Manager:** Ver, crear, editar contratos (no eliminar plantillas)
- **Staff:** Solo ver contratos
- **Cliente:** Ver su contrato (portal cliente - Fase 2)

---

## 📊 MÉTRICAS Y VALIDACIONES

### Validaciones

- Nombre de plantilla único por studio
- Slug único por studio
- Al menos una plantilla activa por studio
- Solo una plantilla puede ser `is_default` por studio
- Contenido no vacío
- Variables correctamente formateadas

### Límites

- Contenido de plantilla: max 50,000 caracteres
- Número de plantillas: ilimitado (considerar paginación +20)
- Versiones: incrementar automáticamente

---

## 🐛 CASOS EDGE

1. **Evento sin cotización autorizada**
   - Mostrar mensaje: "Debe existir una cotización autorizada"
   - No permitir generar contrato

2. **Studio sin plantilla por defecto**
   - Crear automáticamente en el primer acceso
   - Usar seed default

3. **Plantilla eliminada pero con contratos activos**
   - Soft delete: `deleted_at` timestamp
   - Mantener integridad referencial

4. **Editar contrato después de firmado**
   - Crear nueva versión
   - Mantener historial

5. **Variable no encontrada en datos**
   - Mostrar placeholder: `[Variable no disponible]`
   - Log warning

---

## 📝 EJEMPLO DE RENDERIZADO

### Contenido Plantilla:

```html
<h2>Cliente</h2>
<p>@nombre_cliente</p>

<h2>Servicios</h2>
[SERVICIOS_INCLUIDOS]

<h2>Total</h2>
<p>@total_contrato</p>
```

### Datos del Evento:

```typescript
{
  nombre_cliente: "Sara López",
  total_contrato: "$50,000.00 MXN",
  servicios_incluidos: [
    {
      categoria: "Fotografía",
      servicios: [
        { nombre: "Cobertura 8 horas", precio: 25000 },
        { nombre: "300 fotos editadas", precio: 0 }
      ]
    },
    {
      categoria: "Video",
      servicios: [
        { nombre: "Highlights 5 min", precio: 25000 }
      ]
    }
  ]
}
```

### Resultado Renderizado:

```html
<h2>Cliente</h2>
<p>Sara López</p>

<h2>Servicios</h2>
<div class="servicios-categoria">
  <h3>Fotografía</h3>
  <ul>
    <li>Cobertura 8 horas - $25,000.00</li>
    <li>300 fotos editadas</li>
  </ul>
</div>
<div class="servicios-categoria">
  <h3>Video</h3>
  <ul>
    <li>Highlights 5 min - $25,000.00</li>
  </ul>
</div>

<h2>Total</h2>
<p>$50,000.00 MXN</p>
```

---

## 🚀 PRÓXIMOS PASOS

1. **Revisar y aprobar este documento**
2. **Definir prioridad de fases** (¿Todas o MVP?)
3. **Estimar tiempos** por fase
4. **Asignar recursos** (1 dev, tiempo estimado)
5. **Iniciar Fase 1:** Modelos y migraciones

---

## ✅ CHECKLIST DE APROBACIÓN

- [ ] Arquitectura de datos revisada
- [ ] Flujo de usuario validado
- [ ] Componentes ZEN definidos
- [ ] Server Actions estructuradas
- [ ] Plan de fases aprobado
- [ ] Prioridades definidas (MVP vs Full)
- [ ] Estimación de tiempos
- [ ] Dependencias externas identificadas (TipTap, React-PDF)

---

**Documento creado:** 2025-12-01  
**Versión:** 1.0  
**Estado:** Pendiente de aprobación
