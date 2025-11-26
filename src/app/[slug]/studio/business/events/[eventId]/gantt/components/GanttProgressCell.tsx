import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface GanttProgressCellProps {
    item: NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items'][0];
}

export function GanttProgressCell({ item }: GanttProgressCellProps) {
    // Obtener progreso desde gantt_task si existe
    const progress = item.gantt_task?.progress_percent ?? 0;

    return (
        <div className="flex items-center gap-2 w-full max-w-[100px]">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className="text-xs text-zinc-400 font-medium w-8 text-right">
                {progress}%
            </span>
        </div>
    );
}
