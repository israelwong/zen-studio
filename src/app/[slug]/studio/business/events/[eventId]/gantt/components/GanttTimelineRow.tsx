import { type DateRange } from 'react-day-picker';
import { eachDayOfInterval } from 'date-fns';
import { DayCell } from './DayCell';

interface GanttTimelineRowProps {
    dateRange?: DateRange;
    isHeader?: boolean;
}

export function GanttTimelineRow({ dateRange, isHeader = false }: GanttTimelineRowProps) {
    if (!dateRange?.from || !dateRange?.to) {
        return (
            <div className={`h-full w-full min-h-[40px] flex items-center justify-center ${isHeader ? '' : 'bg-zinc-900/20 rounded border border-zinc-800/50 border-dashed'}`}>
                <span className="text-xs text-zinc-600 px-2">
                    {isHeader ? 'Configurar fechas' : 'Sin rango'}
                </span>
            </div>
        );
    }

    const days = eachDayOfInterval({
        start: dateRange.from,
        end: dateRange.to,
    });

    return (
        <div className="flex h-full min-h-[40px]">
            {days.map((day) => (
                <DayCell key={day.toISOString()} date={day} isHeader={isHeader} />
            ))}
        </div>
    );
}
