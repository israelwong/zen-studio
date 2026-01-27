'use client';

import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { CotizacionesSection } from './CotizacionesSection';
import type { CotizacionChangeInfo } from '@/hooks/useCotizacionesRealtime';
// ⚠️ RealtimeUpdateNotification deshabilitado para evitar conflictos
import type { PublicCotizacion, PublicPaquete } from '@/types/public-promise';

// ⚠️ BLOQUEO GLOBAL: Persiste aunque el componente se re-monte
const globalReloadLocks = new Map<string, { blockUntil: number; lastReload: number }>();

interface CotizacionesSectionRealtimeProps {
  initialCotizaciones: PublicCotizacion[];
  promiseId: string;
  studioSlug: string;
  studioId?: string;
  sessionId?: string;
  condicionesComerciales?: Array<{
    id: string;
    name: string;
    description: string | null;
    advance_percentage: number | null;
    advance_type?: string | null;
    advance_amount?: number | null;
    discount_percentage: number | null;
    type?: string;
    metodos_pago: Array<{
      id: string;
      metodo_pago_id: string;
      metodo_pago_name: string;
    }>;
  }>;
  terminosCondiciones?: Array<{
    id: string;
    title: string;
    content: string;
    is_required: boolean;
  }>;
  showCategoriesSubtotals?: boolean;
  showItemsPrices?: boolean;
  showStandardConditions?: boolean;
  showOfferConditions?: boolean;
  showPackages?: boolean;
  paquetes?: PublicPaquete[];
  autoGenerateContract?: boolean;
  durationHours?: number | null;
}

export function CotizacionesSectionRealtime({
  initialCotizaciones,
  promiseId,
  studioSlug,
  studioId,
  sessionId,
  condicionesComerciales,
  terminosCondiciones,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  showStandardConditions = true,
  showOfferConditions = false,
  showPackages = false,
  paquetes = [],
  autoGenerateContract = false,
  durationHours,
}: CotizacionesSectionRealtimeProps) {
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);
  const [isPending, startTransition] = useTransition();
  // ⚠️ Notificaciones deshabilitadas para evitar conflictos
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReloadingRef = useRef(false);
  const lastReloadTimeRef = useRef<number>(0);
  const blockUntilRef = useRef<number>(0); // Bloqueo de 5 segundos

  // ⚠️ ACTUALIZACIÓN LOCAL: Actualizar solo la cotización específica que cambió
  const updateCotizacionLocal = useCallback((cotizacionId: string, updates: Partial<PublicCotizacion>) => {
    setCotizaciones((prev) =>
      prev.map((cot) => (cot.id === cotizacionId ? { ...cot, ...updates } : cot))
    );
  }, []);

  // Función para recargar cotizaciones desde el servidor con debouncing y protección
  const reloadCotizaciones = useCallback(async () => {
    // ⚠️ TAREA 2: Bloqueo global persistente
    const lockKey = `${studioSlug}-${promiseId}`;
    const now = Date.now();
    const lock = globalReloadLocks.get(lockKey);

    // Protección: evitar llamadas si ya hay una en progreso
    if (isReloadingRef.current) {
      console.log('🔔 [CotizacionesSectionRealtime] Reload bloqueado: ya hay una en progreso');
      return;
    }

    // Protección: bloqueo global
    if (lock) {
      if (now < lock.blockUntil) {
        const remaining = Math.ceil((lock.blockUntil - now) / 1000);
        console.log(`🔒 [CotizacionesSectionRealtime] Reload bloqueado globalmente: esperando ${remaining}s más`);
        return;
      }
      if (now - lock.lastReload < 5000) {
        const remaining = Math.ceil((5000 - (now - lock.lastReload)) / 1000);
        console.log(`🔒 [CotizacionesSectionRealtime] Reload bloqueado: esperando ${remaining}s más`);
        return;
      }
    }

    // Actualizar bloqueo global
    globalReloadLocks.set(lockKey, {
      blockUntil: now + 5000,
      lastReload: now,
    });

    isReloadingRef.current = true;
    lastReloadTimeRef.current = now;
    blockUntilRef.current = now + 5000; // Bloquear por 5 segundos

    console.log('🔔 [CotizacionesSectionRealtime] Iniciando reload desde servidor');

    try {
      // ⚠️ OPTIMIZACIÓN: Usar getPublicPromiseRouteState (ultra-ligera) para verificar cambios
      // Solo recargar datos completos si realmente hay cambios de estado
      const { getPublicPromiseRouteState } = await import('@/lib/actions/public/promesas.actions');
      const routeState = await getPublicPromiseRouteState(studioSlug, promiseId);
      
      if (routeState.success && routeState.data) {
        // Verificar si hay cambios significativos antes de recargar todo
        const hasStatusChange = routeState.data.some(cot => {
          const existing = cotizaciones.find(c => c.id === cot.id);
          return !existing || existing.status !== cot.status;
        });

        // Solo recargar si hay cambios de estado o nuevas cotizaciones
        if (hasStatusChange || routeState.data.length !== cotizaciones.length) {
          console.log('🔔 [CotizacionesSectionRealtime] Cambios detectados, recargando datos completos');
          // Usar función específica según la ruta actual (pendientes usa getPublicPromisePendientes)
          const path = window.location.pathname;
          if (path.includes('/pendientes')) {
            const { getPublicPromisePendientes } = await import('@/lib/actions/public/promesas.actions');
            const result = await getPublicPromisePendientes(studioSlug, promiseId);
            if (result.success && result.data?.cotizaciones) {
              startTransition(() => {
                setCotizaciones(result.data!.cotizaciones);
              });
            }
          } else {
            // Para otras rutas, usar getPublicPromiseData como fallback (pero con debouncing ya aplicado)
            const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
            const result = await getPublicPromiseData(studioSlug, promiseId);
            if (result.success && result.data?.cotizaciones) {
              startTransition(() => {
                setCotizaciones(result.data!.cotizaciones);
              });
            }
          }
        } else {
          console.log('🔔 [CotizacionesSectionRealtime] Sin cambios significativos, evitando reload');
        }
      }
    } catch (error) {
      console.error('[CotizacionesSectionRealtime] Error en reloadCotizaciones:', error);
    } finally {
      isReloadingRef.current = false;
    }
  }, [promiseId, studioSlug, cotizaciones, startTransition]);

  useEffect(() => {
    // Actualizar estado cuando cambian las cotizaciones iniciales (SSR)
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  // ⚠️ SIN HOOK PROPIO: El padre (PendientesPageClient) maneja todo el Realtime
  // Esto evita competencia y garantiza que la redirección funcione correctamente

  return (
    <>
      <CotizacionesSection
        cotizaciones={cotizaciones}
        promiseId={promiseId}
        studioSlug={studioSlug}
        studioId={studioId}
        sessionId={sessionId}
        condicionesComerciales={condicionesComerciales}
        terminosCondiciones={terminosCondiciones}
        showCategoriesSubtotals={showCategoriesSubtotals}
        showItemsPrices={showItemsPrices}
        showStandardConditions={showStandardConditions}
        showOfferConditions={showOfferConditions}
        showPackages={showPackages}
        paquetes={paquetes.map(p => ({ id: p.id, cover_url: p.cover_url }))}
        autoGenerateContract={autoGenerateContract}
        recentlyUpdated={recentlyUpdated}
        durationHours={durationHours}
      />
      {/* ⚠️ TAREA 2: Componente de notificación flotante Zen */}
      {/* ⚠️ Notificaciones deshabilitadas para evitar conflictos con redirección */}
    </>
  );
}
