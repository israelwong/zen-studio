'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { syncPromiseRoute } from '@/lib/utils/public-promise-routing';

interface PromiseRouteGuardProps {
  studioSlug: string;
  promiseId: string;
}

/**
 * Guardián de ruta: Verifica que el usuario esté en la ruta correcta según el estado de las cotizaciones.
 * 
 * Se ejecuta en todas las sub-rutas (/pendientes, /negociacion, /cierre) para asegurar
 * que el usuario sea redirigido si el estado cambia.
 */
export function PromiseRouteGuard({ studioSlug, promiseId }: PromiseRouteGuardProps) {
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  // Función para sincronizar ruta con el servidor
  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current) return;
    
    try {
      const redirected = await syncPromiseRoute(promiseId, pathname, studioSlug);
      if (redirected) {
        hasRedirectedRef.current = true;
      }
    } catch (error) {
      console.error('[PromiseRouteGuard] Error en syncPromiseRoute:', error);
    }
  };

  // Sincronizar al cambiar de ruta
  useEffect(() => {
    hasRedirectedRef.current = false; // Reset al cambiar de ruta
    handleSyncRoute();
  }, [pathname, promiseId, studioSlug]);

  // Realtime: Reaccionar a cualquier cambio en cotizaciones (incluyendo visible_to_client)
  const handleSyncRouteRef = useRef(handleSyncRoute);
  handleSyncRouteRef.current = handleSyncRoute;

  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    // Cualquier cambio (UPDATE, INSERT, DELETE) dispara sincronización
    // Esto incluye cambios en visible_to_client
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      console.log('🔔 [PromiseRouteGuard] Cambio detectado en cotización:', {
        cotizacionId,
        status: changeInfo?.status,
        visible_to_client: changeInfo?.visible_to_client,
        old_visible_to_client: changeInfo?.old_visible_to_client,
        camposCambiados: changeInfo?.camposCambiados,
        currentPath: pathname,
      });
      // Ejecutar sincronización siempre que haya un cambio
      handleSyncRouteRef.current();
    },
    onCotizacionInserted: () => {
      console.log('🔔 [PromiseRouteGuard] Cotización insertada. Sincronizando ruta...');
      handleSyncRouteRef.current();
    },
    onCotizacionDeleted: () => {
      console.log('🔔 [PromiseRouteGuard] Cotización eliminada. Sincronizando ruta...');
      handleSyncRouteRef.current();
    },
  });

  // Este componente no renderiza nada, solo monitorea y redirige
  return null;
}
