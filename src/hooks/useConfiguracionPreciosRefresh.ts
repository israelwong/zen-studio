import { useEffect, useCallback } from 'react';

// Evento personalizado para notificar cambios en configuración de precios
const CONFIGURACION_PRECIOS_UPDATE_EVENT = 'configuracion-precios-update';

interface ConfiguracionPreciosUpdateEventDetail {
  studioSlug: string;
  sobreprecio?: number; // Valor en porcentaje (10 = 10%)
}

/**
 * Hook para disparar actualización de configuración de precios
 * Usar después de actualizar la configuración en UtilidadTab
 * @param sobreprecio - Valor decimal (0.10 = 10%), se convierte automáticamente a porcentaje
 */
export function useConfiguracionPreciosRefresh() {
  const triggerUpdate = useCallback((studioSlug: string, sobreprecio?: number) => {
    // Convertir de decimal (0.10) a porcentaje (10) antes de disparar el evento
    const sobreprecioPorcentaje = sobreprecio !== undefined ? sobreprecio * 100 : undefined;
    
    window.dispatchEvent(
      new CustomEvent<ConfiguracionPreciosUpdateEventDetail>(CONFIGURACION_PRECIOS_UPDATE_EVENT, {
        detail: { studioSlug, sobreprecio: sobreprecioPorcentaje },
      })
    );
  }, []);

  return { triggerUpdate };
}

/**
 * Hook para escuchar actualizaciones de configuración de precios
 * Usar en componentes que necesitan recargar cuando cambia el sobreprecio
 */
export function useConfiguracionPreciosUpdateListener(
  studioSlug: string,
  onUpdate: (sobreprecio?: number) => void
) {
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ConfiguracionPreciosUpdateEventDetail>;
      if (customEvent.detail?.studioSlug === studioSlug) {
        onUpdate(customEvent.detail.sobreprecio);
      }
    };

    window.addEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(CONFIGURACION_PRECIOS_UPDATE_EVENT, handleUpdate);
    };
  }, [studioSlug, onUpdate]);
}

