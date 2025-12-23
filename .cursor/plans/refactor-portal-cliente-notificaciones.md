# Plan de Refactor: Portal Cliente + Notificaciones Realtime

## 📋 Análisis Completo

### Estado Actual

**Página Principal (`/cliente/[clientId]/[eventId]/page.tsx`):**
- Header con info básica (nombre, fecha, ubicación, tipo)
- `ServiciosContratadosTree` (servicios de cotización)
- `ResumenPago` (total, pagado, pendiente, descuento)
- Descripción de cotización

**Páginas Separadas:**
- `/pagos` - Historial + BankInfoCard
- `/cotizaciones` - Vacía (próximamente)
- `/contrato` - Vista y firma funcional
- `/entrega-digital` - Existe

**Datos Disponibles:**
- `evento.cotizacion` - Solo primera cotización autorizada
- ❌ No hay etapa/pipeline stage en `ClientEventDetail`
- ❌ No hay múltiples cotizaciones
- ❌ No hay estatus de entregables
- ❌ No hay notificaciones

### Propuesta de Refactor

#### 1. **Mi Evento**
- **Etapa del evento**: Agregar `stage` a `obtenerEventoDetalle`
- **Balance financiero**: Mover `ResumenPago` aquí
- **Estatus entregables**: Componente de estado

#### 2. **Mis Cotizaciones**
- Si 1 cotización: Detalle completo
- Si múltiples: Cards por cotización + resumen total
- **Nota**: Actualmente solo se obtiene 1 cotización, necesitamos modificar `obtenerEventoDetalle`

#### 3. **Balance Financiero**
- Mover historial de pagos de `/pagos` a página principal
- Incluir `BankInfoCard` con datos copiables
- Botón "Datos para pago" → Modal/Popover con:
  - Nombre beneficiario (copiable)
  - Nombre del banco (no copiable)
  - CLABE bancaria (copiable)
  - Cada elemento copiable independiente

#### 4. **Entrega Digital**
- Mantener como está

#### 5. **Contrato**
- Si publicado: Card con preview + botón "Autorizar"
- Modal confirmación: "Una vez autorizado no se podrá modificar ni eliminar"
- Seguir flujo de `EventContractCard`

---

## 🔔 Sistema de Notificaciones Realtime

### Tipos de Notificaciones

1. **Entregables**
   - `DELIVERABLE_ADDED` - Entregable agregado
   - `DELIVERABLE_UPDATED` - Entregable actualizado
   - `DELIVERABLE_DELETED` - Entregable eliminado

2. **Pagos**
   - `PAYMENT_RECEIVED` - Pago recibido/abonado
   - `PAYMENT_CANCELLED` - Pago cancelado

3. **Contrato**
   - `CONTRACT_AVAILABLE` - Contrato disponible para revisión

4. **Evento**
   - `EVENT_STAGE_CHANGED` - Cambio de estatus/etapa

### Modelo de Base de Datos

```prisma
model studio_client_notifications {
  id String @id @default(cuid())

  // Destinatario
  contact_id String // studio_contacts.id
  studio_id  String

  // Tipo y contenido
  type     ClientNotificationType
  title    String
  message  String
  category String                 @default("general")
  priority NotificationPriority   @default(MEDIUM)

  // Navegación y tracking
  route        String?
  route_params Json?
  clicked_at   DateTime?
  is_read      Boolean   @default(false)
  read_at      DateTime?

  // Metadata estructurado
  metadata Json?

  // Relaciones con entidades
  promise_id    String?
  event_id      String?
  payment_id    String?
  quote_id      String?
  deliverable_id String?
  contract_id   String?

  // Control de ciclo de vida
  is_active     Boolean   @default(true)
  expires_at    DateTime?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  // Relaciones
  contact  studio_contacts @relation(fields: [contact_id], references: [id], onDelete: Cascade)
  studio   studios        @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  promise  studio_promises? @relation(fields: [promise_id], references: [id], onDelete: SetNull)
  event    studio_events?   @relation(fields: [event_id], references: [id], onDelete: SetNull)
  payment  studio_pagos?    @relation(fields: [payment_id], references: [id], onDelete: SetNull)

  // Índices
  @@index([contact_id, is_read, created_at])
  @@index([contact_id, is_active, created_at])
  @@index([studio_id, contact_id, is_read])
  @@index([type, category])
  @@index([created_at])
  @@index([expires_at])
  @@index([event_id])
  @@index([payment_id])
  @@index([deliverable_id])
}

enum ClientNotificationType {
  DELIVERABLE_ADDED
  DELIVERABLE_UPDATED
  DELIVERABLE_DELETED
  PAYMENT_RECEIVED
  PAYMENT_CANCELLED
  CONTRACT_AVAILABLE
  EVENT_STAGE_CHANGED
}
```

### Arquitectura de Notificaciones

**Estructura de Archivos:**
```
src/lib/notifications/client/
├── types.ts                          # Tipos y enums
├── studio-client-notification.service.ts    # Servicio centralizado
├── helpers/
│   ├── deliverable-notifications.ts # Helpers para entregables
│   ├── payment-notifications.ts     # Helpers para pagos
│   ├── contract-notifications.ts   # Helpers para contratos
│   └── event-notifications.ts      # Helpers para eventos
└── index.ts                          # Exports
```

**Hook Realtime:**
```
src/hooks/useClientNotifications.ts  # Similar a useStudioNotifications
```

**Componentes UI:**
```
src/components/client/notifications/
├── NotificationsDropdown.tsx        # Dropdown en header
├── NotificationsHistorySheet.tsx    # Sheet con historial
└── NotificationItem.tsx             # Item individual
```

### Puntos de Integración

**1. Entregables** (`src/lib/actions/studio/business/events/deliverables.actions.ts`):
- `crearEntregable` → `notifyDeliverableAdded`
- `actualizarEntregable` → `notifyDeliverableUpdated`
- `eliminarEntregable` → `notifyDeliverableDeleted`

**2. Pagos** (`src/lib/actions/studio/business/payments/`):
- Al crear/registrar pago → `notifyPaymentReceived`
- Al cancelar pago → `notifyPaymentCancelled`

**3. Contratos** (`src/lib/actions/studio/business/contracts/contracts.actions.ts`):
- `publishEventContract` → `notifyContractAvailable`

**4. Eventos** (`src/lib/actions/studio/business/events/events.actions.ts`):
- `moveEvent` (cambio de etapa) → `notifyEventStageChanged`

---

## 📦 Plan de Trabajo por Etapas

### **ETAPA 1: Base de Datos y Modelos** ⚠️ CRÍTICO

**Objetivo:** Crear modelo de notificaciones y migración

**Tareas:**
1. ✅ Agregar `studio_client_notifications` al schema Prisma
2. ✅ Agregar enum `ClientNotificationType`
3. ✅ Crear migración manual
4. ✅ Agregar relaciones en `studio_contacts`, `studios`, etc.
5. ✅ Crear trigger de Realtime (similar a `studio_notifications`)

**Archivos:**
- `prisma/schema.prisma` - Agregar modelo
- `supabase/migrations/YYYYMMDD_create_studio_client_notifications.sql` - Migración

**Validación:**
- ✅ Migración ejecuta sin errores
- ✅ Relaciones funcionan correctamente
- ✅ Trigger de Realtime funciona

---

### **ETAPA 2: Servicio de Notificaciones**

**Objetivo:** Crear servicio centralizado para crear notificaciones

**Tareas:**
1. ✅ Crear `src/lib/notifications/client/types.ts`
2. ✅ Crear `src/lib/notifications/client/studio-client-notification.service.ts`
3. ✅ Crear helpers por tipo:
   - `deliverable-notifications.ts`
   - `payment-notifications.ts`
   - `contract-notifications.ts`
   - `event-notifications.ts`
4. ✅ Crear `index.ts` con exports

**Archivos:**
- `src/lib/notifications/client/types.ts`
- `src/lib/notifications/client/studio-client-notification.service.ts`
- `src/lib/notifications/client/helpers/*.ts`
- `src/lib/notifications/client/index.ts`

**Validación:**
- ✅ Servicio crea notificaciones correctamente
- ✅ Helpers generan títulos/mensajes apropiados
- ✅ Rutas se construyen correctamente

---

### **ETAPA 3: Hook Realtime**

**Objetivo:** Hook para suscribirse a notificaciones en tiempo real

**Tareas:**
1. ✅ Crear `src/hooks/useClientNotifications.ts`
2. ✅ Implementar suscripción a canal Realtime
3. ✅ Manejar INSERT, UPDATE, DELETE
4. ✅ Gestionar estado de notificaciones (unread count)
5. ✅ Funciones `markAsRead`, `markAsClicked`

**Archivos:**
- `src/hooks/useClientNotifications.ts`

**Validación:**
- ✅ Hook se suscribe correctamente
- ✅ Notificaciones aparecen en tiempo real
- ✅ Contador de no leídas funciona

---

### **ETAPA 4: Componentes UI**

**Objetivo:** Componentes para mostrar notificaciones

**Tareas:**
1. ✅ Crear `NotificationsDropdown.tsx` (similar a studio)
2. ✅ Crear `NotificationsHistorySheet.tsx`
3. ✅ Crear `NotificationItem.tsx`
4. ✅ Integrar en layout del cliente

**Archivos:**
- `src/components/client/notifications/NotificationsDropdown.tsx`
- `src/components/client/notifications/NotificationsHistorySheet.tsx`
- `src/components/client/notifications/NotificationItem.tsx`
- `src/app/[slug]/cliente/[clientId]/components/ClientLayoutWrapper.tsx`

**Validación:**
- ✅ Dropdown muestra notificaciones
- ✅ Sheet muestra historial completo
- ✅ Navegación funciona correctamente

---

### **ETAPA 5: Integración con Eventos**

**Objetivo:** Conectar notificaciones con acciones del estudio

**Tareas:**
1. ✅ Integrar en `crearEntregable` → `notifyDeliverableAdded`
2. ✅ Integrar en `actualizarEntregable` → `notifyDeliverableUpdated`
3. ✅ Integrar en `eliminarEntregable` → `notifyDeliverableDeleted`
4. ✅ Integrar en registro de pago → `notifyPaymentReceived`
5. ✅ Integrar en cancelación de pago → `notifyPaymentCancelled`
6. ✅ Integrar en `publishEventContract` → `notifyContractAvailable`
7. ✅ Integrar en `moveEvent` → `notifyEventStageChanged`

**Archivos:**
- `src/lib/actions/studio/business/events/deliverables.actions.ts`
- `src/lib/actions/studio/business/payments/*.ts`
- `src/lib/actions/studio/business/contracts/contracts.actions.ts`
- `src/lib/actions/studio/business/events/events.actions.ts`

**Validación:**
- ✅ Cada acción genera notificación correcta
- ✅ Cliente recibe notificación en tiempo real
- ✅ Rutas de navegación funcionan

---

### **ETAPA 6: Refactor UI Portal Cliente**

**Objetivo:** Reestructurar página principal del evento

**Tareas:**
1. ✅ Modificar `obtenerEventoDetalle` para incluir:
   - `stage` (pipeline stage)
   - Todas las cotizaciones autorizadas
   - Estatus de entregables
2. ✅ Reestructurar `page.tsx` con secciones:
   - **Mi Evento** (etapa + balance + entregables)
   - **Mis Cotizaciones** (cards o detalle)
   - **Balance Financiero** (historial + bank info modal)
   - **Entrega Digital** (link o embed)
   - **Contrato** (card con preview si publicado)
3. ✅ Crear componentes:
   - `EventStageCard.tsx`
   - `CotizacionesList.tsx`
   - `PaymentDataModal.tsx`
   - `ContractPreviewCard.tsx`

**Archivos:**
- `src/lib/actions/public/cliente/eventos.actions.ts`
- `src/app/[slug]/cliente/[clientId]/[eventId]/page.tsx`
- `src/app/[slug]/cliente/[clientId]/[eventId]/components/*.tsx`

**Validación:**
- ✅ Todas las secciones se muestran correctamente
- ✅ Datos se cargan correctamente
- ✅ Navegación funciona

---

## 🔒 Consideraciones de Integridad

### Orden de Ejecución

1. **ETAPA 1 PRIMERO** - Base de datos debe estar lista antes de código
2. **ETAPA 2-3** - Servicio y hook pueden desarrollarse en paralelo
3. **ETAPA 4** - Componentes dependen de ETAPA 3
4. **ETAPA 5** - Integración depende de ETAPA 2
5. **ETAPA 6** - Refactor UI puede hacerse en paralelo con ETAPA 4-5

### Validaciones por Etapa

**ETAPA 1:**
- ✅ Migración ejecuta sin errores
- ✅ Modelo `studio_client_notifications` se crea correctamente
- ✅ Relaciones funcionan
- ✅ Trigger de Realtime funciona

**ETAPA 2-3:**
- ✅ Notificaciones se crean en BD
- ✅ Realtime envía eventos
- ✅ Hook recibe eventos

**ETAPA 4:**
- ✅ UI muestra notificaciones
- ✅ Navegación funciona
- ✅ Estados se actualizan

**ETAPA 5:**
- ✅ Cada acción genera notificación
- ✅ Cliente recibe en tiempo real

**ETAPA 6:**
- ✅ Todas las secciones funcionan
- ✅ Datos se muestran correctamente

### Rollback Plan

Si algo falla:
1. **ETAPA 1**: Revertir migración (DROP TABLE `studio_client_notifications`)
2. **ETAPA 2-5**: Desactivar integraciones (comentar código)
3. **ETAPA 6**: Mantener página actual como fallback

---

## 📝 Notas Técnicas

### Realtime Channel

**Canal:** `client:{studioSlug}:{contactId}:notifications`

**Eventos:**
- `INSERT` - Nueva notificación
- `UPDATE` - Notificación actualizada (leída)
- `DELETE` - Notificación eliminada

### Rutas de Navegación

**Formato:** `/{slug}/cliente/{clientId}/{eventId}/{section}`

**Ejemplos:**
- Entregable: `/{slug}/cliente/{clientId}/{eventId}/entrega-digital`
- Pago: `/{slug}/cliente/{clientId}/{eventId}/pagos`
- Contrato: `/{slug}/cliente/{clientId}/{eventId}/contrato`
- Evento: `/{slug}/cliente/{clientId}/{eventId}`

### Prioridades

- **URGENT**: Contrato disponible
- **HIGH**: Pago recibido, Cambio de etapa
- **MEDIUM**: Entregables (agregado/actualizado)
- **LOW**: Entregable eliminado

---

## ✅ Checklist Final

- [ ] ETAPA 1: Base de datos y modelos
- [ ] ETAPA 2: Servicio de notificaciones
- [ ] ETAPA 3: Hook Realtime
- [ ] ETAPA 4: Componentes UI
- [ ] ETAPA 5: Integración con eventos
- [ ] ETAPA 6: Refactor UI Portal Cliente
- [ ] Testing completo
- [ ] Documentación actualizada

