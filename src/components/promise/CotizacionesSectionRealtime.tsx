'use client';

import { useState, useEffect, useCallback } from 'react';
import { CotizacionesSection } from './CotizacionesSection';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import type { PublicCotizacion } from '@/types/public-promise';

interface CotizacionesSectionRealtimeProps {
  initialCotizaciones: PublicCotizacion[];
  promiseId: string;
  studioSlug: string;
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
}

export function CotizacionesSectionRealtime({
  initialCotizaciones,
  promiseId,
  studioSlug,
  condicionesComerciales,
  terminosCondiciones,
  showCategoriesSubtotals = false,
  showItemsPrices = false,
  showStandardConditions = true,
  showOfferConditions = false,
}: CotizacionesSectionRealtimeProps) {
  console.log('[CotizacionesSectionRealtime] 🚀 Componente montado/actualizado:', {
    promiseId,
    studioSlug,
    initialCotizacionesCount: initialCotizaciones.length,
    timestamp: new Date().toISOString(),
  });

  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);

  console.log('[CotizacionesSectionRealtime] 📊 Estado inicial de cotizaciones:', {
    count: cotizaciones.length,
    ids: cotizaciones.map((c) => c.id),
  });

  // Función para recargar cotizaciones desde el servidor
  const reloadCotizaciones = useCallback(async () => {
    console.log('[CotizacionesSectionRealtime] 🔄 reloadCotizaciones llamado:', {
      promiseId,
      studioSlug,
      timestamp: new Date().toISOString(),
    });

    try {
      const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
      console.log('[CotizacionesSectionRealtime] 📡 Obteniendo datos de promesa pública...');

      const result = await getPublicPromiseData(studioSlug, promiseId);

      console.log('[CotizacionesSectionRealtime] 📥 Resultado de getPublicPromiseData:', {
        success: result.success,
        cotizacionesCount: result.data?.cotizaciones?.length || 0,
        error: result.error,
      });

      if (result.success && result.data?.cotizaciones) {
        console.log('[CotizacionesSectionRealtime] ✅ Actualizando estado con nuevas cotizaciones:', {
          count: result.data.cotizaciones.length,
          ids: result.data.cotizaciones.map((c) => c.id),
        });
        setCotizaciones(result.data.cotizaciones);
      } else {
        console.warn('[CotizacionesSectionRealtime] ⚠️ No se pudieron obtener cotizaciones:', result.error);
      }
    } catch (error) {
      console.error('[CotizacionesSectionRealtime] ❌ Error en reloadCotizaciones:', error);
    }
  }, [promiseId, studioSlug]);

  useEffect(() => {
    // Actualizar estado cuando cambian las cotizaciones iniciales (SSR)
    console.log('[CotizacionesSectionRealtime] 🔄 initialCotizaciones cambió:', {
      count: initialCotizaciones.length,
      ids: initialCotizaciones.map((c) => c.id),
      timestamp: new Date().toISOString(),
    });
    setCotizaciones(initialCotizaciones);
    console.log('[CotizacionesSectionRealtime] ✅ Estado actualizado con initialCotizaciones');
  }, [initialCotizaciones]);

  // Usar el hook de Realtime (sin polling)
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    onCotizacionInserted: () => {
      console.log('[CotizacionesSectionRealtime] 🔵 Callback onCotizacionInserted ejecutado');
      reloadCotizaciones();
    },
    onCotizacionUpdated: () => {
      console.log('[CotizacionesSectionRealtime] 🟢 Callback onCotizacionUpdated ejecutado');
      reloadCotizaciones();
    },
    onCotizacionDeleted: (cotizacionId) => {
      console.log('[CotizacionesSectionRealtime] 🔴 Callback onCotizacionDeleted ejecutado:', {
        cotizacionId,
        timestamp: new Date().toISOString(),
      });

      setCotizaciones((prev) => {
        const beforeCount = prev.length;
        const filtered = prev.filter((c) => c.id !== cotizacionId);
        const afterCount = filtered.length;

        console.log('[CotizacionesSectionRealtime] 🗑️ Eliminando cotización del estado:', {
          cotizacionId,
          beforeCount,
          afterCount,
          removed: beforeCount > afterCount,
        });

        return filtered;
      });
    },
  });

  // Log cuando cambia el estado de cotizaciones
  useEffect(() => {
    console.log('[CotizacionesSectionRealtime] 📊 Estado de cotizaciones actualizado:', {
      count: cotizaciones.length,
      ids: cotizaciones.map((c) => c.id),
      timestamp: new Date().toISOString(),
    });
  }, [cotizaciones]);

  console.log('[CotizacionesSectionRealtime] 🎨 Renderizando con:', {
    cotizacionesCount: cotizaciones.length,
    promiseId,
    studioSlug,
  });

  return (
    <CotizacionesSection
      cotizaciones={cotizaciones}
      promiseId={promiseId}
      studioSlug={studioSlug}
      condicionesComerciales={condicionesComerciales}
      terminosCondiciones={terminosCondiciones}
      showCategoriesSubtotals={showCategoriesSubtotals}
      showItemsPrices={showItemsPrices}
      showStandardConditions={showStandardConditions}
      showOfferConditions={showOfferConditions}
    />
  );
}
