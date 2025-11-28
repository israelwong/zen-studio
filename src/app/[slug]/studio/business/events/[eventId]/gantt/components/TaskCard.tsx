'use client';

import { cn } from '@/lib/utils';

interface TaskCardProps {
    task: {
        id: string;
        name: string;
        start_date: Date;
        end_date: Date;
        status: string;
    };
    day: Date;
    onClick?: (e: React.MouseEvent) => void;
}

export function TaskCard({ task, day, onClick }: TaskCardProps) {
    const isCompleted = task.status === 'COMPLETED';
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const dayDate = new Date(day);
    
    // Normalizar fechas para comparación (solo día, sin hora)
    const normalizeDate = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    
    const normalizedDay = normalizeDate(dayDate);
    const normalizedStart = normalizeDate(taskStart);
    const normalizedEnd = normalizeDate(taskEnd);
    
    // Determinar si es el primer día, último día, o día intermedio
    const isFirstDay = normalizedDay.getTime() === normalizedStart.getTime();
    const isLastDay = normalizedDay.getTime() === normalizedEnd.getTime();
    const isMiddleDay = !isFirstDay && !isLastDay;
    
    // Calcular si es tarea de un solo día
    const isSingleDay = normalizedStart.getTime() === normalizedEnd.getTime();

    return (
        <div
            data-task-card
            onClick={onClick}
            className={cn(
                'text-[10px] px-1 py-0.5 rounded truncate cursor-pointer transition-all',
                'hover:opacity-80 hover:scale-[1.02]',
                isCompleted
                    ? 'bg-emerald-900/50 text-emerald-300 line-through'
                    : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800/50',
                // Bordes redondeados según posición
                isSingleDay && 'rounded',
                isFirstDay && !isLastDay && 'rounded-l rounded-r-none',
                isLastDay && !isFirstDay && 'rounded-r rounded-l-none',
                isMiddleDay && 'rounded-none'
            )}
            title={task.name}
        >
            {/* Mostrar nombre solo en el primer día o si es un solo día */}
            {(isFirstDay || isSingleDay) && (
                <span className="truncate block">{task.name}</span>
            )}
            {/* En días intermedios mostrar indicador visual */}
            {isMiddleDay && (
                <div className="h-full w-full bg-current opacity-30" />
            )}
            {/* En último día mostrar indicador de fin */}
            {isLastDay && !isFirstDay && (
                <div className="h-full w-full bg-current opacity-50" />
            )}
        </div>
    );
}

