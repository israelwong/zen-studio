import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { GanttAgrupacionCell } from './GanttAgrupacionCell';
import { GanttCostCell } from './GanttCostCell';
import { GanttPersonalCell } from './GanttPersonalCell';
import { GanttDurationCell } from './GanttDurationCell';
import { GanttProgressCell } from './GanttProgressCell';
import { GanttTimelineRow } from './GanttTimelineRow';

import { type DateRange } from 'react-day-picker';

interface GanttItemRowProps {
    item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
    itemData: {
        seccionNombre: string;
        categoriaNombre: string;
        servicioNombre: string;
        servicioId: string;
    };
    studioSlug: string;
    dateRange?: DateRange;
    // onTaskClick: (taskId: string, dayDate: Date) => void; // To be added later
    // onAddTaskClick: (dayDate: Date) => void; // To be added later
}

export function GanttItemRow({ item, itemData, studioSlug, dateRange }: GanttItemRowProps) {
    return (
        <tr className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors group">
            {/* Agrupación (Sticky Left) */}
            <td className="px-4 py-3 sticky left-0 bg-zinc-950 z-20 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800/50">
                <GanttAgrupacionCell
                    servicio={itemData.servicioNombre}
                    quantity={item.quantity}
                    description={item.description}
                />
            </td>

            {/* Costo */}
            <td className="px-4 py-3 bg-zinc-950 group-hover:bg-zinc-900 transition-colors">
                <GanttCostCell item={item} />
            </td>

            {/* Personal */}
            <td className="px-4 py-3 bg-zinc-950 group-hover:bg-zinc-900 transition-colors min-w-[200px]">
                <GanttPersonalCell
                    item={item}
                    studioSlug={studioSlug}
                />
            </td>

            {/* Duración */}
            <td className="px-4 py-3 bg-zinc-950 group-hover:bg-zinc-900 transition-colors">
                <GanttDurationCell item={item} />
            </td>

            {/* Progreso */}
            <td className="px-4 py-3 bg-zinc-950 group-hover:bg-zinc-900 transition-colors">
                <GanttProgressCell item={item} />
            </td>

            {/* Timeline */}
            <td className="px-4 py-3 min-w-[300px]">
                <GanttTimelineRow dateRange={dateRange} />
            </td>
        </tr>
    );
}
