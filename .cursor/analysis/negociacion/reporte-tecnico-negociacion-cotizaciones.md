# 📊 Reporte Técnico: Herramienta de Negociación de Cotizaciones

**Fecha:** 2025-01-16  
**Autor:** Análisis Técnico - Sistema ZEN  
**Versión:** 1.0

---

## 📋 Resumen Ejecutivo

Este reporte analiza la implementación de una herramienta de negociación para cotizaciones dentro del módulo de Promesas. La funcionalidad permitirá al dueño del estudio simular precios personalizados, aplicar condiciones comerciales especiales, marcar items como cortesía y generar versiones negociadas de cotizaciones.

**Estado Actual:**
- ✅ Sistema de cotizaciones funcional con items y cálculo de precios
- ✅ Sistema de revisiones implementado (`revision_of_id`, `revision_status`)
- ✅ Cálculo de precios centralizado (`calcularPrecio()`)
- ✅ Condiciones comerciales existentes (`studio_condiciones_comerciales`)
- ❌ No existe funcionalidad de negociación/staging
- ❌ No existe campo `is_courtesy` en items
- ❌ No existe soporte para condiciones comerciales temporales

---

## 🗄️ 1. IMPACTO EN BASE DE DATOS

### 1.1 Cambios Propuestos en `studio_cotizaciones`

**Campos Nuevos:**

```sql
-- Precio negociado manualmente (override del precio calculado)
negociacion_precio_personalizado DECIMAL(10, 2) NULL;

-- Descuento adicional aplicado durante negociación (además del descuento de condiciones comerciales)
negociacion_descuento_adicional DECIMAL(10, 2) NULL;

-- Notas sobre la negociación (opcional, para contexto)
negociacion_notas TEXT NULL;

-- Flag para identificar cotizaciones creadas desde negociación
negociacion_created_at TIMESTAMP NULL;
```

**Justificación:**
- `negociacion_precio_personalizado`: Permite establecer un precio final diferente al calculado por el sistema
- `negociacion_descuento_adicional`: Descuento adicional al ya aplicado por condiciones comerciales (para casos donde se negocia más descuento)
- `negociacion_notas`: Contexto de la negociación para referencia futura
- `negociacion_created_at`: Timestamp para auditoría

**Migración SQL Propuesta:**

```sql
-- Migration: add_negociacion_fields_to_cotizaciones
ALTER TABLE studio_cotizaciones
  ADD COLUMN negociacion_precio_personalizado DECIMAL(10, 2) NULL,
  ADD COLUMN negociacion_descuento_adicional DECIMAL(10, 2) NULL,
  ADD COLUMN negociacion_notas TEXT NULL,
  ADD COLUMN negociacion_created_at TIMESTAMP NULL;

-- Índice para búsquedas de cotizaciones negociadas
CREATE INDEX idx_cotizaciones_negociacion_created_at 
  ON studio_cotizaciones(negociacion_created_at) 
  WHERE negociacion_created_at IS NOT NULL;
```

### 1.2 Cambios Propuestos en `studio_cotizacion_items`

**Campo Nuevo:**

```sql
-- Flag para marcar items como cortesía (precio = 0, pero mantiene costo/gasto)
is_courtesy BOOLEAN NOT NULL DEFAULT FALSE;
```

**Justificación:**
- Permite marcar items que se incluyen sin cargo
- El precio del item se establece en 0, pero los costos y gastos se mantienen para contabilidad
- Necesario para calcular utilidad real considerando cortesías

**Migración SQL Propuesta:**

```sql
-- Migration: add_is_courtesy_to_cotizacion_items
ALTER TABLE studio_cotizacion_items
  ADD COLUMN is_courtesy BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para búsquedas de items con cortesía
CREATE INDEX idx_cotizacion_items_is_courtesy 
  ON studio_cotizacion_items(cotizacion_id, is_courtesy) 
  WHERE is_courtesy = TRUE;
```

### 1.3 Nueva Tabla: `studio_condiciones_comerciales_negociacion`

**Propósito:** Almacenar condiciones comerciales temporales creadas específicamente para una negociación (no se guardan como condiciones generales del estudio).

**Estructura Propuesta:**

```sql
CREATE TABLE studio_condiciones_comerciales_negociacion (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  cotizacion_id TEXT NOT NULL REFERENCES studio_cotizaciones(id) ON DELETE CASCADE,
  promise_id TEXT NOT NULL REFERENCES studio_promises(id) ON DELETE CASCADE,
  studio_id TEXT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  
  -- Campos de condición comercial
  name TEXT NOT NULL,
  description TEXT NULL,
  discount_percentage DECIMAL(5, 2) NULL,
  advance_percentage DECIMAL(5, 2) NULL,
  advance_type TEXT NULL DEFAULT 'percentage',
  advance_amount DECIMAL(10, 2) NULL,
  metodo_pago_id TEXT NULL REFERENCES studio_metodos_pago(id) ON DELETE SET NULL,
  
  -- Metadata
  is_temporary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_cotizacion_negociacion UNIQUE (cotizacion_id),
  CONSTRAINT check_advance_type CHECK (advance_type IN ('percentage', 'amount', NULL))
);

-- Índices
CREATE INDEX idx_cc_negociacion_cotizacion_id ON studio_condiciones_comerciales_negociacion(cotizacion_id);
CREATE INDEX idx_cc_negociacion_promise_id ON studio_condiciones_comerciales_negociacion(promise_id);
CREATE INDEX idx_cc_negociacion_studio_id ON studio_condiciones_comerciales_negociacion(studio_id);
```

**Justificación:**
- Permite crear condiciones comerciales específicas para una negociación sin afectar las condiciones generales
- Se eliminan automáticamente si se elimina la cotización (CASCADE)
- Relación única con cotización (una negociación = una condición temporal)

### 1.4 Actualización de Prisma Schema

**Archivo:** `prisma/schema.prisma`

**Cambios en `studio_cotizaciones`:**

```prisma
model studio_cotizaciones {
  // ... campos existentes ...
  
  // Campos de negociación
  negociacion_precio_personalizado Decimal? @db.Decimal(10, 2)
  negociacion_descuento_adicional   Decimal? @db.Decimal(10, 2)
  negociacion_notas                 String?  @db.Text
  negociacion_created_at            DateTime?
  
  // Relación con condición comercial temporal
  condicion_comercial_negociacion   studio_condiciones_comerciales_negociacion?
  
  // ... resto de relaciones ...
}
```

**Cambios en `studio_cotizacion_items`:**

```prisma
model studio_cotizacion_items {
  // ... campos existentes ...
  
  is_courtesy Boolean @default(false)
  
  // ... resto de campos ...
}
```

**Nuevo Modelo:**

```prisma
model studio_condiciones_comerciales_negociacion {
  id                  String   @id @default(cuid())
  cotizacion_id      String   @unique
  promise_id         String
  studio_id          String
  name               String
  description        String?
  discount_percentage Float?
  advance_percentage Float?
  advance_type       String?  @default("percentage")
  advance_amount     Decimal? @db.Decimal(10, 2)
  metodo_pago_id     String?
  is_temporary        Boolean  @default(true)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
  
  cotizacion  studio_cotizaciones @relation(fields: [cotizacion_id], references: [id], onDelete: Cascade)
  promise    studio_promises     @relation(fields: [promise_id], references: [id], onDelete: Cascade)
  studio     studios             @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  metodo_pago studio_metodos_pago? @relation(fields: [metodo_pago_id], references: [id], onDelete: SetNull)
  
  @@index([cotizacion_id])
  @@index([promise_id])
  @@index([studio_id])
}
```

---

## 🗺️ 2. FLUJO DE NAVEGACIÓN

### 2.1 Arquitectura de Rutas

**Ruta Principal de Negociación:**

```
/[slug]/studio/commercial/promises/[promiseId]/cotizacion/[cotizacionId]/negociacion
```

**Estructura de Archivos:**

```
src/app/[slug]/studio/commercial/promises/[promiseId]/
├── cotizacion/
│   ├── [cotizacionId]/
│   │   ├── page.tsx                    # Vista de cotización (existente)
│   │   ├── revision/
│   │   │   └── page.tsx                 # Vista de revisión (existente)
│   │   └── negociacion/                 # NUEVO
│   │       ├── page.tsx                 # Página principal de negociación
│   │       └── components/
│   │           ├── NegociacionHeader.tsx
│   │           ├── ComparacionView.tsx
│   │           ├── PrecioSimulador.tsx
│   │           ├── CondicionesSimulador.tsx
│   │           ├── ItemsCortesiaSelector.tsx
│   │           ├── ImpactoUtilidad.tsx
│   │           └── FinalizarNegociacion.tsx
```

### 2.2 Flujo de Estado (Staging)

**Estrategia:** Estado local en React (no persistido hasta finalizar)

**Estado de Negociación:**

```typescript
interface NegociacionState {
  // Datos originales (read-only)
  cotizacionOriginal: CotizacionCompleta;
  
  // Cambios en staging
  precioPersonalizado: number | null;
  descuentoAdicional: number | null;
  condicionComercialId: string | null;
  condicionComercialTemporal: CondicionComercialTemporal | null;
  itemsCortesia: Set<string>; // IDs de items marcados como cortesía
  
  // Cálculos derivados (computed)
  precioFinal: number;
  utilidadOriginal: number;
  utilidadNegociada: number;
  impactoUtilidad: number;
  margenOriginal: number;
  margenNegociado: number;
  
  // Metadata
  notas: string;
  version: 'original' | 'opcion1' | 'opcion2'; // Para comparar múltiples opciones
}
```

**Flujo de Trabajo:**

```
1. Usuario hace click en "Negociar" en PromiseQuotesPanelCard
   ↓
2. Navega a /negociacion
   ↓
3. Carga cotización original con todos sus items
   ↓
4. Estado inicial: NegociacionState con datos originales
   ↓
5. Usuario modifica:
   - Precio personalizado
   - Condiciones comerciales
   - Items como cortesía
   ↓
6. Sistema recalcula en tiempo real:
   - Precio final
   - Utilidad impactada
   - Margen de ganancia
   ↓
7. Usuario puede:
   - Ver comparación antes/después
   - Crear múltiples opciones (Opción 1, Opción 2)
   - Comparar opciones en tabla
   ↓
8. Usuario finaliza:
   - Opción A: Crear nueva versión (revisión)
   - Opción B: Aplicar cambios a cotización actual
   ↓
9. Sistema persiste:
   - Nueva cotización con cambios aplicados
   - Campos de negociación guardados
   - Items marcados como cortesía
   - Condición comercial temporal (si aplica)
```

### 2.3 Gestión de Múltiples Opciones

**Estrategia:** Mantener hasta 3 versiones en staging (Original, Opción 1, Opción 2)

```typescript
interface OpcionesNegociacion {
  original: NegociacionState;
  opcion1: NegociacionState | null;
  opcion2: NegociacionState | null;
}

// El usuario puede:
// 1. Crear "Opción 1" desde original modificada
// 2. Crear "Opción 2" desde original u Opción 1 modificada
// 3. Comparar las 3 versiones en tabla
// 4. Seleccionar una opción para generar como revisión
```

**Componente de Comparación:**

```typescript
<ComparacionView 
  original={opciones.original}
  opcion1={opciones.opcion1}
  opcion2={opciones.opcion2}
  onSelectOpcion={(version) => generarRevision(version)}
/>
```

---

## 🧩 3. COMPONENTES A CREAR/MODIFICAR

### 3.1 Modificaciones en Componentes Existentes

#### `PromiseQuotesPanelCard.tsx`

**Cambios:**

```typescript
// Agregar botón "Negociar" en el dropdown menu
<ZenDropdownMenuItem
  onClick={(e) => {
    e.stopPropagation();
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacion.id}/negociacion`);
  }}
  disabled={loading || isDuplicating || cotizacion.status !== 'pendiente'}
>
  <Handshake className="h-4 w-4 mr-2" />
  Negociar
</ZenDropdownMenuItem>
```

**Condiciones para mostrar botón:**
- Solo si `status === 'pendiente'`
- No mostrar si está archivada o cancelada
- No mostrar si ya tiene revisión activa

### 3.2 Componentes Nuevos a Crear

#### 3.2.1 `negociacion/page.tsx` (Página Principal)

**Responsabilidades:**
- Cargar datos de cotización original
- Gestionar estado de negociación
- Orquestar componentes hijos
- Manejar finalización de negociación

**Estructura:**

```typescript
export default function NegociacionPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  
  // Estado
  const [cotizacionOriginal, setCotizacionOriginal] = useState<CotizacionCompleta | null>(null);
  const [negociacionState, setNegociacionState] = useState<NegociacionState | null>(null);
  const [opciones, setOpciones] = useState<OpcionesNegociacion | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Cargar cotización original
  useEffect(() => {
    // Server Action para cargar cotización completa
    loadCotizacionCompleta(cotizacionId, studioSlug).then(...);
  }, [cotizacionId]);
  
  // Render
  return (
    <div className="max-w-7xl mx-auto">
      <NegociacionHeader 
        cotizacion={cotizacionOriginal}
        onBack={() => router.back()}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ComparacionView 
          original={opciones?.original}
          opcion1={opciones?.opcion1}
          opcion2={opciones?.opcion2}
        />
        
        <div className="space-y-6">
          <PrecioSimulador 
            cotizacion={cotizacionOriginal}
            precioPersonalizado={negociacionState?.precioPersonalizado}
            onPrecioChange={(precio) => updateNegociacionState({ precioPersonalizado: precio })}
          />
          
          <CondicionesSimulador 
            studioSlug={studioSlug}
            condicionSeleccionada={negociacionState?.condicionComercialId}
            condicionTemporal={negociacionState?.condicionComercialTemporal}
            onCondicionChange={(condicion) => updateNegociacionState({ ... })}
          />
          
          <ItemsCortesiaSelector 
            items={cotizacionOriginal?.items}
            itemsCortesia={negociacionState?.itemsCortesia}
            onItemsChange={(items) => updateNegociacionState({ itemsCortesia: items })}
          />
        </div>
      </div>
      
      <ImpactoUtilidad 
        original={opciones?.original}
        negociada={negociacionState}
      />
      
      <FinalizarNegociacion 
        negociacionState={negociacionState}
        onFinalizar={handleFinalizarNegociacion}
      />
    </div>
  );
}
```

#### 3.2.2 `NegociacionHeader.tsx`

**Responsabilidades:**
- Mostrar información de la cotización
- Botón de volver
- Breadcrumbs

**Props:**

```typescript
interface NegociacionHeaderProps {
  cotizacion: CotizacionCompleta | null;
  onBack: () => void;
}
```

#### 3.2.3 `ComparacionView.tsx`

**Responsabilidades:**
- Mostrar comparación lado a lado de versiones
- Tabla comparativa de métricas
- Selector de versiones a comparar

**Props:**

```typescript
interface ComparacionViewProps {
  original: NegociacionState | null;
  opcion1: NegociacionState | null;
  opcion2: NegociacionState | null;
  onSelectOpcion?: (version: 'original' | 'opcion1' | 'opcion2') => void;
}
```

**UI:**

```typescript
<ZenCard>
  <ZenCardHeader>
    <ZenCardTitle>Comparación de Versiones</ZenCardTitle>
  </ZenCardHeader>
  <ZenCardContent>
    <div className="grid grid-cols-3 gap-4">
      <VersionCard version="original" data={original} />
      <VersionCard version="opcion1" data={opcion1} />
      <VersionCard version="opcion2" data={opcion2} />
    </div>
    
    <ComparacionTabla 
      original={original}
      opcion1={opcion1}
      opcion2={opcion2}
    />
  </ZenCardContent>
</ZenCard>
```

#### 3.2.4 `PrecioSimulador.tsx`

**Responsabilidades:**
- Input para precio personalizado
- Validación de precio mínimo
- Cálculo en tiempo real de impacto

**Props:**

```typescript
interface PrecioSimuladorProps {
  cotizacion: CotizacionCompleta;
  precioPersonalizado: number | null;
  onPrecioChange: (precio: number | null) => void;
}
```

**Validaciones:**
- Precio >= costo total + gasto total
- Mostrar advertencia si margen < 10%
- Indicadores visuales de margen (verde/amarillo/rojo)

#### 3.2.5 `CondicionesSimulador.tsx`

**Responsabilidades:**
- Selector de condiciones comerciales existentes
- Formulario para crear condición temporal
- Preview de impacto de descuento

**Props:**

```typescript
interface CondicionesSimuladorProps {
  studioSlug: string;
  condicionSeleccionada: string | null;
  condicionTemporal: CondicionComercialTemporal | null;
  onCondicionChange: (condicion: CondicionComercial | CondicionComercialTemporal | null) => void;
}
```

#### 3.2.6 `ItemsCortesiaSelector.tsx`

**Responsabilidades:**
- Lista de items con checkboxes
- Indicador visual de items marcados como cortesía
- Cálculo de impacto total

**Props:**

```typescript
interface ItemsCortesiaSelectorProps {
  items: CotizacionItem[];
  itemsCortesia: Set<string>;
  onItemsChange: (items: Set<string>) => void;
}
```

**UI:**

```typescript
<ZenCard>
  <ZenCardHeader>
    <ZenCardTitle>Items de Cortesía</ZenCardTitle>
    <ZenCardDescription>
      Selecciona items que se incluyen sin cargo
    </ZenCardDescription>
  </ZenCardHeader>
  <ZenCardContent>
    <div className="space-y-2">
      {items.map(item => (
        <ItemCortesiaRow
          key={item.id}
          item={item}
          isSelected={itemsCortesia.has(item.id)}
          onToggle={() => toggleCortesia(item.id)}
        />
      ))}
    </div>
    
    <div className="mt-4 pt-4 border-t border-zinc-800">
      <div className="flex justify-between text-sm">
        <span>Total cortesías:</span>
        <span className="font-semibold">
          {formatearMoneda(totalCortesias)}
        </span>
      </div>
      <div className="flex justify-between text-sm text-zinc-400">
        <span>Impacto en utilidad:</span>
        <span className={impactoUtilidad < 0 ? 'text-red-400' : ''}>
          {formatearMoneda(impactoUtilidad)}
        </span>
      </div>
    </div>
  </ZenCardContent>
</ZenCard>
```

#### 3.2.7 `ImpactoUtilidad.tsx`

**Responsabilidades:**
- Mostrar métricas de utilidad original vs negociada
- Indicadores visuales de impacto
- Alertas de margen crítico

**Props:**

```typescript
interface ImpactoUtilidadProps {
  original: NegociacionState | null;
  negociada: NegociacionState | null;
}
```

**Métricas a mostrar:**
- Precio original vs negociado
- Utilidad original vs negociada
- Diferencia en utilidad
- Margen original vs negociado
- Porcentaje de impacto

#### 3.2.8 `FinalizarNegociacion.tsx`

**Responsabilidades:**
- Opciones para finalizar (crear versión vs aplicar cambios)
- Formulario de nombre para nueva versión
- Resumen de cambios
- Botones de acción

**Props:**

```typescript
interface FinalizarNegociacionProps {
  negociacionState: NegociacionState | null;
  onFinalizar: (opcion: 'crear_version' | 'aplicar_cambios', nombre?: string) => Promise<void>;
}
```

### 3.3 Server Actions Nuevos

#### 3.3.1 `negociacion.actions.ts`

**Funciones:**

```typescript
// Cargar cotización completa para negociación
export async function loadCotizacionParaNegociacion(
  cotizacionId: string,
  studioSlug: string
): Promise<CotizacionCompleta>

// Crear versión negociada (revisión)
export async function crearVersionNegociada(
  data: {
    cotizacionOriginalId: string;
    studioSlug: string;
    nombre: string;
    descripcion?: string;
    precioPersonalizado?: number;
    descuentoAdicional?: number;
    condicionComercialId?: string;
    condicionComercialTemporal?: CondicionComercialTemporal;
    itemsCortesia: string[];
    notas?: string;
  }
): Promise<CotizacionResponse>

// Aplicar cambios a cotización existente
export async function aplicarCambiosNegociacion(
  data: {
    cotizacionId: string;
    studioSlug: string;
    precioPersonalizado?: number;
    descuentoAdicional?: number;
    condicionComercialId?: string;
    condicionComercialTemporal?: CondicionComercialTemporal;
    itemsCortesia: string[];
    notas?: string;
  }
): Promise<CotizacionResponse>
```

---

## 🧮 4. ESTRATEGIA DE CÁLCULOS

### 4.1 Función de Cálculo de Precio Negociado

**Ubicación:** `src/lib/utils/negociacion-calc.ts`

**Función Principal:**

```typescript
interface CalculoNegociacionParams {
  cotizacionOriginal: CotizacionCompleta;
  precioPersonalizado?: number | null;
  descuentoAdicional?: number | null;
  condicionComercial?: CondicionComercial | CondicionComercialTemporal | null;
  itemsCortesia: Set<string>;
  configPrecios: ConfiguracionPrecios;
}

interface CalculoNegociacionResult {
  precioFinal: number;
  precioBase: number;
  descuentoTotal: number;
  costoTotal: number;
  gastoTotal: number;
  utilidadNeta: number;
  margenPorcentaje: number;
  impactoUtilidad: number;
  items: Array<{
    id: string;
    precioOriginal: number;
    precioNegociado: number;
    isCortesia: boolean;
  }>;
}

export function calcularPrecioNegociado(
  params: CalculoNegociacionParams
): CalculoNegociacionResult {
  const {
    cotizacionOriginal,
    precioPersonalizado,
    descuentoAdicional,
    condicionComercial,
    itemsCortesia,
    configPrecios,
  } = params;
  
  // 1. Calcular precio base de items (sin cortesías)
  let precioBaseItems = 0;
  let costoTotal = 0;
  let gastoTotal = 0;
  
  cotizacionOriginal.items.forEach(item => {
    const cantidad = item.quantity;
    const isCortesia = itemsCortesia.has(item.id);
    
    // Costos y gastos siempre se suman (incluso si es cortesía)
    costoTotal += (item.cost || 0) * cantidad;
    gastoTotal += (item.expense || 0) * cantidad;
    
    // Precio solo se suma si NO es cortesía
    if (!isCortesia) {
      precioBaseItems += (item.unit_price || 0) * cantidad;
    }
  });
  
  // 2. Aplicar precio personalizado si existe
  let precioBase = precioPersonalizado ?? precioBaseItems;
  
  // 3. Aplicar descuento de condición comercial
  let descuentoCondicion = 0;
  if (condicionComercial?.discount_percentage) {
    descuentoCondicion = precioBase * (condicionComercial.discount_percentage / 100);
  }
  
  // 4. Aplicar descuento adicional
  const descuentoAdicionalMonto = descuentoAdicional ?? 0;
  
  // 5. Calcular precio final
  const descuentoTotal = descuentoCondicion + descuentoAdicionalMonto;
  const precioFinal = Math.max(0, precioBase - descuentoTotal);
  
  // 6. Validar precio mínimo
  const precioMinimo = costoTotal + gastoTotal;
  if (precioFinal < precioMinimo) {
    // Lanzar error o ajustar a mínimo
    throw new Error(
      `El precio negociado (${precioFinal}) no puede ser menor al costo total + gasto total (${precioMinimo})`
    );
  }
  
  // 7. Calcular utilidad
  const utilidadNeta = precioFinal - costoTotal - gastoTotal;
  const margenPorcentaje = precioFinal > 0 
    ? (utilidadNeta / precioFinal) * 100 
    : 0;
  
  // 8. Calcular impacto vs original
  const utilidadOriginal = cotizacionOriginal.price - costoTotal - gastoTotal;
  const impactoUtilidad = utilidadNeta - utilidadOriginal;
  
  return {
    precioFinal,
    precioBase,
    descuentoTotal,
    costoTotal,
    gastoTotal,
    utilidadNeta,
    margenPorcentaje,
    impactoUtilidad,
    items: cotizacionOriginal.items.map(item => ({
      id: item.id,
      precioOriginal: (item.unit_price || 0) * item.quantity,
      precioNegociado: itemsCortesia.has(item.id) 
        ? 0 
        : (item.unit_price || 0) * item.quantity,
      isCortesia: itemsCortesia.has(item.id),
    })),
  };
}
```

### 4.2 Validaciones de Margen

**Función de Validación:**

```typescript
export function validarMargenNegociado(
  margenPorcentaje: number,
  precioFinal: number,
  costoTotal: number,
  gastoTotal: number
): {
  esValido: boolean;
  nivel: 'aceptable' | 'bajo' | 'critico';
  mensaje: string;
} {
  const precioMinimo = costoTotal + gastoTotal;
  
  // Validación 1: Precio no puede ser menor a costo + gasto
  if (precioFinal < precioMinimo) {
    return {
      esValido: false,
      nivel: 'critico',
      mensaje: `El precio no puede ser menor a ${formatearMoneda(precioMinimo)} (costo + gasto)`,
    };
  }
  
  // Validación 2: Margen crítico (< 10%)
  if (margenPorcentaje < 10) {
    return {
      esValido: true, // Permitir pero advertir
      nivel: 'critico',
      mensaje: `Margen crítico: ${margenPorcentaje.toFixed(1)}%. Se recomienda margen mínimo del 10%.`,
    };
  }
  
  // Validación 3: Margen bajo (10-20%)
  if (margenPorcentaje < 20) {
    return {
      esValido: true,
      nivel: 'bajo',
      mensaje: `Margen bajo: ${margenPorcentaje.toFixed(1)}%. Se recomienda margen mínimo del 20%.`,
    };
  }
  
  // Validación 4: Margen aceptable (>= 20%)
  return {
    esValido: true,
    nivel: 'aceptable',
    mensaje: `Margen aceptable: ${margenPorcentaje.toFixed(1)}%`,
  };
}
```

### 4.3 Integración con `calcularPrecio()` Existente

**Estrategia:** Reutilizar función existente para cálculos de items individuales, pero aplicar lógica adicional para negociación.

```typescript
// Para cada item (si no es cortesía), usar calcularPrecio() para validar
cotizacionOriginal.items.forEach(item => {
  if (!itemsCortesia.has(item.id)) {
    const precioCalculado = calcularPrecio(
      item.cost || 0,
      item.expense || 0,
      item.profit_type === 'producto' ? 'producto' : 'servicio',
      configPrecios
    );
    
    // El precio negociado puede ser diferente al calculado
    // pero validamos que no sea menor al mínimo
    const precioMinimoItem = (item.cost || 0) + (item.expense || 0);
    // ... validaciones ...
  }
});
```

### 4.4 Cálculos en Tiempo Real

**Hook Personalizado:**

```typescript
export function useCalculoNegociacion(
  cotizacionOriginal: CotizacionCompleta | null,
  negociacionState: NegociacionState | null,
  configPrecios: ConfiguracionPrecios | null
) {
  return useMemo(() => {
    if (!cotizacionOriginal || !negociacionState || !configPrecios) {
      return null;
    }
    
    return calcularPrecioNegociado({
      cotizacionOriginal,
      precioPersonalizado: negociacionState.precioPersonalizado,
      descuentoAdicional: negociacionState.descuentoAdicional,
      condicionComercial: negociacionState.condicionComercialId 
        ? condicionComercialSeleccionada 
        : negociacionState.condicionComercialTemporal,
      itemsCortesia: negociacionState.itemsCortesia,
      configPrecios,
    });
  }, [cotizacionOriginal, negociacionState, configPrecios]);
}
```

**Debounce para Inputs:**

```typescript
const debouncedPrecioPersonalizado = useDebounce(
  negociacionState.precioPersonalizado,
  300
);

useEffect(() => {
  if (debouncedPrecioPersonalizado !== null) {
    // Recalcular
    updateCalculos();
  }
}, [debouncedPrecioPersonalizado]);
```

---

## ✅ 5. RESUMEN DE CAMBIOS

### 5.1 Base de Datos

- ✅ 4 campos nuevos en `studio_cotizaciones`
- ✅ 1 campo nuevo en `studio_cotizacion_items`
- ✅ 1 tabla nueva `studio_condiciones_comerciales_negociacion`
- ✅ 3 índices nuevos para optimización

### 5.2 Frontend

- ✅ 1 página nueva (`negociacion/page.tsx`)
- ✅ 8 componentes nuevos
- ✅ 1 modificación en `PromiseQuotesPanelCard.tsx`
- ✅ 1 hook personalizado (`useCalculoNegociacion`)
- ✅ 1 utilidad nueva (`negociacion-calc.ts`)

### 5.3 Backend

- ✅ 1 archivo de Server Actions nuevo (`negociacion.actions.ts`)
- ✅ 3 funciones principales:
  - `loadCotizacionParaNegociacion`
  - `crearVersionNegociada`
  - `aplicarCambiosNegociacion`

### 5.4 Validaciones

- ✅ Precio mínimo: costo + gasto
- ✅ Margen crítico: < 10% (advertencia)
- ✅ Margen bajo: 10-20% (advertencia)
- ✅ Margen aceptable: >= 20%

---

## 🚨 6. CONSIDERACIONES Y RIESGOS

### 6.1 Riesgos Identificados

1. **Performance:** Cálculos en tiempo real pueden ser costosos con muchas cotizaciones
   - **Mitigación:** Usar `useMemo` y debounce en inputs

2. **Consistencia de Datos:** Cambios en catálogo pueden afectar cálculos
   - **Mitigación:** Usar snapshots al crear versión negociada

3. **Validaciones:** Precio puede quedar por debajo de costos
   - **Mitigación:** Validación estricta antes de guardar

4. **UX:** Múltiples opciones pueden confundir al usuario
   - **Mitigación:** UI clara con comparación visual

### 6.2 Dependencias

- ✅ Sistema de cálculo de precios existente (`calcularPrecio()`)
- ✅ Sistema de revisiones existente
- ✅ Componentes ZEN Design System
- ✅ Server Actions pattern establecido

### 6.3 Testing

**Casos de Prueba Críticos:**

1. Precio personalizado válido
2. Precio personalizado menor a costo + gasto (debe fallar)
3. Items marcados como cortesía
4. Condición comercial temporal creada
5. Múltiples opciones comparadas
6. Generación de versión negociada
7. Aplicación de cambios a cotización existente

---

## 📝 7. PRÓXIMOS PASOS RECOMENDADOS

1. **Fase 1: Migraciones DB**
   - Crear migraciones SQL
   - Actualizar Prisma schema
   - Ejecutar migraciones en desarrollo

2. **Fase 2: Utilidades y Cálculos**
   - Implementar `negociacion-calc.ts`
   - Crear hook `useCalculoNegociacion`
   - Tests unitarios de cálculos

3. **Fase 3: Server Actions**
   - Implementar `negociacion.actions.ts`
   - Tests de integración

4. **Fase 4: Componentes UI**
   - Crear componentes base
   - Integrar con ZEN Design System
   - Implementar cálculos en tiempo real

5. **Fase 5: Integración**
   - Agregar botón "Negociar" en `PromiseQuotesPanelCard`
   - Conectar con página de negociación
   - Testing end-to-end

6. **Fase 6: Refinamiento**
   - Mejorar UX basado en feedback
   - Optimizaciones de performance
   - Documentación de usuario

---

**Fin del Reporte Técnico**
