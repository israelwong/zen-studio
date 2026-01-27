'use client';

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { syncPromiseRoute, determinePromiseRoute, normalizeStatus } from '@/lib/utils/public-promise-routing';
import { PromisePageSkeleton } from './PromisePageSkeleton';

interface PromiseRouteGuardProps {
  studioSlug: string;
  promiseId: string;
  initialQuotes?: Array<{
    id: string;
    status: string;
    selected_by_prospect?: boolean | null;
    visible_to_client?: boolean | null;
    evento_id?: string | null;
  }>;
  targetRoute?: string;
  children?: React.ReactNode;
}

/**
 * Guardián de ruta: Verifica que el usuario esté en la ruta correcta según el estado de las cotizaciones.
 * 
 * Optimizado: Si recibe initialQuotes y targetRoute del servidor, hace la comparación inmediatamente
 * sin fetch inicial, eliminando el lag de 2 segundos en móviles.
 * 
 * MAGIA PARA EVITAR EL 500: Mientras isReady sea falso, solo retorna el PromisePageSkeleton.
 * Esto evita que React intente montar las páginas hijas antes de tiempo.
 */
export function PromiseRouteGuard({ 
  studioSlug, 
  promiseId,
  initialQuotes,
  targetRoute: serverTargetRoute,
  children,
}: PromiseRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Decisionador Único: useLayoutEffect para comparar rutas ANTES del primer render
  useLayoutEffect(() => {
    if (hasRedirectedRef.current) return;
    
    // Si tenemos datos del servidor, hacer validación inmediata sin fetch
    if (initialQuotes && serverTargetRoute) {
      // Comparar ruta actual con ruta objetivo del servidor
      const normalizedPathname = pathname.split('?')[0]; // Sin query params
      const normalizedTarget = serverTargetRoute.split('?')[0];
      
      if (normalizedPathname !== normalizedTarget && !pathname.includes('/cliente')) {
        hasRedirectedRef.current = true;
        router.replace(serverTargetRoute);
        return; // No marcar como ready si redirigimos
      }
      
      // Si la ruta es correcta, marcar como ready
      setIsReady(true);
      return;
    }
    
    // Si no tenemos datos del servidor, marcar como ready para permitir fetch
    setIsReady(true);
  }, [pathname, serverTargetRoute, initialQuotes, router]);

  // Función para sincronizar ruta con el servidor (solo si no tenemos datos iniciales)
  const handleSyncRoute = async () => {
    if (hasRedirectedRef.current || (initialQuotes && serverTargetRoute)) return;
    
    try {
      const redirected = await syncPromiseRoute(promiseId, pathname, studioSlug);
      if (redirected) {
        hasRedirectedRef.current = true;
      }
    } catch (error) {
      console.error('[PromiseRouteGuard] Error en syncPromiseRoute:', error);
    }
  };

  // Sincronizar al cambiar de ruta (solo si no tenemos datos iniciales)
  useEffect(() => {
    if (initialQuotes && serverTargetRoute) return; // Bypass: ya tenemos datos del servidor
    
    hasRedirectedRef.current = false; // Reset al cambiar de ruta
    handleSyncRoute();
  }, [pathname, promiseId, studioSlug, initialQuotes, serverTargetRoute]);

  // Realtime: Reaccionar a cualquier cambio en cotizaciones (incluyendo visible_to_client)
  // Bypass de Realtime: Si ya tenemos initialQuotes, no necesita hacer fetch de 'limpieza' al inicio
  const quotesRef = useRef(initialQuotes || []);
  const handleSyncRouteRef = useRef(handleSyncRoute);
  handleSyncRouteRef.current = handleSyncRoute;

  // Actualizar quotesRef cuando cambian las cotizaciones iniciales
  useEffect(() => {
    if (initialQuotes) {
      quotesRef.current = initialQuotes;
    }
  }, [initialQuotes]);

  // Realtime: Solo para actualizaciones posteriores (no fetch inicial si tenemos initialQuotes)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    // Cualquier cambio (UPDATE, INSERT, DELETE) dispara recálculo de ruta
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      if (hasRedirectedRef.current) return;
      
      // Actualizar cotización en el ref
      const currentQuotes = [...quotesRef.current];
      const existingIndex = currentQuotes.findIndex(q => q.id === cotizacionId);
      
      if (existingIndex >= 0 && changeInfo) {
        currentQuotes[existingIndex] = {
          ...currentQuotes[existingIndex],
          status: changeInfo.status || currentQuotes[existingIndex].status,
          selected_by_prospect: changeInfo.selected_by_prospect !== undefined 
            ? changeInfo.selected_by_prospect 
            : currentQuotes[existingIndex].selected_by_prospect,
          visible_to_client: changeInfo.visible_to_client !== undefined
            ? changeInfo.visible_to_client
            : currentQuotes[existingIndex].visible_to_client,
        };
      } else if (changeInfo) {
        // Nueva cotización insertada
        currentQuotes.push({
          id: cotizacionId,
          status: changeInfo.status || '',
          selected_by_prospect: changeInfo.selected_by_prospect ?? false,
          visible_to_client: changeInfo.visible_to_client ?? false,
          evento_id: changeInfo.evento_id || null,
        });
      }
      
      quotesRef.current = currentQuotes;
      
      // Recalcular ruta con las cotizaciones actualizadas
      const updatedQuotes = currentQuotes.map(q => ({
        id: q.id,
        status: normalizeStatus(q.status || ''),
        selected_by_prospect: q.selected_by_prospect ?? false,
        visible_to_client: q.visible_to_client ?? false,
        evento_id: q.evento_id,
      }));
      
      const newTargetRoute = determinePromiseRoute(updatedQuotes, studioSlug, promiseId);
      const normalizedPathname = pathname.split('?')[0];
      const normalizedTarget = newTargetRoute.split('?')[0];
      
      if (normalizedPathname !== normalizedTarget && !pathname.includes('/cliente')) {
        hasRedirectedRef.current = true;
        router.replace(newTargetRoute);
      }
    },
    onCotizacionInserted: () => {
      handleSyncRouteRef.current();
    },
    onCotizacionDeleted: () => {
      handleSyncRouteRef.current();
    },
  });

  // MAGIA PARA EVITAR EL 500: Mientras isReady sea falso, solo retorna el PromisePageSkeleton
  // Esto evita que React intente montar las páginas hijas antes de tiempo
  if (!isReady) {
    return <PromisePageSkeleton />;
  }

  // Si llegamos aquí, la ruta es correcta - renderizar children (si existe) o null
  return children ? <>{children}</> : null;
}
