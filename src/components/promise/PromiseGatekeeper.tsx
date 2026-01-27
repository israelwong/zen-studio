'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCotizacionesRealtime, type CotizacionChangeInfo } from '@/hooks/useCotizacionesRealtime';
import { determinePromiseRoute, normalizeStatus } from '@/lib/utils/public-promise-routing';
import { PromisePageSkeleton } from '@/components/promise/PromisePageSkeleton';

interface PromiseGatekeeperProps {
  studioSlug: string;
  promiseId: string;
  initialCotizaciones?: Array<{
    id: string;
    status: string;
    selected_by_prospect?: boolean | null;
  }>;
  children: React.ReactNode;
}

/**
 * ⚠️ GATEKEEPER: Redirección Pura - Sin gestión de estado local
 * 
 * Este componente:
 * - Usa determinePromiseRoute como única fuente de verdad
 * - Valida ruta en carga inicial usando initialCotizaciones
 * - En Realtime, recalcula ruta con el cambio recibido (sin actualizar estado local)
 * - Muestra Skeleton y redirige cuando detecta que la ruta debe cambiar
 */
export function PromiseGatekeeper({
  studioSlug,
  promiseId,
  initialCotizaciones = [],
  children,
}: PromiseGatekeeperProps) {
  const pathname = usePathname();
  const isRedirectingRef = useRef(false);
  
  // ⚠️ ESTADO DE INTERFAZ: Controla si estamos redirigiendo (muestra Skeleton)
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // ⚠️ REF: Mantener referencia a cotizaciones para Realtime (se actualiza en el callback)
  const quotesRef = useRef(initialCotizaciones);
  
  // ⚠️ FUNCIÓN: Calcular ruta objetivo usando determinePromiseRoute
  const calculateTargetRoute = useCallback((cotizaciones: typeof initialCotizaciones) => {
    return determinePromiseRoute(cotizaciones, studioSlug, promiseId);
  }, [studioSlug, promiseId]);
  
  // ⚠️ FUNCIÓN: Ejecutar redirección si es necesaria
  const checkAndRedirect = useCallback((targetRoute: string, currentPath: string) => {
    // Si ya estamos redirigiendo, no hacer nada
    if (isRedirectingRef.current) {
      return;
    }
    
    // Si la ruta es diferente y no estamos en /cliente, redirigir
    if (targetRoute !== currentPath && !currentPath.includes('/cliente')) {
      console.log('🛡️ [Gatekeeper] Ruta no coincide, redirigiendo:', {
        currentPath,
        targetRoute,
      });
      
      // Activar estado de redirección (mostrar Skeleton)
      setIsRedirecting(true);
      isRedirectingRef.current = true;
      
      // Ejecutar redirección
      console.log('🔄 [Gatekeeper] Ejecutando redirección de', currentPath, 'a', targetRoute);
      window.location.replace(targetRoute);
    } else {
      // Ruta válida, permitir renderizado
      setIsRedirecting(false);
      isRedirectingRef.current = false;
    }
  }, []);
  
  // ⚠️ CARGA INICIAL SILENCIOSA: Validar ruta al montar usando initialCotizaciones
  useEffect(() => {
    // Inicializar ref con las cotizaciones iniciales
    quotesRef.current = initialCotizaciones;
    
    const targetRoute = calculateTargetRoute(initialCotizaciones);
    const currentPath = pathname;
    
    console.log('🛡️ [Gatekeeper] Carga inicial - Validando ruta:', {
      currentPath,
      targetRoute,
      initialQuotes: initialCotizaciones.map(q => ({ id: q.id, status: q.status })),
    });
    
    checkAndRedirect(targetRoute, currentPath);
  }, []); // Solo al montar
  
  // ⚠️ REALTIME DE SOLO LECTURA: Recalcular ruta con el cambio recibido
  const handleCotizacionUpdated = useCallback(
    (cotizacionId: string, changeInfo?: CotizacionChangeInfo) => {
      const status = changeInfo?.status;
      const normalizedStatus = status ? normalizeStatus(status) : undefined;
      
      // ⚠️ LOG: Confirmar que el mensaje de Supabase llegó
      console.log('📢 [Gatekeeper] EVENTO RECIBIDO DE SUPABASE:', {
        cotizacionId,
        status,
        normalizedStatus,
        timestamp: new Date().toISOString(),
        fullChangeInfo: changeInfo,
      });
      
      // ⚠️ CONSTRUIR ARRAY TEMPORAL: Asumir que el changeInfo es el nuevo estado
      // NO actualizar estado local, solo recalcular ruta con el cambio recibido
      const currentQuotes = [...quotesRef.current];
      const existingIndex = currentQuotes.findIndex((q) => q.id === cotizacionId);
      
      if (existingIndex >= 0) {
        // Actualizar cotización existente en el array temporal
        currentQuotes[existingIndex] = {
          ...currentQuotes[existingIndex],
          status: normalizedStatus || currentQuotes[existingIndex].status,
          selected_by_prospect: changeInfo?.selected_by_prospect !== undefined 
            ? changeInfo.selected_by_prospect 
            : currentQuotes[existingIndex].selected_by_prospect,
        };
      } else if (normalizedStatus) {
        // Nueva cotización insertada
        currentQuotes.push({
          id: cotizacionId,
          status: normalizedStatus,
          selected_by_prospect: changeInfo?.selected_by_prospect ?? false,
        });
      }
      
      // ⚠️ ACTUALIZAR REF: Guardar el nuevo estado en el ref (sin estado local)
      quotesRef.current = currentQuotes;
      
      // ⚠️ RECALCULAR RUTA: Usar determinePromiseRoute con el array actualizado
      const newTargetRoute = calculateTargetRoute(currentQuotes);
      const currentPath = pathname;
      
      console.log('🛡️ [Gatekeeper] Realtime - Recalculando ruta:', {
        currentPath,
        newTargetRoute,
        updatedQuotes: currentQuotes.map(q => ({ id: q.id, status: q.status })),
      });
      
      // ⚠️ REDIRIGIR SOLO SI LA RUTA CAMBIÓ
      if (newTargetRoute !== currentPath) {
        checkAndRedirect(newTargetRoute, currentPath);
      }
    },
    [pathname, calculateTargetRoute, checkAndRedirect]
  );

  // ⚠️ ÚNICO HOOK: Solo el Gatekeeper tiene useCotizacionesRealtime
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionUpdated: handleCotizacionUpdated,
    onCotizacionInserted: handleCotizacionUpdated,
  });

  // ⚠️ RENDERIZADO CONDICIONAL: Skeleton durante redirección, children cuando ruta es válida
  if (isRedirecting) {
    console.log('🛡️ [Gatekeeper] Mostrando Skeleton (redirigiendo)');
    return <PromisePageSkeleton />;
  }

  console.log('🛡️ [Gatekeeper] Renderizando children (ruta válida)');
  return <>{children}</>;
}
