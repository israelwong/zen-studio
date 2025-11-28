'use client';

import { useState, useMemo } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventGanttCard } from './EventGanttCard';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface EventGanttViewProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  ganttInstance?: EventoDetalle['gantt'];
  dateRange?: DateRange;
  showDuration?: boolean;
  showProgress?: boolean;
}

export function EventGanttView({
  studioSlug,
  eventId,
  eventData,
  ganttInstance,
  dateRange: propDateRange,
  showDuration = false,
  showProgress = false,
}: EventGanttViewProps) {

  // Filtrar cotizaciones aprobadas
  const cotizacionesAprobadas = useMemo(() => {
    return (
      eventData.cotizaciones?.filter(
        (c) => c.status === 'autorizada' || c.status === 'aprobada' || c.status === 'approved'
      ) || []
    );
  }, [eventData.cotizaciones]);

  // Calcular rango por defecto si no está configurado
  const defaultDateRange = useMemo(() => {
    // Prioridad: dateRange prop > ganttInstance > fecha del evento
    if (propDateRange) return propDateRange;

    if (ganttInstance?.start_date && ganttInstance?.end_date) {
      return {
        from: new Date(ganttInstance.start_date),
        to: new Date(ganttInstance.end_date),
      };
    }

    const eventDate = eventData.event_date || eventData.promise?.event_date;
    if (!eventDate) return undefined;

    const start = new Date(eventDate);
    start.setDate(start.getDate() - 7); // 7 días antes del evento

    const end = new Date(eventDate);
    end.setDate(end.getDate() + 30); // 30 días después del evento

    return { from: start, to: end };
  }, [propDateRange, ganttInstance, eventData.event_date, eventData.promise?.event_date]);

  return (
    <div className="space-y-6">
      {/* Lista de cotizaciones */}
      {cotizacionesAprobadas.length > 0 ? (
        <div className="space-y-4">
          {cotizacionesAprobadas.map((cotizacion) => (
            <EventGanttCard
              key={cotizacion.id}
              cotizacion={cotizacion}
              studioSlug={studioSlug}
              eventId={eventId}
              eventDate={eventData.event_date || eventData.promise?.event_date || null}
              dateRange={defaultDateRange}
              showDuration={showDuration}
              showProgress={showProgress}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
          <p className="text-sm text-zinc-400">
            No hay cotizaciones aprobadas para mostrar en el cronograma
          </p>
        </div>
      )}

      {/* Placeholder para vista Gantt Chart */}
      {/* <div className="p-8 bg-zinc-900 rounded-lg border border-zinc-800 text-center">
        <p className="text-sm text-zinc-400 mb-2">Vista Gantt Chart</p>
        <p className="text-xs text-zinc-500">
          La visualización temporal del cronograma estará disponible próximamente
        </p>
      </div> */}
    </div>
  );
}

