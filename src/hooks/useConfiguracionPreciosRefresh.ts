import { useEffect, useCallback } from 'react';

// Evento personalizado para notificar cambios en configuración de precios
export const CONFIGURACION_PRECIOS_UPDATE_EVENT = 'configuracion-precios-update';

export interface ConfiguracionPreciosUpdateEventDetail {
  studioSlug: string;
  // Configuración completa en decimales (0.30 = 30%)
  utilidad_servicio?: number;
  utilidad_producto?: number;
  comision_venta?: number;
  sobreprecio?: number;
}

/**
 * Hook para disparar actualización de configuración de precios
 * Usar después de actualizar la configuración en UtilidadForm
 */
export function useConfiguracionPreciosRefresh() {
  const triggerUpdate = useCallback((studioSlug: string, config?: {
    utilidad_servicio?: number;
    utilidad_producto?: number;
    comision_venta?: number;
    sobreprecio?: number;
  }) => {
    window.dispatchEvent(
      new CustomEvent<ConfiguracionPreciosUpdateEventDetail>(CONFIGURACION_PRECIOS_UPDATE_EVENT, {
        detail: { 
          studioSlug,
          ...config
        },
      })
    );
  }, []);

  return { triggerUpdate };
}

/**
 * Hook para escuchar actualizaciones de configuración de precios
 * Usar en componentes que necesitan recargar cuando cambia la configuración
 */
export function useConfiguracionPreciosUpdateListener(
  studioSlug: string,
  onUpdate: (config?: ConfiguracionPreciosUpdateEventDetail) => void
) {
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ConfiguracionPreciosUpdateEventDetail>;
      if (customEvent.detail?.studioSlug === studioSlug) {
        onUpdate(customEvent.detail);
      }
    };

    window.addEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);
    };
  }, [studioSlug, onUpdate]);
}

