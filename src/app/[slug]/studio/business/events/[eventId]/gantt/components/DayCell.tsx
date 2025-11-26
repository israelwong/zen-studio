import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DayCellProps {
    date: Date;
    isHeader?: boolean;
}

export function DayCell({ date, isHeader = false }: DayCellProps) {
    if (isHeader) {
        return (
            <div className="min-w-[40px] h-full flex flex-col items-center justify-center border-r border-zinc-800/50 bg-zinc-900/50">
                <span className="text-[10px] font-medium text-zinc-500 uppercase">
                    {format(date, 'EEE', { locale: es })}
                </span>
                <span className="text-xs font-bold text-zinc-300">
                    {format(date, 'd')}
                </span>
            </div>
        );
    }

    return (
        <div className="min-w-[40px] h-full border-r border-zinc-800/50 relative hover:bg-zinc-800/30 transition-colors group">
            {/* Hover indicator */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none">
                <div className="w-1 h-1 rounded-full bg-zinc-700" />
            </div>
        </div>
    );
}
