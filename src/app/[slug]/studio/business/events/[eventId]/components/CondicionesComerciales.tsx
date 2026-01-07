'use client';

import React, { useState, useEffect } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { getCondicionesComerciales } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface CondicionesComercialesProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
}

export function CondicionesComerciales({ studioSlug, eventId, eventData }: CondicionesComercialesProps) {
  const [resumen, setResumen] = useState<any>(null);
  const [loadingResumen, setLoadingResumen] = useState(true);

  // Cargar resumen del evento con snapshots inmutables
  useEffect(() => {
    const loadResumen = async () => {
      setLoadingResumen(true);
      try {
        const result = await obtenerResumenEventoCreado(studioSlug, eventId);
        if (result.success && result.data) {
          setResumen(result.data);
        }
      } catch (error) {
        console.error('Error loading resumen:', error);
      } finally {
        setLoadingResumen(false);
      }
    };
    loadResumen();
  }, [studioSlug, eventId]);

  // Obtener datos procesados desde snapshots inmutables
  const cotizacionData = resumen?.cotizacion || eventData.cotizacion;
  const condiciones = resumen?.cotizacion
    ? getCondicionesComerciales(resumen.cotizacion)
    : cotizacionData
      ? getCondicionesComerciales(cotizacionData)
      : null;

  if (!condiciones) {
    return null;
  }

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
          Condiciones comerciales
        </ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {loadingResumen ? (
          <div className="space-y-2">
            <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {condiciones.name && (
              <div>
                <p className="text-zinc-300 font-medium">{condiciones.name}</p>
              </div>
            )}
            {condiciones.description && (
              <div>
                <p className="text-zinc-400 leading-relaxed">{condiciones.description}</p>
              </div>
            )}
            {condiciones.advance_percentage && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-zinc-400">Anticipo:</span>
                <span className="text-blue-400 font-medium">
                  {condiciones.advance_percentage}%
                </span>
              </div>
            )}
            {condiciones.discount_percentage && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-zinc-400">Descuento:</span>
                <span className="text-emerald-400 font-medium">
                  {condiciones.discount_percentage}%
                </span>
              </div>
            )}
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

