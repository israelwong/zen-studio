'use client';

import { useState, useMemo, useEffect } from 'react';
import { type DateRange } from 'react-day-picker';
import { EventScheduler } from './EventScheduler';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';

interface EventSchedulerViewProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  ganttInstance?: EventoDetalle['gantt'];
  dateRange?: DateRange;
  onDataChange?: (data: EventoDetalle) => void;
}

export function EventSchedulerView({
  studioSlug,
  eventId,
  eventData,
  ganttInstance,
  dateRange: propDateRange,
  onDataChange,
}: EventSchedulerViewProps) {
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [loadingSecciones, setLoadingSecciones] = useState(true);

  // Cargar secciones del catálogo
  useEffect(() => {
    const loadSecciones = async () => {
      setLoadingSecciones(true);
      try {
        const result = await obtenerCatalogo(studioSlug, true);
        if (result.success && result.data) {
          setSecciones(result.data);
        } else {
          console.error('Error al cargar las secciones:', result.error);
        }
      } catch (error) {
        console.error('Error loading secciones:', error);
      } finally {
        setLoadingSecciones(false);
      }
    };

    if (studioSlug) {
      loadSecciones();
    }
  }, [studioSlug]);

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


  // Mostrar skeleton mientras carga secciones (evita mostrar V1/fallback)
  if (loadingSecciones) {
    return null; // El skeleton del page.tsx se encarga
  }

  // Usar SchedulerV2 como vista principal (V2 es la nueva vista por defecto)
  if (secciones.length > 0 && defaultDateRange) {
    return (
      <EventScheduler
        studioSlug={studioSlug}
        eventId={eventId}
        eventData={eventData}
        dateRange={defaultDateRange}
        secciones={secciones}
        onDataChange={onDataChange}
      />
    );
  }

  // Si no hay secciones o dateRange, mostrar mensaje
  return (
    <div className="flex items-center justify-center h-[400px] border border-zinc-800 rounded-lg bg-zinc-900/20">
      <p className="text-zinc-600">No hay datos para mostrar en el scheduler</p>
    </div>
  );
}

