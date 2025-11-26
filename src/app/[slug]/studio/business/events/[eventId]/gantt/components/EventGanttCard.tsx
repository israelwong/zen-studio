'use client';

import { useState, useMemo, useEffect } from 'react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { obtenerCatalogo } from '@/lib/actions/studio/config/catalogo.actions';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { GanttCardTable } from './GanttCardTable';

import { type DateRange } from 'react-day-picker';

interface EventGanttCardProps {
  cotizacion: NonNullable<EventoDetalle['cotizaciones']>[0];
  studioSlug: string;
  eventDate: Date | null;
  dateRange?: DateRange;
}

interface GroupedItem {
  seccion: string;
  categoria: string;
  items: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'];
}

export function EventGanttCard({ cotizacion, studioSlug, eventDate, dateRange }: EventGanttCardProps) {
  const [catalogo, setCatalogo] = useState<SeccionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Crear mapa de items de la cotización usando item_id
  const itemsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof cotizacion.cotizacion_items>[0]>();
    cotizacion.cotizacion_items?.forEach((item) => {
      if (item.item_id) {
        map.set(item.item_id, item);
      }
    });
    return map;
  }, [cotizacion.cotizacion_items]);

  // Filtrar catálogo para mostrar solo items incluidos en la cotización
  const catalogoFiltrado = useMemo(() => {
    return catalogo.map(seccion => ({
      ...seccion,
      categorias: seccion.categorias
        .map(categoria => ({
          ...categoria,
          servicios: categoria.servicios.filter(servicio => itemsMap.has(servicio.id))
        }))
        .filter(categoria => categoria.servicios.length > 0)
    })).filter(seccion => seccion.categorias.length > 0);
  }, [catalogo, itemsMap]);

  useEffect(() => {
    const loadCatalogo = async () => {
      try {
        setLoading(true);
        const catalogoResult = await obtenerCatalogo(studioSlug);
        if (catalogoResult.success && catalogoResult.data) {
          setCatalogo(catalogoResult.data);
        }
      } catch (error) {
        console.error('Error loading catalog:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogo();
  }, [studioSlug]);

  if (loading) {
    return (
      <ZenCard variant="outlined">
        <ZenCardHeader>
          <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
        </ZenCardHeader>
        <ZenCardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  if (!cotizacion.cotizacion_items || cotizacion.cotizacion_items.length === 0) {
    return null;
  }

  if (catalogoFiltrado.length === 0) {
    return (
      <ZenCard variant="outlined">
        <ZenCardHeader>
          <ZenCardTitle className="text-lg">{cotizacion.name}</ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent>
          <p className="text-sm text-zinc-400">No hay items para mostrar</p>
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard variant="outlined" className="overflow-hidden">
      <ZenCardHeader>
        <ZenCardTitle className="text-lg">{cotizacion.name}</ZenCardTitle>
      </ZenCardHeader>
      <ZenCardContent className="p-0 sm:p-0">
        <GanttCardTable
          secciones={catalogoFiltrado}
          itemsMap={itemsMap}
          studioSlug={studioSlug}
          dateRange={dateRange}
        />
      </ZenCardContent>
    </ZenCard>
  );
}

