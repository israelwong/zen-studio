# 📊 Análisis: Flujo de Precios de Paquetes con Charm Rounding

## 🎯 Problema Identificado

**Síntoma**: Inconsistencias en precios mostrados en `PaquetesSection` - se aplica charm rounding incluso cuando las horas coinciden y debería usar precio personalizado.

**Causa raíz**: 
- El cálculo se hace en el backend (correcto)
- El flag `use_charm_rounding` se establece correctamente
- Pero hay múltiples puntos donde se formatean precios sin verificar el flag
- El flujo está fragmentado: datos vienen de diferentes sources y se pasan como props

---

## 📁 Archivos Involucrados

### 🔴 **CORE - Server Actions (Backend)**

#### 1. **`src/lib/actions/public/promesas.actions.ts`**
   - **Funciones principales**:
     - `getPublicPromiseAvailablePackages()` - Línea ~1924
     - `getPublicPromisePendientes()` - Línea ~776  
     - `getPublicPromiseData()` - Línea ~3237
   - **Responsabilidad**: 
     - Obtener `duration_hours` de la promesa
     - Calcular precios de paquetes
     - Comparar `base_hours` vs `duration_hours`
     - Establecer `use_charm_rounding` flag
   - **Estado**: ✅ Ya corregido - establece `use_charm_rounding` correctamente

#### 2. **`src/lib/utils/paquetes-calc.ts`**
   - **Funciones**:
     - `calcularPrecioPaquete()` - Línea ~42
     - `calcularCantidadEfectiva()` - Línea ~24 (en dynamic-billing-calc.ts)
   - **Responsabilidad**: Cálculo de precios base de paquetes

#### 3. **`src/lib/utils/dynamic-billing-calc.ts`**
   - **Funciones**:
     - `calcularCantidadEfectiva()` - Línea ~24
   - **Responsabilidad**: Calcular cantidad según `billing_type` (HOUR vs SERVICE)

#### 4. **`src/lib/utils/price-rounding.ts`**
   - **Funciones**:
     - `roundPrice()` - Línea ~155
     - `formatRoundedPrice()` - Línea ~179
     - `roundToCharmEnding()` - Línea ~16
   - **Responsabilidad**: Aplicar redondeo charm/hundred/thousand

---

### 🟡 **UI Components - Visualización de Precios**

#### 5. **`src/components/promise/PaquetesSection.tsx`**
   - **Línea 133**: `formatRoundedPrice(paquete.price, 'charm')` ❌ **PROBLEMA**
   - **Línea 195**: `formatPrice()` helper que siempre usa charm
   - **Estado**: ⚠️ Parcialmente corregido - verifica `use_charm_rounding` pero puede tener inconsistencias

#### 6. **`src/components/promise/PaqueteDetailSheet.tsx`**
   - **Línea 141**: `formatPrice()` que verifica `use_charm_rounding`
   - **Línea 153**: Usa `paquete.price` para cálculos con condiciones comerciales
   - **Estado**: ✅ Corregido

#### 7. **`src/components/promise/AutorizarCotizacionModal.tsx`**
   - **Línea 498**: Usa `paquete.price` directamente
   - **Estado**: ⚠️ No verifica `use_charm_rounding` - puede necesitar corrección

#### 8. **`src/components/promise/ComparadorSheet.tsx`**
   - **Línea 195**: `formatRoundedPrice(price, 'charm')` ❌ **PROBLEMA**
   - **Estado**: ❌ No verifica `use_charm_rounding`

#### 9. **`src/components/promise/SolicitarPaqueteModal.tsx`**
   - **Línea 498**: Usa `paquete.price` directamente
   - **Estado**: ⚠️ No verifica `use_charm_rounding`

---

### 🟢 **Page Components - Orquestación**

#### 10. **`src/app/[slug]/promise/[promiseId]/pendientes/page.tsx`**
   - **Responsabilidad**: Inicializar ruta, obtener datos básicos
   - **Línea 57**: Dispara `getPublicPromiseAvailablePackages()`
   - **Estado**: ✅ OK

#### 11. **`src/app/[slug]/promise/[promiseId]/pendientes/AvailablePackagesSection.tsx`**
   - **Responsabilidad**: Wrapper que recibe promise y pasa props
   - **Línea 60**: Recibe `durationHours` como prop
   - **Línea 115**: Pasa `durationHours` a `PaquetesSection`
   - **Estado**: ✅ OK - pasa props correctamente

#### 12. **`src/app/[slug]/promise/[promiseId]/pendientes/AvailablePackagesSectionWrapper.tsx`**
   - **Línea 175**: Pasa `durationHours` desde `basicPromise.promise.duration_hours`
   - **Estado**: ✅ OK

#### 13. **`src/app/[slug]/promise/[promiseId]/pendientes/PendientesPageClient.tsx`**
   - **Línea 506**: Pasa `durationHours={promise.duration_hours}` a `PaquetesSection`
   - **Estado**: ✅ OK

#### 14. **`src/components/promise/PromisePageClient.tsx`**
   - **Línea 584**: Pasa `durationHours={promise.duration_hours ?? null}` a `PaquetesSection`
   - **Estado**: ✅ OK

---

### 🔵 **Types & Schemas**

#### 15. **`src/types/public-promise.ts`**
   - **Línea 110**: `interface PublicPaquete`
   - **Estado**: ✅ Actualizado con `use_charm_rounding?: boolean`

#### 16. **`src/lib/actions/schemas/public-profile-schemas.ts`**
   - Puede tener schema de validación para `PublicPaquete`
   - **Estado**: ⚠️ Verificar si necesita actualización

---

### 🟣 **Profile/Public Pages (Otros contextos)**

#### 17. **`src/components/profile/sections/PaquetesSection.tsx`**
   - Muestra paquetes en perfil público
   - **Estado**: ⚠️ Verificar si usa `use_charm_rounding`

#### 18. **`src/components/profile/sections/PaqueteCard.tsx`**
   - Card individual de paquete en perfil
   - **Estado**: ⚠️ Verificar si usa `use_charm_rounding`

#### 19. **`src/lib/actions/public/profile.actions.ts`**
   - Puede tener lógica similar para obtener paquetes
   - **Estado**: ⚠️ Verificar si necesita misma lógica

---

## 🔄 Flujo Actual (Problema)

```
1. page.tsx (pendientes)
   └─> getPublicPromiseBasicData() → obtiene duration_hours
   └─> getPublicPromiseAvailablePackages() → calcula precios + use_charm_rounding
       └─> Retorna: paquetes[] con use_charm_rounding flag

2. AvailablePackagesSection.tsx
   └─> Recibe: availablePackagesPromise
   └─> Recibe: durationHours (prop) ← ⚠️ DUPLICADO/INNECESARIO
   └─> Pasa: paquetes[] + durationHours a PaquetesSection

3. PaquetesSection.tsx
   └─> Recibe: paquetes[] (con use_charm_rounding)
   └─> Recibe: durationHours (prop) ← ⚠️ NO SE USA
   └─> Línea 133: formatRoundedPrice(paquete.price, 'charm') ← ❌ IGNORA FLAG
   └─> Línea 134-135: Verifica use_charm_rounding ← ✅ CORRECTO pero inconsistente

4. PaqueteDetailSheet.tsx
   └─> Recibe: paquete (con use_charm_rounding)
   └─> Línea 142: Verifica use_charm_rounding ← ✅ CORRECTO
```

**Problemas identificados**:
1. ❌ `PaquetesSection` tiene lógica duplicada/inconsistente
2. ❌ `ComparadorSheet` no verifica `use_charm_rounding`
3. ⚠️ `durationHours` se pasa como prop pero no se usa (ya viene calculado)
4. ⚠️ Múltiples lugares formatean precios sin verificar flag

---

## 💡 Opciones de Solución

### **Opción 1: Función Unificada de Formateo** ⭐ **RECOMENDADA**

**Ventajas**:
- ✅ Single source of truth
- ✅ Fácil de mantener
- ✅ Consistente en todos los lugares
- ✅ No requiere cambios en props

**Implementación**:
```typescript
// src/lib/utils/package-price-formatter.ts
export function formatPackagePrice(
  price: number, 
  useCharmRounding?: boolean
): string {
  const strategy = useCharmRounding !== false ? 'charm' : 'auto';
  return formatRoundedPrice(price, strategy);
}
```

**Archivos a actualizar**:
- `PaquetesSection.tsx` - usar función unificada
- `PaqueteDetailSheet.tsx` - usar función unificada
- `ComparadorSheet.tsx` - usar función unificada
- `SolicitarPaqueteModal.tsx` - usar función unificada
- `AutorizarCotizacionModal.tsx` - usar función unificada

---

### **Opción 2: Hook Personalizado**

**Ventajas**:
- ✅ Encapsula lógica
- ✅ Puede incluir validaciones adicionales

**Implementación**:
```typescript
// src/hooks/usePackagePrice.ts
export function usePackagePrice(paquete: PublicPaquete) {
  const formattedPrice = useMemo(() => {
    const strategy = paquete.use_charm_rounding !== false ? 'charm' : 'auto';
    return formatRoundedPrice(paquete.price, strategy);
  }, [paquete.price, paquete.use_charm_rounding]);
  
  return { formattedPrice, rawPrice: paquete.price };
}
```

**Archivos a actualizar**: Mismos que Opción 1

---

### **Opción 3: Prop Computed en Backend**

**Ventajas**:
- ✅ Backend calcula TODO (precio + formato)
- ✅ Frontend solo muestra

**Desventajas**:
- ❌ Mezcla lógica de negocio con presentación
- ❌ Menos flexible para diferentes locales/formats

**Implementación**:
```typescript
// En getPublicPromiseAvailablePackages()
return {
  ...paquete,
  price: precioFinal,
  formatted_price: formatRoundedPrice(precioFinal, useCharmRounding ? 'charm' : 'auto'),
  use_charm_rounding: useCharmRounding
};
```

---

### **Opción 4: Context Provider**

**Ventajas**:
- ✅ Comparte configuración globalmente
- ✅ Útil si hay más lógica relacionada

**Desventajas**:
- ❌ Overhead innecesario para este caso
- ❌ Más complejo

---

## 🎯 Recomendación Final

**Opción 1: Función Unificada** es la mejor porque:
1. ✅ Simple y directa
2. ✅ No requiere cambios arquitectónicos grandes
3. ✅ Fácil de testear
4. ✅ Mantiene separación de concerns (backend calcula, frontend formatea)
5. ✅ Puede extenderse fácilmente (locales, monedas, etc.)

---

## 📋 Checklist de Refactor

### Fase 1: Crear función unificada
- [ ] Crear `src/lib/utils/package-price-formatter.ts`
- [ ] Exportar `formatPackagePrice(price, useCharmRounding)`
- [ ] Agregar tests unitarios

### Fase 2: Actualizar componentes
- [ ] `PaquetesSection.tsx` - reemplazar `formatRoundedPrice` directo
- [ ] `PaqueteDetailSheet.tsx` - usar función unificada
- [ ] `ComparadorSheet.tsx` - usar función unificada
- [ ] `SolicitarPaqueteModal.tsx` - verificar y actualizar si necesario
- [ ] `AutorizarCotizacionModal.tsx` - verificar y actualizar si necesario

### Fase 3: Limpieza
- [ ] Remover `durationHours` prop de `PaquetesSection` (si no se usa)
- [ ] Verificar otros componentes de perfil público
- [ ] Actualizar tipos si necesario

### Fase 4: Testing
- [ ] Test con horas coincidentes → sin charm
- [ ] Test con horas diferentes → con charm
- [ ] Test sin horas → comportamiento default
- [ ] Test en diferentes componentes

---

## 🔍 Archivos a Revisar en Detalle

1. `src/components/promise/ComparadorSheet.tsx` - **CRÍTICO** - No verifica flag
2. `src/components/promise/SolicitarPaqueteModal.tsx` - Verificar uso
3. `src/components/promise/AutorizarCotizacionModal.tsx` - Verificar uso
4. `src/components/profile/sections/PaquetesSection.tsx` - Verificar si aplica
5. `src/lib/actions/public/profile.actions.ts` - Verificar si necesita misma lógica

---

## 📝 Notas Adicionales

- El flag `use_charm_rounding` ya está siendo establecido correctamente en el backend
- El problema es que algunos componentes no lo están respetando
- `durationHours` como prop es redundante (ya viene en `paquete.use_charm_rounding`)
- La función unificada puede extenderse para soportar diferentes estrategias de redondeo por contexto
