'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CotizacionesSection } from './CotizacionesSection';
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
  const [cotizaciones, setCotizaciones] = useState<PublicCotizacion[]>(initialCotizaciones);
  const supabase = createClient();

  // Función para recargar cotizaciones desde el servidor
  const reloadCotizaciones = useCallback(async () => {
    try {
      // Recargar usando la misma función que la página pública
      const { getPublicPromiseData } = await import('@/lib/actions/public/promesas.actions');
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data?.cotizaciones) {
        setCotizaciones(result.data.cotizaciones);
      }
    } catch (error) {
      console.error('[CotizacionesSectionRealtime] Error recargando cotizaciones:', error);
    }
  }, [promiseId, studioSlug]);

  useEffect(() => {
    // Actualizar estado cuando cambian las cotizaciones iniciales (SSR)
    setCotizaciones(initialCotizaciones);
  }, [initialCotizaciones]);

  useEffect(() => {
    if (!studioSlug || !promiseId) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Intentar usar Realtime primero
    const setupRealtime = async () => {
      try {
        // Verificar si hay sesión activa
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Usuario autenticado: usar Realtime
          console.log('[CotizacionesSectionRealtime] Usuario autenticado, usando Realtime');

          channel = supabase
            .channel(`studio:${studioSlug}:cotizaciones`, {
              config: {
                private: true,
                broadcast: { self: true, ack: true }
              }
            })
            .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
              // Extraer cotización del payload en diferentes formatos
              const p = payload as any;
              const cotizacion = p.payload?.record || p.record || p.new || (p.id ? p : null);

              if (!cotizacion) return;

              const cotizacionPromiseId = cotizacion.promise_id as string | null;

              if (cotizacionPromiseId === promiseId && cotizacion.visible_to_client === true && cotizacion.archived === false) {
                console.log('[CotizacionesSectionRealtime] Nueva cotización detectada, recargando...');
                reloadCotizaciones();
              }
            })
            .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
              // Extraer cotización del payload en diferentes formatos
              const p = payload as any;
              const cotizacion = p.payload?.record || p.record || p.new || (p.id ? p : null);

              if (!cotizacion) return;

              const cotizacionPromiseId = cotizacion.promise_id as string | null;

              if (cotizacionPromiseId === promiseId) {
                console.log('[CotizacionesSectionRealtime] Cotización actualizada, recargando...');
                reloadCotizaciones();
              }
            })
            .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
              // Extraer cotización del payload en diferentes formatos
              const p = payload as any;
              const cotizacion = p.payload?.record || p.record || p.old || (p.id ? p : null);

              if (!cotizacion) return;

              const cotizacionId = cotizacion.id as string;
              const cotizacionPromiseId = cotizacion.promise_id as string | null;

              if (cotizacionPromiseId === promiseId && cotizacionId) {
                console.log('[CotizacionesSectionRealtime] Cotización eliminada:', cotizacionId);
                setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
              }
            })
            .subscribe((status, err) => {
              if (err) {
                const isUnauthorized = err.message?.includes('Unauthorized') ||
                  err.message?.includes('permissions') ||
                  err.message?.includes('do not have permissions');

                if (isUnauthorized) {
                  console.warn('[CotizacionesSectionRealtime] Sin permisos para Realtime, usando polling');
                  // Fallback a polling
                  pollInterval = setInterval(() => {
                    reloadCotizaciones();
                  }, 10000);
                } else {
                  console.error('[CotizacionesSectionRealtime] Error en suscripción:', err);
                  // Fallback a polling en caso de error
                  pollInterval = setInterval(() => {
                    reloadCotizaciones();
                  }, 10000);
                }
                return;
              }

              console.log('[CotizacionesSectionRealtime] Estado de suscripción:', status);
            });
        } else {
          // Usuario no autenticado: usar polling
          console.log('[CotizacionesSectionRealtime] Usuario no autenticado, usando polling');
          pollInterval = setInterval(() => {
            reloadCotizaciones();
          }, 10000); // Polling cada 10 segundos
        }
      } catch (error) {
        console.error('[CotizacionesSectionRealtime] Error configurando Realtime, usando polling:', error);
        // Fallback a polling
        pollInterval = setInterval(() => {
          reloadCotizaciones();
        }, 10000);
      }
    };

    setupRealtime();

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (channel) {
        console.log('[CotizacionesSectionRealtime] Desuscribiéndose del canal');
        supabase.removeChannel(channel);
      }
    };
  }, [studioSlug, promiseId, reloadCotizaciones, supabase]);

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
