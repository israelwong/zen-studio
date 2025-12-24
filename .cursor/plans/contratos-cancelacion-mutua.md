# 📋 Contratos - Análisis de Cancelación Mutua y Versionado

**Estado:** Análisis pre-implementación  
**Fecha:** 2025-01-28  
**Contexto:** Sistema de contratos digitales con firma electrónica

---

## 🔄 Flujo Actual

### Estados del Contrato

1. **`draft`** (Borrador)
   - Solo visible para el estudio
   - Puede editarse, regenerarse o eliminarse
   - No visible para el cliente

2. **`published`** (Publicado)
   - Visible para el cliente en su portal
   - Cliente puede revisar y firmar
   - Estudio puede editar (crea nueva versión en borrador)
   - Estudio puede eliminar

3. **`signed`** (Firmado)
   - ✅ **Documento legal** - No editable ni eliminable
   - Ambos pueden ver y descargar PDF
   - Inmutable para mantener integridad legal

### Flujo de Publicación y Firma

```
Studio crea contrato (draft)
    ↓
Studio publica → Notificación al cliente
    ↓
Cliente revisa en portal
    ↓
Cliente firma → Notificación al studio
    ↓
Estado: signed (inmutable)
```

---

## ⚠️ Problema Identificado

### Situación Actual

**Contrato firmado (`signed`):**
- ✅ No se puede editar (correcto - documento legal)
- ✅ No se puede eliminar (correcto - comprobante legal)
- ❌ **Problema:** ¿Qué pasa si necesitan cancelar el contrato?

### Casos de Uso para Cancelación

1. **Cancelación por mutuo acuerdo:**
   - Ambos partes deciden cancelar
   - Requiere validación de ambas partes
   - Debe quedar registro de la cancelación

2. **Cancelación unilateral con aprobación:**
   - Studio solicita cancelación → Cliente debe aprobar
   - Cliente solicita cancelación → Studio debe aprobar
   - Requiere motivo de cancelación

3. **Auditoría y trazabilidad:**
   - Registro de quién solicitó la cancelación
   - Motivo de cancelación
   - Fecha y hora de cada acción
   - Confirmación de ambas partes

---

## 🎯 Solución Propuesta: Cancelación Mutua

### Nuevos Estados

```typescript
enum ContractStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SIGNED = 'signed',
  CANCELLATION_REQUESTED_BY_STUDIO = 'cancellation_requested_by_studio',
  CANCELLATION_REQUESTED_BY_CLIENT = 'cancellation_requested_by_client',
  CANCELLED = 'cancelled', // Solo cuando ambos aprueban
}
```

### Flujo de Cancelación

#### Escenario 1: Studio solicita cancelación

```
Contrato firmado (signed)
    ↓
Studio: "Solicitar cancelación" + motivo
    ↓
Estado: cancellation_requested_by_studio
    ↓
Notificación al cliente: "Studio solicita cancelar contrato"
    ↓
Cliente revisa motivo y detalles
    ↓
Cliente: "Confirmar cancelación" o "Rechazar"
    ↓
Si confirma → Estado: cancelled
Si rechaza → Estado: signed (vuelve a firmado)
```

#### Escenario 2: Cliente solicita cancelación

```
Contrato firmado (signed)
    ↓
Cliente: "Solicitar cancelación" + motivo
    ↓
Estado: cancellation_requested_by_client
    ↓
Notificación al studio: "Cliente solicita cancelar contrato"
    ↓
Studio revisa motivo y detalles
    ↓
Studio: "Confirmar cancelación" o "Rechazar"
    ↓
Si confirma → Estado: cancelled
Si rechaza → Estado: signed (vuelve a firmado)
```

---

## 🗄️ Estructura de Base de Datos

### Modelo Actual (studio_event_contracts)

```prisma
model studio_event_contracts {
  id                   String    @id @default(cuid())
  studio_id            String
  event_id             String    @unique
  template_id          String?
  content              String    @db.Text
  status               String    @default("draft")
  version              Int       @default(1)
  signed_at            DateTime?
  signed_by_client     Boolean   @default(false)
  client_signature_url String?
  created_by           String?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt
}
```

### Cambios Propuestos

```prisma
model studio_event_contracts {
  id                   String    @id @default(cuid())
  studio_id            String
  event_id             String    @unique
  template_id          String?
  content              String    @db.Text
  status               ContractStatus @default(DRAFT)
  version              Int       @default(1)
  signed_at            DateTime?
  signed_by_client     Boolean   @default(false)
  client_signature_url String?
  created_by           String?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt
  
  // Nuevos campos para cancelación
  cancelled_at         DateTime?
  cancellation_reason String?   @db.Text
  cancellation_initiated_by String? // 'studio' | 'client'
  
  // Relaciones
  studio          studios                    @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  event           studio_events              @relation(fields: [event_id], references: [id], onDelete: Cascade)
  template        studio_contract_templates? @relation(fields: [template_id], references: [id])
  created_by_user studio_users?              @relation(fields: [created_by], references: [id])
  cancellation_logs studio_contract_cancellation_logs[]
  
  @@index([studio_id, status])
  @@index([event_id])
  @@index([template_id])
  @@index([status, cancelled_at])
}

// Nuevo modelo para logging de cancelación
model studio_contract_cancellation_logs {
  id                String   @id @default(cuid())
  contract_id       String
  action            CancellationAction // 'request', 'confirm', 'reject'
  initiated_by      String   // 'studio' | 'client'
  reason            String?  @db.Text
  metadata          Json?    // Información adicional
  created_at        DateTime @default(now())
  
  contract          studio_event_contracts @relation(fields: [contract_id], references: [id], onDelete: Cascade)
  
  @@index([contract_id, created_at])
  @@index([initiated_by])
}

enum ContractStatus {
  DRAFT
  PUBLISHED
  SIGNED
  CANCELLATION_REQUESTED_BY_STUDIO
  CANCELLATION_REQUESTED_BY_CLIENT
  CANCELLED
}

enum CancellationAction {
  REQUEST
  CONFIRM
  REJECT
}
```

---

## 🔧 Implementación Técnica

### Server Actions

```typescript
// lib/actions/studio/business/contracts/contracts.actions.ts

/**
 * Solicitar cancelación de contrato (Studio)
 */
export async function requestContractCancellationByStudio(
  studioSlug: string,
  contractId: string,
  reason: string
): Promise<ActionResponse<EventContract>>

/**
 * Solicitar cancelación de contrato (Cliente)
 */
export async function requestContractCancellationByClient(
  studioSlug: string,
  contractId: string,
  clientId: string,
  reason: string
): Promise<ActionResponse<EventContract>>

/**
 * Confirmar cancelación (Cliente confirma solicitud del Studio)
 */
export async function confirmContractCancellationByClient(
  studioSlug: string,
  contractId: string,
  clientId: string
): Promise<ActionResponse<EventContract>>

/**
 * Confirmar cancelación (Studio confirma solicitud del Cliente)
 */
export async function confirmContractCancellationByStudio(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<EventContract>>

/**
 * Rechazar cancelación (Cliente rechaza solicitud del Studio)
 */
export async function rejectContractCancellationByClient(
  studioSlug: string,
  contractId: string,
  clientId: string
): Promise<ActionResponse<EventContract>>

/**
 * Rechazar cancelación (Studio rechaza solicitud del Cliente)
 */
export async function rejectContractCancellationByStudio(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<EventContract>>

/**
 * Obtener historial de cancelación
 */
export async function getContractCancellationLogs(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<CancellationLog[]>>
```

### Validaciones

```typescript
// Validaciones en cada acción

1. requestContractCancellationByStudio:
   - ✅ Contrato debe estar en estado 'signed'
   - ✅ Studio debe ser el propietario
   - ✅ Motivo es requerido (mínimo 10 caracteres)

2. requestContractCancellationByClient:
   - ✅ Contrato debe estar en estado 'signed'
   - ✅ Cliente debe ser el contacto del evento
   - ✅ Motivo es requerido (mínimo 10 caracteres)

3. confirmContractCancellationByClient:
   - ✅ Contrato debe estar en 'cancellation_requested_by_studio'
   - ✅ Cliente debe ser el contacto del evento
   - ✅ Debe existir solicitud previa del studio

4. confirmContractCancellationByStudio:
   - ✅ Contrato debe estar en 'cancellation_requested_by_client'
   - ✅ Studio debe ser el propietario
   - ✅ Debe existir solicitud previa del cliente

5. rejectContractCancellation:
   - ✅ Contrato debe estar en estado de cancelación solicitada
   - ✅ La parte que rechaza debe ser la opuesta a la que solicitó
```

---

## 🔔 Notificaciones

### Nuevos Tipos de Notificación

```typescript
// ClientNotificationType
CONTRACT_CANCELLATION_REQUESTED_BY_STUDIO = 'CONTRACT_CANCELLATION_REQUESTED_BY_STUDIO'
CONTRACT_CANCELLATION_CONFIRMED = 'CONTRACT_CANCELLATION_CONFIRMED'
CONTRACT_CANCELLATION_REJECTED = 'CONTRACT_CANCELLATION_REJECTED'

// StudioNotificationType (si no existe)
CONTRACT_CANCELLATION_REQUESTED_BY_CLIENT = 'CONTRACT_CANCELLATION_REQUESTED_BY_CLIENT'
```

### Helpers de Notificación

```typescript
// lib/notifications/client/helpers/contract-notifications.ts

/**
 * Notificar al cliente que el studio solicita cancelar contrato
 */
export async function notifyContractCancellationRequestedByStudio(
  contractId: string,
  reason: string
)

/**
 * Notificar al cliente que su solicitud fue confirmada/rechazada
 */
export async function notifyContractCancellationResponse(
  contractId: string,
  action: 'confirmed' | 'rejected'
)

// lib/notifications/studio/helpers/contract-notifications.ts

/**
 * Notificar al studio que el cliente solicita cancelar contrato
 */
export async function notifyContractCancellationRequestedByClient(
  contractId: string,
  reason: string
)

/**
 * Notificar al studio que su solicitud fue confirmada/rechazada
 */
export async function notifyContractCancellationResponse(
  contractId: string,
  action: 'confirmed' | 'rejected'
)
```

---

## 🎨 UI/UX

### Studio (EventContractCard)

**Cuando contrato está `signed`:**
- Botón "Solicitar cancelación" en dropdown
- Modal con:
  - Campo de texto para motivo (requerido, mínimo 10 caracteres)
  - Advertencia: "El cliente deberá confirmar la cancelación"
  - Botón "Solicitar cancelación"

**Cuando contrato está `cancellation_requested_by_studio`:**
- Badge: "Cancelación solicitada - Esperando confirmación del cliente"
- Mostrar motivo de cancelación
- Botón "Cancelar solicitud" (opcional - revocar solicitud)

**Cuando contrato está `cancellation_requested_by_client`:**
- Badge: "Cliente solicita cancelación"
- Mostrar motivo del cliente
- Botones: "Confirmar cancelación" | "Rechazar"
- Modal de confirmación con motivo visible

**Cuando contrato está `cancelled`:**
- Badge: "Cancelado"
- Mostrar fecha de cancelación
- Mostrar motivo final
- Mostrar quién inició la cancelación
- Botón "Ver historial de cancelación"

### Cliente (contrato/page.tsx)

**Cuando contrato está `signed`:**
- Botón "Solicitar cancelación" (nuevo)
- Modal con:
  - Campo de texto para motivo (requerido, mínimo 10 caracteres)
  - Advertencia: "El estudio deberá confirmar la cancelación"
  - Botón "Solicitar cancelación"

**Cuando contrato está `cancellation_requested_by_studio`:**
- Banner destacado: "El estudio solicita cancelar este contrato"
- Mostrar motivo del studio
- Botones: "Confirmar cancelación" | "Rechazar"
- Modal de confirmación con motivo visible

**Cuando contrato está `cancellation_requested_by_client`:**
- Badge: "Cancelación solicitada - Esperando confirmación del estudio"
- Mostrar motivo de cancelación
- Botón "Cancelar solicitud" (opcional - revocar solicitud)

**Cuando contrato está `cancelled`:**
- Badge: "Contrato cancelado"
- Mostrar fecha de cancelación
- Mostrar motivo final
- Mostrar quién inició la cancelación
- Botón "Ver historial de cancelación"

---

## 📊 Logging y Auditoría

### Tabla de Logs (studio_contract_cancellation_logs)

**Campos:**
- `id`: Identificador único
- `contract_id`: Referencia al contrato
- `action`: 'request', 'confirm', 'reject'
- `initiated_by`: 'studio' | 'client'
- `reason`: Motivo de la acción
- `metadata`: JSON con información adicional
  - Usuario que realizó la acción
  - IP (opcional)
  - Timestamp
- `created_at`: Fecha y hora

### Casos de Uso del Log

1. **Auditoría legal:**
   - Trazabilidad completa de quién hizo qué y cuándo
   - Motivos documentados
   - Historial completo para consultas futuras

2. **Resolución de disputas:**
   - Evidencia de comunicación entre partes
   - Registro de acuerdos y desacuerdos
   - Base para futuras consultas legales

3. **Analytics:**
   - Tasa de cancelaciones
   - Motivos más comunes
   - Tiempo promedio entre solicitud y confirmación

### Query de Ejemplo

```typescript
// Obtener historial completo de cancelación
const logs = await prisma.studio_contract_cancellation_logs.findMany({
  where: { contract_id: contractId },
  orderBy: { created_at: 'asc' }
});

// Resultado:
// [
//   { action: 'request', initiated_by: 'studio', reason: '...', created_at: '...' },
//   { action: 'confirm', initiated_by: 'client', reason: null, created_at: '...' }
// ]
```

---

## 🔐 Seguridad y Validaciones

### Reglas de Negocio

1. **Solo contratos firmados pueden cancelarse:**
   - `draft` y `published` no requieren cancelación (se pueden eliminar/editar)

2. **Cancelación requiere aprobación mutua:**
   - Una parte solicita → La otra debe confirmar
   - Si se rechaza, vuelve a `signed`

3. **Contrato cancelado es inmutable:**
   - No se puede volver a activar
   - No se puede editar
   - Solo lectura y descarga de PDF

4. **Validación de permisos:**
   - Studio solo puede solicitar/confirmar/rechazar en sus propios contratos
   - Cliente solo puede solicitar/confirmar/rechazar en sus propios contratos

5. **Motivo obligatorio:**
   - Mínimo 10 caracteres
   - Máximo 1000 caracteres
   - Sanitización de HTML/XSS

---

## 📋 Plan de Implementación

### Fase 1: Base de Datos

**Sprint 1:**
- [ ] Crear enum `ContractStatus` con nuevos estados
- [ ] Agregar campos a `studio_event_contracts`:
  - `cancelled_at`
  - `cancellation_reason`
  - `cancellation_initiated_by`
- [ ] Crear modelo `studio_contract_cancellation_logs`
- [ ] Crear enum `CancellationAction`
- [ ] Migración de Prisma

### Fase 2: Server Actions

**Sprint 2:**
- [ ] `requestContractCancellationByStudio`
- [ ] `requestContractCancellationByClient`
- [ ] `confirmContractCancellationByClient`
- [ ] `confirmContractCancellationByStudio`
- [ ] `rejectContractCancellationByClient`
- [ ] `rejectContractCancellationByStudio`
- [ ] `getContractCancellationLogs`
- [ ] Validaciones y permisos

### Fase 3: Notificaciones

**Sprint 3:**
- [ ] Agregar tipos de notificación
- [ ] Helpers de notificación (studio y cliente)
- [ ] Integrar notificaciones en server actions
- [ ] Testing de notificaciones

### Fase 4: UI/UX

**Sprint 4:**
- [ ] Actualizar `EventContractCard` (studio)
- [ ] Actualizar `contrato/page.tsx` (cliente)
- [ ] Modales de solicitud/confirmación/rechazo
- [ ] Componente de historial de cancelación
- [ ] Badges y estados visuales
- [ ] Testing de UI

### Fase 5: Polishing

**Sprint 5:**
- [ ] Manejo de errores
- [ ] Loading states
- [ ] Validaciones en frontend
- [ ] Documentación
- [ ] Testing end-to-end

---

## 🎯 Consideraciones Adicionales

### Opcional: Revocar Solicitud

**¿Permitir revocar una solicitud de cancelación?**

**Opción A: Sí permitir**
- Si studio solicita → Puede revocar antes de que cliente confirme
- Si cliente solicita → Puede revocar antes de que studio confirme
- **Ventaja:** Flexibilidad
- **Desventaja:** Más complejidad

**Opción B: No permitir (Recomendado)**
- Una vez solicitada, solo se puede confirmar o rechazar
- **Ventaja:** Más simple, menos confusión
- **Desventaja:** Menos flexible

**Recomendación:** Opción B (no permitir revocar) para mantener simplicidad.

### Opcional: Tiempo de Expiración

**¿Las solicitudes de cancelación expiran?**

- **Opción A:** Sin expiración (permanente hasta confirmar/rechazar)
- **Opción B:** Expiración automática (ej: 30 días)
  - Si expira, vuelve a `signed`
  - Notificación antes de expirar

**Recomendación:** Opción A (sin expiración) para MVP. Opción B para Fase 2.

### Opcional: Cancelación Automática por Evento

**¿Si se cancela el evento, se cancela automáticamente el contrato?**

- **Opción A:** Sí, automático
- **Opción B:** No, requiere proceso separado

**Recomendación:** Opción B (proceso separado) porque:
- El contrato es un documento legal independiente
- Puede haber razones legales para mantener el contrato aunque el evento se cancele
- Más control y trazabilidad

---

## 📝 Ejemplo de Flujo Completo

### Escenario: Studio solicita cancelación

```
1. Contrato está 'signed'
   ↓
2. Studio hace click en "Solicitar cancelación"
   ↓
3. Modal: Ingresa motivo (ej: "Cliente solicitó cambio de fecha")
   ↓
4. Studio confirma → Server Action: requestContractCancellationByStudio
   ↓
5. Estado cambia a 'cancellation_requested_by_studio'
   ↓
6. Log creado: { action: 'request', initiated_by: 'studio', reason: '...' }
   ↓
7. Notificación al cliente: "El estudio solicita cancelar el contrato"
   ↓
8. Cliente ve banner en portal: "El estudio solicita cancelar este contrato"
   ↓
9. Cliente revisa motivo y detalles
   ↓
10. Cliente hace click en "Confirmar cancelación"
    ↓
11. Server Action: confirmContractCancellationByClient
    ↓
12. Estado cambia a 'cancelled'
    ↓
13. Log creado: { action: 'confirm', initiated_by: 'client' }
    ↓
14. Notificación al studio: "El cliente confirmó la cancelación del contrato"
    ↓
15. Contrato ahora es 'cancelled' (inmutable, solo lectura)
```

---

## ✅ Ventajas de esta Solución

1. **Cumple requisitos legales:**
   - Contrato firmado no se puede editar/eliminar directamente
   - Cancelación requiere acuerdo mutuo
   - Trazabilidad completa

2. **Comunicación clara:**
   - Notificaciones bidireccionales
   - Motivos documentados
   - Estados visibles para ambas partes

3. **Auditoría completa:**
   - Log de todas las acciones
   - Historial consultable
   - Base para futuras consultas legales

4. **UX clara:**
   - Estados visuales (badges)
   - Flujos guiados (modales)
   - Información contextual

5. **Escalable:**
   - Fácil agregar más estados si es necesario
   - Logging extensible
   - Notificaciones configurables

---

## 📝 Versionado Automático de Contratos

### Problema Identificado

**Situación Actual:**
- ✅ Ya existe versionado básico (`version: contract.version + 1`)
- ❌ **Problema:** No hay historial de versiones anteriores
- ❌ **Problema:** No se puede ver qué cambió entre versiones
- ❌ **Problema:** No hay regeneración automática cuando cambian datos del evento

**Datos que pueden cambiar y requieren regeneración:**
- Nombre del cliente (`nombre_cliente`)
- Email y teléfono del contacto
- Dirección (si se agrega)
- Fecha del evento
- Tipo de evento
- Servicios incluidos (nueva cotización autorizada)
- Total del contrato (precio, descuentos)
- Condiciones comerciales

### Solución Propuesta: Historial de Versiones

#### Estructura de Base de Datos

```prisma
// Modelo existente (mejorado)
model studio_event_contracts {
  id                   String    @id @default(cuid())
  studio_id            String
  event_id             String    @unique
  template_id          String?
  content              String    @db.Text
  status               ContractStatus @default(DRAFT)
  version              Int       @default(1)
  signed_at            DateTime?
  signed_by_client     Boolean   @default(false)
  client_signature_url String?
  created_by           String?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt
  
  // Campos para cancelación (de sección anterior)
  cancelled_at         DateTime?
  cancellation_reason String?   @db.Text
  cancellation_initiated_by String?
  
  // Relaciones
  studio          studios                    @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  event           studio_events              @relation(fields: [event_id], references: [id], onDelete: Cascade)
  template        studio_contract_templates? @relation(fields: [template_id], references: [id])
  created_by_user studio_users?              @relation(fields: [created_by], references: [id])
  versions        studio_contract_versions[] // Nuevo: historial de versiones
  cancellation_logs studio_contract_cancellation_logs[]
  
  @@index([studio_id, status])
  @@index([event_id])
  @@index([template_id])
  @@index([status, cancelled_at])
}

// Nuevo modelo para historial de versiones
model studio_contract_versions {
  id                String   @id @default(cuid())
  contract_id       String
  version           Int      // Versión específica (1, 2, 3...)
  content           String   @db.Text // Contenido renderizado de esta versión
  status            ContractStatus // Estado en el que estaba esta versión
  change_reason     String?  @db.Text // Motivo del cambio (manual o automático)
  change_type       ChangeType // Tipo de cambio
  changed_fields    Json?    // Campos que cambiaron (snapshot de datos)
  created_by        String?  // Usuario que creó esta versión (null si fue automático)
  created_at        DateTime @default(now())
  
  contract          studio_event_contracts @relation(fields: [contract_id], references: [id], onDelete: Cascade)
  created_by_user   studio_users? @relation(fields: [created_by], references: [id])
  
  @@unique([contract_id, version])
  @@index([contract_id, created_at])
  @@index([change_type])
}

enum ChangeType {
  MANUAL_EDIT        // Edición manual del contenido
  AUTO_REGENERATE    // Regeneración automática por cambio de datos
  TEMPLATE_UPDATE    // Actualización de plantilla
  DATA_UPDATE        // Actualización de datos del evento (nombre, servicios, etc.)
}
```

#### Flujo de Versionado

**Escenario 1: Edición Manual**

```
Contrato v1 (draft)
    ↓
Studio edita contenido manualmente
    ↓
Guardar → Crea v2
    ↓
Guardar versión anterior en studio_contract_versions:
  - version: 1
  - content: contenido anterior
  - change_type: MANUAL_EDIT
  - change_reason: "Corrección de texto"
    ↓
Actualizar contrato:
  - version: 2
  - content: nuevo contenido
```

**Escenario 2: Regeneración Automática por Cambio de Datos**

```
Contrato v2 (published)
    ↓
Studio actualiza nombre del cliente en el evento
    ↓
Trigger detecta cambio en datos del evento
    ↓
Si contrato está draft o published:
  - Guardar versión actual en historial
  - Regenerar contrato con nuevos datos
  - Incrementar versión
  - change_type: AUTO_REGENERATE
  - change_reason: "Actualización automática: nombre del cliente"
  - changed_fields: { nombre_cliente: { old: "...", new: "..." } }
    ↓
Notificar al studio: "Contrato regenerado automáticamente"
```

**Escenario 3: Nueva Cotización Autorizada**

```
Contrato v3 (published)
    ↓
Nueva cotización autorizada para el evento
    ↓
Trigger detecta nueva cotización autorizada
    ↓
Si contrato está draft o published:
  - Guardar versión actual
  - Regenerar con nuevos servicios
  - Incrementar versión
  - change_type: DATA_UPDATE
  - change_reason: "Nueva cotización autorizada - servicios actualizados"
  - changed_fields: { servicios: { added: [...], removed: [...] } }
    ↓
Notificar al studio y cliente: "Contrato actualizado con nuevos servicios"
```

#### Server Actions

```typescript
// lib/actions/studio/business/contracts/contracts.actions.ts

/**
 * Actualizar contrato (manual) - Mejorado con historial
 */
export async function updateEventContract(
  studioSlug: string,
  contractId: string,
  data: {
    content: string;
    change_reason?: string; // Nuevo: motivo del cambio
  }
): Promise<ActionResponse<EventContract>>

/**
 * Regenerar contrato automáticamente (por cambio de datos)
 */
export async function autoRegenerateContract(
  studioSlug: string,
  eventId: string,
  changeType: ChangeType,
  changeReason: string,
  changedFields?: Record<string, { old: any; new: any }>
): Promise<ActionResponse<EventContract>>

/**
 * Obtener historial de versiones
 */
export async function getContractVersions(
  studioSlug: string,
  contractId: string
): Promise<ActionResponse<ContractVersion[]>>

/**
 * Ver versión específica
 */
export async function getContractVersion(
  studioSlug: string,
  contractId: string,
  version: number
): Promise<ActionResponse<ContractVersion>>

/**
 * Comparar dos versiones
 */
export async function compareContractVersions(
  studioSlug: string,
  contractId: string,
  version1: number,
  version2: number
): Promise<ActionResponse<VersionComparison>>
```

#### Triggers para Regeneración Automática

**Opción A: Database Triggers (PostgreSQL)**

```sql
-- Trigger que detecta cambios en datos del evento
CREATE OR REPLACE FUNCTION auto_regenerate_contract_on_event_change()
RETURNS TRIGGER AS $$
DECLARE
  contract_record RECORD;
  changed_fields JSONB := '{}'::JSONB;
BEGIN
  -- Detectar cambios relevantes
  IF OLD.contact_id IS DISTINCT FROM NEW.contact_id THEN
    changed_fields := changed_fields || jsonb_build_object('contact_id', jsonb_build_object('old', OLD.contact_id, 'new', NEW.contact_id));
  END IF;
  
  -- Buscar contrato asociado
  SELECT * INTO contract_record
  FROM studio_event_contracts
  WHERE event_id = NEW.id
    AND status IN ('draft', 'published');
  
  IF contract_record IS NOT NULL THEN
    -- Llamar a función de regeneración (vía pg_notify o similar)
    PERFORM pg_notify('contract_regenerate', json_build_object(
      'contract_id', contract_record.id,
      'event_id', NEW.id,
      'change_type', 'DATA_UPDATE',
      'changed_fields', changed_fields
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_regenerate_contract
  AFTER UPDATE ON studio_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_regenerate_contract_on_event_change();
```

**Opción B: Server Actions en Puntos de Cambio (Recomendado)**

```typescript
// En las acciones que modifican datos del evento

// Ejemplo: Actualizar contacto
export async function updateEventContact(...) {
  // ... actualizar contacto ...
  
  // Regenerar contratos si es necesario
  await checkAndRegenerateContracts(eventId, {
    changeType: 'DATA_UPDATE',
    changeReason: 'Contacto actualizado',
    changedFields: { contact: { old: oldContact, new: newContact } }
  });
}

// Helper para regenerar contratos
async function checkAndRegenerateContracts(
  eventId: string,
  changeInfo: {
    changeType: ChangeType;
    changeReason: string;
    changedFields?: Record<string, any>;
  }
) {
  const contracts = await prisma.studio_event_contracts.findMany({
    where: {
      event_id: eventId,
      status: { in: ['draft', 'published'] }
    }
  });
  
  for (const contract of contracts) {
    await autoRegenerateContract(
      studioSlug,
      eventId,
      changeInfo.changeType,
      changeInfo.changeReason,
      changeInfo.changedFields
    );
  }
}
```

#### UI para Historial de Versiones

**Studio (EventContractCard):**

```typescript
// Botón "Ver historial" cuando hay más de 1 versión
{contract.version > 1 && (
  <ZenButton
    variant="ghost"
    size="sm"
    onClick={() => setShowVersionsModal(true)}
  >
    <History className="h-4 w-4 mr-2" />
    Versiones ({contract.version})
  </ZenButton>
)}

// Modal de historial
<ContractVersionsModal
  isOpen={showVersionsModal}
  onClose={() => setShowVersionsModal(false)}
  contractId={contract.id}
  studioSlug={studioSlug}
/>
```

**Componente ContractVersionsModal:**

```typescript
// Muestra lista de versiones
// - Versión actual destacada
// - Versiones anteriores con:
//   - Número de versión
//   - Fecha de creación
//   - Tipo de cambio
//   - Motivo del cambio
//   - Botón "Ver" para comparar
//   - Botón "Descargar PDF" (si está disponible)
```

#### Comparación de Versiones

```typescript
// Componente para comparar versiones
<ContractVersionComparison
  version1={version1}
  version2={version2}
  // Muestra:
  // - Diferencias en contenido (diff visual)
  // - Campos que cambiaron (si están en changed_fields)
  // - Side-by-side o unified diff
/>
```

### Reglas de Negocio

1. **Solo contratos no firmados se regeneran automáticamente:**
   - `draft` → Sí se regenera
   - `published` → Sí se regenera (nueva versión en draft)
   - `signed` → No se regenera (inmutable)

2. **Regeneración automática crea nueva versión:**
   - Guarda versión anterior en historial
   - Incrementa versión
   - Si estaba `published`, nueva versión queda en `draft`

3. **Notificaciones:**
   - Studio: "Contrato regenerado automáticamente por cambio en [campo]"
   - Cliente (si estaba published): "El estudio actualizó el contrato - nueva versión disponible"

4. **Campos que disparan regeneración:**
   - ✅ Nombre del cliente
   - ✅ Email/teléfono del contacto
   - ✅ Fecha del evento
   - ✅ Tipo de evento
   - ✅ Nueva cotización autorizada (servicios)
   - ✅ Cambio en precio/descuento
   - ✅ Cambio en condiciones comerciales

### Plan de Implementación

**Fase 1: Base de Datos**
- [ ] Crear modelo `studio_contract_versions`
- [ ] Crear enum `ChangeType`
- [ ] Migración Prisma

**Fase 2: Server Actions**
- [ ] Mejorar `updateEventContract` para guardar historial
- [ ] Crear `autoRegenerateContract`
- [ ] Crear `getContractVersions`
- [ ] Crear `getContractVersion`
- [ ] Crear `compareContractVersions`

**Fase 3: Triggers de Regeneración**
- [ ] Agregar llamadas a regeneración en:
  - Actualización de contacto
  - Actualización de evento
  - Nueva cotización autorizada
  - Cambio en condiciones comerciales

**Fase 4: UI**
- [ ] Componente `ContractVersionsModal`
- [ ] Componente `ContractVersionComparison`
- [ ] Integrar en `EventContractCard`
- [ ] Integrar en página de cliente (si aplica)

**Fase 5: Notificaciones**
- [ ] Notificar regeneración automática al studio
- [ ] Notificar nueva versión al cliente (si estaba published)

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Abuso del sistema
**Mitigación:** 
- Validar que solo el propietario puede solicitar
- Rate limiting en solicitudes
- Requerir motivo (dificulta solicitudes frívolas)

### Riesgo 2: Confusión de estados
**Mitigación:**
- UI clara con badges y mensajes
- Help modal explicando estados
- Tooltips informativos

### Riesgo 3: Contratos cancelados por error
**Mitigación:**
- Confirmación explícita antes de cancelar
- Mostrar motivo antes de confirmar
- No permitir revocar (fuerza a ser cuidadoso)

---

## 📚 Referencias

### Modelos y Base de Datos
- **Modelo actual:** `prisma/schema.prisma` (studio_event_contracts)
- **Renderer:** `src/lib/actions/studio/business/contracts/renderer.actions.ts`
  - `getEventContractData()` - Obtiene datos del evento para renderizar
  - Variables disponibles: `@nombre_cliente`, `@fecha_evento`, `@tipo_evento`, `@nombre_evento`, `@total_contrato`, `@condiciones_pago`, `@nombre_studio`

### Server Actions
- **Contratos:** `src/lib/actions/studio/business/contracts/contracts.actions.ts`
  - `updateEventContract()` - Ya tiene versionado básico (línea 205)
  - `regenerateEventContract()` - Regenera con datos actualizados (línea 274)
  - `publishEventContract()` - Publica contrato
  - `signEventContract()` - Firma contrato

### UI Components
- **Studio:** `src/app/[slug]/studio/business/events/[eventId]/components/EventContractCard.tsx`
- **Cliente:** `src/app/[slug]/cliente/[clientId]/[eventId]/contrato/page.tsx`

### Notificaciones
- **Cliente:** `src/lib/notifications/client/helpers/contract-notifications.ts`
  - `notifyContractAvailable()` - Cuando se publica contrato

### Datos que se Renderizan en Contratos
- `nombre_cliente` - De `event.promise.contact.name`
- `email`, `phone` - De `event.promise.contact`
- `fecha_evento` - De `event.promise.event_date`
- `tipo_evento` - De `event.event_type.name`
- `nombre_evento` - De `event.promise.name`
- `servicios_incluidos` - De `event.cotizacion.cotizacion_items`
- `total_contrato` - De `event.cotizacion.price`
- `condiciones_pago` - De `event.cotizacion.condiciones_comerciales`

---

**Última actualización:** 2025-01-28  
**Versión:** 2.0.0  
**Estado:** Análisis completo - Incluye cancelación mutua y versionado automático

