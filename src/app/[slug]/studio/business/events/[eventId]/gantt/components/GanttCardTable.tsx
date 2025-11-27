import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { GanttItemRow } from './GanttItemRow';
import { type DateRange } from 'react-day-picker';
import { GanttTimelineRow } from './GanttTimelineRow';
import React from 'react';

interface GanttCardTableProps {
    secciones: SeccionData[];
    itemsMap: Map<string, NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0]>;
    studioSlug: string;
    dateRange?: DateRange;
}

export function GanttCardTable({ secciones, itemsMap, studioSlug, dateRange }: GanttCardTableProps) {
    return (
        <div className="overflow-x-auto border border-zinc-800 rounded-lg shadow-sm">
            <table className="w-full border-collapse bg-zinc-950 text-left text-sm">
                <thead className="bg-zinc-900/90 text-zinc-400 font-medium backdrop-blur-sm sticky top-0 z-20">
                    <tr>
                        <th className="px-4 py-3 sticky left-0 bg-zinc-900 z-30 min-w-[240px] border-b border-zinc-800">Item</th>
                        <th className="px-4 py-3 border-b border-zinc-800 min-w-[100px]">Duración</th>
                        <th className="px-4 py-3 border-b border-zinc-800 min-w-[100px]">Progreso</th>
                        <th className="p-0 border-b border-zinc-800 min-w-[300px]">
                            <GanttTimelineRow dateRange={dateRange} isHeader />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {secciones.map((seccion) => (
                        <React.Fragment key={seccion.id}>
                            {/* Fila de Sección */}
                            <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                <td className="px-4 py-2 sticky left-0 bg-zinc-900/50 z-10 border-r border-zinc-800/50">
                                    <span className="text-sm font-semibold text-zinc-300">{seccion.nombre}</span>
                                </td>
                                <td colSpan={3} className="bg-zinc-900/50"></td>
                            </tr>

                            {/* Categorías dentro de la sección */}
                            {seccion.categorias.map((categoria) => (
                                <React.Fragment key={categoria.id}>
                                    {/* Fila de Categoría */}
                                    <tr className="bg-zinc-900/30 border-b border-zinc-800/50">
                                        <td className="px-6 py-1.5 sticky left-0 bg-zinc-900/30 z-10 border-r border-zinc-800/50">
                                            <span className="text-xs font-medium text-zinc-400">{categoria.nombre}</span>
                                        </td>
                                        <td colSpan={3} className="bg-zinc-900/30"></td>
                                    </tr>

                                    {/* Items dentro de la categoría */}
                                    {categoria.servicios.map((servicio) => {
                                        const item = itemsMap.get(servicio.id);
                                        if (!item) return null;

                                        return (
                                            <GanttItemRow
                                                key={item.id}
                                                item={item}
                                                itemData={{
                                                    seccionNombre: seccion.nombre,
                                                    categoriaNombre: categoria.nombre,
                                                    servicioNombre: servicio.nombre,
                                                    servicioId: servicio.id,
                                                }}
                                                studioSlug={studioSlug}
                                                dateRange={dateRange}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
