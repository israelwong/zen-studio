# Problema: Se muestra notificación en vez de overlay al autorizar cotización

## Descripción del problema

Al hacer click en "Confirmar Reserva" en `AutorizarCotizacionModal`, se muestra una notificación toast en lugar del `ProgressOverlay`.

## Flujo actual

1. **Usuario hace click en "Confirmar Reserva"** → `handleFinalSubmit()` en `AutorizarCotizacionModal.tsx`
2. Se dispara evento `authorization-started` (línea 309)
3. Se establece `setShowProgressOverlay(true)` (línea 321)
4. **PROBLEMA**: Las actualizaciones de Realtime llegan ANTES de que el overlay se muestre o antes de que `isAuthorizationInProgress` se establezca

## Código relevante

### AutorizarCotizacionModal.tsx (líneas 306-324)
```typescript
setIsSubmitting(true);

// Disparar evento para bloquear redirecciones automáticas
window.dispatchEvent(new CustomEvent('authorization-started', {
  detail: { promiseId, cotizacionId: cotizacion.id }
}));

// Cerrar DetailSheet y ocultar UI inmediatamente
flushSync(() => {
  onCloseDetailSheet?.();
  (onSuccessContext || onSuccess)?.();
  (onPreparingContext || onPreparing)?.();
});

// Mostrar overlay - React re-renderizará automáticamente
setShowProgressOverlay(true);
setProgressStep('collecting');
setProgressError(null);
```

### PendientesPageClient.tsx (líneas 262-268)
```typescript
// Escucha el evento authorization-started
useEffect(() => {
  const handleAuthorizationStarted = (e: CustomEvent) => {
    setIsAuthorizationInProgress(true);
  };
  window.addEventListener('authorization-started', handleAuthorizationStarted as EventListener);
  return () => window.removeEventListener('authorization-started', handleAuthorizationStarted as EventListener);
}, []);
```

### PendientesPageClient.tsx (líneas 309-315)
```typescript
const handleCotizacionUpdated = useCallback(
  (cotizacionId: string, changeInfo?: CotizacionChangeInfo) => {
    // ⚠️ BLOQUEO CRÍTICO: No procesar actualizaciones durante el proceso de autorización
    if (showProgressOverlay || isAuthorizationInProgress) {
      console.log('[PendientesPageClient] Ignorando actualización durante proceso de autorización');
      return;
    }
    // ... resto del código que muestra toasts
  }
);
```

## Causa raíz

**Race condition**: El evento `authorization-started` se dispara, pero hay un delay entre:
1. El dispatch del evento
2. El listener que establece `isAuthorizationInProgress = true`
3. El Re-render de React que actualiza `showProgressOverlay`

Durante este delay, las actualizaciones de Realtime pueden llegar y pasar la validación `if (showProgressOverlay || isAuthorizationInProgress)`, mostrando toasts en lugar del overlay.

## Solución propuesta

1. **Establecer `isAuthorizationInProgress` ANTES de disparar el evento** (en el mismo componente)
2. **O usar `flushSync` para establecer ambos estados síncronamente**
3. **O bloquear las actualizaciones de Realtime desde el momento del click**, no desde el evento

## Archivos a modificar

- `src/components/promise/AutorizarCotizacionModal.tsx` (línea 306-324)
- `src/app/[slug]/promise/[promiseId]/pendientes/PendientesPageClient.tsx` (líneas 262-268, 309-315, 418-423)

## Estado actual

- ✅ Overlay se simplificó (sin estado local, solo contexto)
- ✅ Evento `authorization-started` se dispara
- ✅ **RESUELTO**: `isAuthorizationInProgress` movido al contexto y establecido síncronamente con `flushSync`
- ✅ Race condition eliminada: el bloqueo se activa antes de que lleguen las actualizaciones de Realtime
- ✅ Se muestra el overlay correctamente en lugar de toasts

## Solución implementada

1. **Movido `isAuthorizationInProgress` al `PromisePageContext`**: Permite acceso directo desde cualquier componente sin depender de eventos
2. **Establecimiento síncrono con `flushSync`**: En `AutorizarCotizacionModal`, el estado se establece ANTES de disparar el evento, eliminando la race condition
3. **Actualizado `PendientesPageClient`**: Usa el estado del contexto en lugar de estado local

### Cambios realizados

- `PromisePageContext.tsx`: Agregado `isAuthorizationInProgress` y `setIsAuthorizationInProgress` al contexto
- `AutorizarCotizacionModal.tsx`: Establece `isAuthorizationInProgress` síncronamente con `flushSync` antes del evento
- `PendientesPageClient.tsx`: Usa `isAuthorizationInProgress` del contexto, eliminando estado local
