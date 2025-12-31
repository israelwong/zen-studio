# Sistema de Plantillas de Contrato y Datos Requeridos

## Objetivo

Implementar un sistema completo que garantice que los estudios tengan todos los datos necesarios para generar contratos legalmente válidos, con plantillas por defecto automáticas y validaciones en los puntos críticos del flujo.

## Contexto Actual

### Lo que ya existe:
1. ✅ `DEFAULT_CONTRACT_TEMPLATE` constante en TypeScript (`src/lib/constants/contract-template.ts`)
2. ✅ `ConfirmClientDataCard` para confirmación de datos del cliente en portal
3. ✅ `confirmClientDataAndGenerateContract` que genera contrato automáticamente
4. ✅ Flujo de promesas desde leadforms funcionando
5. ✅ Portal del cliente con estados `contract_pending`, `contract_generated`, `contract_signed`
6. ✅ Variable `@nombre_studio` en contratos

### Lo que falta:
1. ❌ Variables del estudio en el editor (solo existe `@nombre_studio`)
2. ❌ Campo `representative_name` en el modelo `studios`
3. ❌ Validación de datos del estudio antes de abrir selector de plantillas
4. ❌ Creación automática de plantilla default cuando se tienen todos los datos
5. ❌ Validación de datos del cliente en modal Autorizar Cotización
6. ❌ Simplificar `studio_phones` (solo 1 teléfono activo)

## Decisiones Técnicas

### 1. Simplificar `studio_phones`
**Decisión:** Migrar a campo directo `phone String?` en `studios`
- Eliminar complejidad de relación múltiple
- Mantener `studio_phones` por compatibilidad pero marcar como legacy
- Migrar datos existentes al campo directo

### 2. Cuándo crear plantilla default
**Decisión:** Solo cuando se tienen todos los datos del estudio
- No al crear studio
- Solo cuando se necesita (al abrir selector de plantillas)
- Requiere validación previa de datos completos

### 3. Validación de datos
**Decisión:** Todos los campos son obligatorios legalmente
- Validar en portal del cliente (ya existe)
- Validar en modal Autorizar Cotización (nuevo)
- Bloquear generación de contratos si faltan datos

## Cambios en Base de Datos

### Migración 1: Agregar campos del estudio para contratos

**Archivo:** `supabase/migrations/20250131000000_add_studio_contract_data_fields.sql`

```sql
-- Migration: Add studio contract data fields
-- Description: Agregar campos necesarios para generar contratos legalmente válidos
-- Date: 2025-01-31

-- =====================================================
-- 1. Agregar campo representative_name
-- =====================================================

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS representative_name TEXT;

COMMENT ON COLUMN studios.representative_name IS 
'Nombre del representante legal del estudio. Requerido para generar contratos.';

-- =====================================================
-- 2. Agregar campo phone directo (simplificar de studio_phones)
-- =====================================================

ALTER TABLE studios
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN studios.phone IS 
'Teléfono principal del estudio. Reemplaza la necesidad de studio_phones para contratos.';

-- =====================================================
-- 3. Migrar datos existentes de studio_phones a phone
-- =====================================================

-- Migrar el primer teléfono activo de cada studio al campo phone
UPDATE studios s
SET phone = (
  SELECT sp.number
  FROM studio_phones sp
  WHERE sp.studio_id = s.id
    AND sp.is_active = true
  ORDER BY sp.order ASC, sp.created_at ASC
  LIMIT 1
)
WHERE s.phone IS NULL;

-- =====================================================
-- 4. Agregar índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_studios_phone ON studios(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_studios_representative_name ON studios(representative_name) WHERE representative_name IS NOT NULL;
```

### Migración 2: Actualizar Prisma Schema

**Archivo:** `prisma/schema.prisma`

```prisma
model studios {
  // ... campos existentes ...
  representative_name String?  // NUEVO: Nombre del representante legal
  phone               String?  // NUEVO: Teléfono principal (simplificado)
  // ... resto de campos ...
}
```

## Plan de Implementación

### Fase 1: Base de Datos y Variables

#### 1.1 Extender variables de contrato
**Archivo:** `src/types/contracts.ts`

Agregar a `CONTRACT_VARIABLES`:
```typescript
// Studio (nuevas variables)
{
  key: "@nombre_representante",
  label: "Nombre del Representante Legal",
  description: "Nombre del representante legal del estudio",
  example: "Juan Pérez",
},
{
  key: "@telefono_studio",
  label: "Teléfono del Studio",
  description: "Teléfono principal de contacto del estudio",
  example: "+52 55 1234 5678",
},
{
  key: "@correo_studio",
  label: "Correo del Studio",
  description: "Correo electrónico del estudio",
  example: "contacto@studio.com",
},
{
  key: "@direccion_studio",
  label: "Dirección del Studio",
  description: "Dirección completa del estudio",
  example: "Av. Reforma 123, CDMX",
},
```

#### 1.2 Crear función para obtener datos del estudio
**Archivo:** `src/lib/actions/studio/business/contracts/templates.actions.ts`

```typescript
export interface StudioContractData {
  nombre_studio: string;
  nombre_representante: string | null;
  telefono_studio: string | null;
  correo_studio: string;
  direccion_studio: string | null;
}

export interface StudioContractDataValidation {
  isValid: boolean;
  missingFields: string[];
}

/**
 * Obtiene los datos del estudio necesarios para generar contratos
 */
export async function getStudioContractData(
  studioSlug: string
): Promise<ActionResponse<StudioContractData>> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        studio_name: true,
        representative_name: true,
        phone: true,
        email: true,
        address: true,
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    return {
      success: true,
      data: {
        nombre_studio: studio.studio_name,
        nombre_representante: studio.representative_name || null,
        telefono_studio: studio.phone || null,
        correo_studio: studio.email,
        direccion_studio: studio.address || null,
      },
    };
  } catch (error) {
    console.error("[getStudioContractData] Error:", error);
    return { success: false, error: "Error al obtener datos del estudio" };
  }
}

/**
 * Valida que todos los datos del estudio estén completos
 */
export function validateStudioContractData(
  data: StudioContractData
): StudioContractDataValidation {
  const missingFields: string[] = [];

  if (!data.nombre_representante || data.nombre_representante.trim() === "") {
    missingFields.push("nombre_representante");
  }
  if (!data.telefono_studio || data.telefono_studio.trim() === "") {
    missingFields.push("telefono_studio");
  }
  if (!data.direccion_studio || data.direccion_studio.trim() === "") {
    missingFields.push("direccion_studio");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
```

#### 1.3 Actualizar renderer de contratos
**Archivo:** `src/lib/actions/studio/business/contracts/renderer.actions.ts`

Agregar mapeo de nuevas variables:
```typescript
// En la función de renderizado, agregar:
"@nombre_representante": eventData.nombre_representante || "",
"@telefono_studio": eventData.telefono_studio || "",
"@correo_studio": eventData.correo_studio || "",
"@direccion_studio": eventData.direccion_studio || "",
```

---

### Fase 2: Modal de Datos del Estudio

#### 2.1 Crear componente `StudioContractDataModal`
**Archivo:** `src/components/shared/contracts/StudioContractDataModal.tsx`

```typescript
interface StudioContractDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  initialData: StudioContractData;
  onSave: () => void;
}

export function StudioContractDataModal({
  isOpen,
  onClose,
  studioSlug,
  initialData,
  onSave,
}: StudioContractDataModalProps) {
  // Formulario con validación
  // Todos los campos obligatorios
  // Guardar usando updateStudioContractData
}
```

#### 2.2 Server action para actualizar datos
**Archivo:** `src/lib/actions/studio/business/contracts/templates.actions.ts`

```typescript
export async function updateStudioContractData(
  studioSlug: string,
  data: {
    representative_name: string;
    phone: string;
    address: string;
  }
): Promise<ActionResponse<void>> {
  // Actualizar campos en studios
  // Validar que todos los campos estén presentes
}
```

---

### Fase 3: Flujo de Plantilla Default y Validación

#### 3.1 Función para crear plantilla default
**Archivo:** `src/lib/actions/studio/business/contracts/templates.actions.ts`

```typescript
export async function createDefaultTemplateForStudio(
  studioSlug: string
): Promise<ActionResponse<ContractTemplate>> {
  // 1. Verificar si ya existe plantilla default
  // 2. Si no existe, crear con DEFAULT_CONTRACT_TEMPLATE
  // 3. Retornar plantilla creada o existente
}
```

#### 3.2 Modificar `ContractTemplateManagerModal`
**Archivo:** `src/components/shared/contracts/ContractTemplateManagerModal.tsx`

**Flujo al abrir:**
1. Verificar datos del estudio (`getStudioContractData`)
2. Validar datos (`validateStudioContractData`)
3. Si faltan datos → mostrar `StudioContractDataModal` (bloquear acceso)
4. Si datos completos → continuar
5. Verificar si existe plantilla default
6. Si no existe → crear automáticamente
7. Si se creó → mostrar mensaje informativo

#### 3.3 Mensaje informativo de plantilla creada
- Banner/alert en `ContractTemplateManagerModal`
- Mostrar solo cuando se crea automáticamente
- Botón "Ver plantilla" que seleccione la default
- Opción para ocultar el mensaje

---

### Fase 4: Validación de Datos del Cliente en Autorizar Cotización

#### 4.1 Función de validación
**Archivo:** `src/app/[slug]/studio/commercial/promises/[promiseId]/components/AuthorizeCotizacionModal.tsx`

```typescript
interface ClientContractDataValidation {
  isValid: boolean;
  missingFields: Array<{
    field: string;
    label: string;
    section: 'contacto' | 'evento';
  }>;
}

function validateClientContractData(promiseData: any): ClientContractDataValidation {
  const missingFields: Array<{field: string; label: string; section: 'contacto' | 'evento'}> = [];

  // Validar datos del contacto
  if (!promiseData.name?.trim()) {
    missingFields.push({ field: 'name', label: 'Nombre', section: 'contacto' });
  }
  if (!promiseData.phone?.trim()) {
    missingFields.push({ field: 'phone', label: 'Teléfono', section: 'contacto' });
  }
  if (!promiseData.email?.trim()) {
    missingFields.push({ field: 'email', label: 'Correo electrónico', section: 'contacto' });
  }
  if (!promiseData.address?.trim()) {
    missingFields.push({ field: 'address', label: 'Dirección', section: 'contacto' });
  }

  // Validar datos del evento
  if (!promiseData.event_name?.trim()) {
    missingFields.push({ field: 'event_name', label: 'Nombre del evento', section: 'evento' });
  }
  if (!promiseData.event_type_id) {
    missingFields.push({ field: 'event_type_id', label: 'Tipo de evento', section: 'evento' });
  }
  if (!promiseData.event_date) {
    missingFields.push({ field: 'event_date', label: 'Fecha del evento', section: 'evento' });
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
```

#### 4.2 Agregar alertas en resumen del evento
- Mostrar alerta si faltan datos
- Listar campos faltantes agrupados por sección
- Botón "Completar datos" que abra `ContactEventFormModal`
- Badge/indicador visual de datos incompletos

#### 4.3 Validar antes de autorizar
- En `handleAutorizar()`:
  - Validar datos del cliente antes de proceder
  - Si faltan datos críticos → mostrar error y bloquear autorización

---

### Fase 5: Mejoras en Editor de Contratos

#### 5.1 Mostrar variables del estudio
**Archivo:** `src/components/shared/contracts/ContractEditorModal.tsx`

- Mostrar variables del estudio en la sección de variables
- Agrupar por categorías: Cliente, Evento, Studio, Comercial, Bloques
- Tabs o secciones colapsables

#### 5.2 Mejorar visualización
- Mostrar valores de ejemplo/preview cuando sea posible
- Indicar qué variables están disponibles según el contexto

---

### Fase 6: Integración con Flujos Existentes

#### 6.1 Asegurar plantilla default en generación automática
**Archivo:** `src/lib/actions/cliente/contract.actions.ts`

- En `confirmClientDataAndGenerateContract`:
  - Si no existe plantilla default → crear automáticamente antes de generar contrato
  - O mostrar error claro si faltan datos del estudio

#### 6.2 Validar datos del estudio en generación de contratos
**Archivo:** `src/lib/actions/studio/business/contracts/contracts.actions.ts`

- En `generateEventContract`:
  - Validar que existan datos del estudio antes de renderizar
  - Si faltan → retornar error claro

---

## Flujos de Usuario Finales

### Flujo 1: Studio abre selector de plantillas (primera vez)
1. Click en "Plantillas de contrato"
2. Sistema verifica datos del estudio
3. Si faltan datos → Modal de datos del estudio (bloquea acceso)
4. Usuario completa datos → Guarda
5. Sistema crea plantilla default automáticamente
6. Muestra mensaje: "✅ Hemos creado para ti una plantilla por defecto..."
7. Abre selector de plantillas con la default seleccionada

### Flujo 2: Cliente confirma datos (portal)
1. Cliente ve evento con status `contract_pending`
2. Ve `ConfirmClientDataCard` con formulario
3. Completa/confirma datos (nombre, teléfono, correo, dirección)
4. Guarda → Sistema genera contrato automáticamente
5. Status cambia a `contract_generated`
6. Cliente puede ver y firmar contrato

### Flujo 3: Studio autoriza cotización
1. Studio abre modal "Autorizar Cotización"
2. Ve resumen del evento
3. Si faltan datos del cliente → Alerta con lista de campos faltantes
4. Click "Completar datos" → Abre `ContactEventFormModal`
5. Completa datos → Guarda
6. Alerta desaparece
7. Puede autorizar normalmente

---

## Checklist de Implementación

### Fase 1: Base de Datos y Variables
- [ ] Crear migración `20250131000000_add_studio_contract_data_fields.sql`
- [ ] Ejecutar migración
- [ ] Actualizar Prisma schema
- [ ] Agregar nuevas variables a `CONTRACT_VARIABLES`
- [ ] Crear `getStudioContractData()`
- [ ] Crear `validateStudioContractData()`
- [ ] Actualizar renderer de contratos con nuevas variables

### Fase 2: Modal de Datos del Estudio
- [ ] Crear componente `StudioContractDataModal`
- [ ] Crear `updateStudioContractData()` server action
- [ ] Integrar validación y guardado

### Fase 3: Flujo de Plantilla Default
- [ ] Crear `createDefaultTemplateForStudio()`
- [ ] Modificar `ContractTemplateManagerModal` con flujo completo
- [ ] Agregar mensaje informativo de plantilla creada
- [ ] Probar flujo completo

### Fase 4: Validación en Autorizar Cotización
- [ ] Crear `validateClientContractData()`
- [ ] Agregar alertas en resumen del evento
- [ ] Validar antes de autorizar
- [ ] Integrar con `ContactEventFormModal`

### Fase 5: Mejoras en Editor
- [ ] Mostrar variables del estudio en editor
- [ ] Mejorar organización de variables
- [ ] Agregar preview de valores

### Fase 6: Integración
- [ ] Asegurar plantilla default en generación automática
- [ ] Validar datos del estudio en generación de contratos
- [ ] Probar todos los flujos end-to-end

---

## Notas Técnicas

### Consideraciones
1. **Compatibilidad**: Mantener `studio_phones` por compatibilidad pero usar `phone` directo
2. **Migración de datos**: Migrar teléfonos existentes al campo directo
3. **Validación**: Todos los campos son obligatorios legalmente
4. **UX**: No bloquear flujo innecesariamente, mostrar modales solo cuando sea necesario

### Extensiones Futuras
- Historial de cambios en datos del estudio
- Validación de formato de teléfono
- Validación de formato de dirección
- Plantillas personalizadas por tipo de evento

## Referencias
- Schema actual: `prisma/schema.prisma`
- Constante plantilla: `src/lib/constants/contract-template.ts`
- Variables: `src/types/contracts.ts`
- Renderer: `src/lib/actions/studio/business/contracts/renderer.actions.ts`

