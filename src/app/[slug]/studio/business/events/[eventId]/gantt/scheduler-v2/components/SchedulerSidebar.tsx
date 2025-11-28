'use client';

import React from 'react';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

type CotizacionItem = NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];

interface ItemMetadata {
  seccionNombre: string;
  categoriaNombre: string;
  servicioNombre: string;
  servicioId: string;
}

interface SchedulerSidebarProps {
  secciones: SeccionData[];
  itemsMap: Map<string, CotizacionItem>;
  renderItem: (item: CotizacionItem, metadata: ItemMetadata) => React.ReactNode;
}

export const SchedulerSidebar = React.memo(({
  secciones,
  itemsMap,
  renderItem,
}: SchedulerSidebarProps) => {
  return (
    <div className="w-full bg-zinc-950">
      {/* Header placeholder - altura exacta 60px para alinear con SchedulerHeader */}
      <div className="h-[60px] bg-zinc-900/50 border-b border-zinc-800 flex items-center px-4 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Servicios</span>
      </div>

      {secciones.map((seccion) => (
        <React.Fragment key={seccion.id}>
          {/* Sección - altura exacta 32px */}
          <div className="h-[32px] bg-zinc-900/50 border-b border-zinc-800 px-4 flex items-center">
            <span className="text-sm font-semibold text-zinc-300">{seccion.nombre}</span>
          </div>

          {/* Categorías */}
          {seccion.categorias.map((categoria) => (
            <React.Fragment key={categoria.id}>
              {/* Categoría - altura exacta 24px */}
              <div className="h-[24px] bg-zinc-900/30 border-b border-zinc-800/50 px-6 flex items-center">
                <span className="text-xs font-medium text-zinc-400">{categoria.nombre}</span>
              </div>

              {/* Items - altura exacta 60px */}
              {categoria.servicios.map((servicio) => {
                const item = itemsMap.get(servicio.id);
                if (!item) return null;

                return (
                  <div
                    key={item.id}
                    className="h-[60px] border-b border-zinc-800/50 flex items-center px-4 hover:bg-zinc-900/50 transition-colors"
                  >
                    {renderItem(item, {
                      seccionNombre: seccion.nombre,
                      categoriaNombre: categoria.nombre,
                      servicioNombre: servicio.nombre,
                      servicioId: servicio.id,
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
});

SchedulerSidebar.displayName = 'SchedulerSidebar';

