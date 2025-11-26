import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';
import { Clock } from 'lucide-react';

interface GanttDurationCellProps {
    item: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'][0];
}

export function GanttDurationCell({ item }: GanttDurationCellProps) {
    // Obtener duración desde gantt_task si existe, sino mostrar guión
    const duration = item.gantt_task?.start_date && item.gantt_task?.end_date
        ? Math.ceil((new Date(item.gantt_task.end_date).getTime() - new Date(item.gantt_task.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{duration > 0 ? `${duration} días` : '—'}</span>
        </div>
    );
}
