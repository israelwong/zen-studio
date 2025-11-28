import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface DayCellProps {
    date: Date;
    isHeader?: boolean;
    onDayClick?: (date: Date) => void;
    onTaskClick?: (taskId: string, date: Date) => void;
    itemId?: string;
    tasks?: Array<{
        id: string;
        name: string;
        start_date: Date;
        end_date: Date;
        status: string;
    }>;
    showMonth?: boolean;
    isToday?: boolean;
}

interface DayCellHeaderProps {
    date: Date;
    showMonth?: boolean;
    isToday?: boolean;
}

function DayCellHeader({ date, showMonth = false }: DayCellHeaderProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(date);
    cellDate.setHours(0, 0, 0, 0);
    const isTodayCell = cellDate.getTime() === today.getTime();

    return (
        <div className="min-w-[60px] h-full flex flex-col items-center justify-center border-r border-zinc-800/50 bg-zinc-900/50 relative">
            {showMonth && (
                <span className="text-[9px] font-semibold text-zinc-400 uppercase mb-0.5">
                    {format(date, 'MMM', { locale: es })}
                </span>
            )}
            <span className="text-[10px] font-medium text-zinc-500 uppercase">
                {format(date, 'EEE', { locale: es })}
            </span>
            <span className={`
                text-xs font-bold mt-0.5
                ${isTodayCell ? 'text-emerald-400' : 'text-zinc-300'}
            `}>
                {format(date, 'd')}
            </span>
            {isTodayCell && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
        </div>
    );
}

export function DayCell({
    date,
    isHeader = false,
    onDayClick,
    onTaskClick,
    tasks = [],
    showMonth = false,
    isToday = false,
}: DayCellProps) {
    if (isHeader) {
        return <DayCellHeader date={date} showMonth={showMonth} isToday={isToday} />;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = new Date(date);
    cellDate.setHours(0, 0, 0, 0);
    const isTodayCell = cellDate.getTime() === today.getTime();

    // Verificar si hay tareas en este día
    const tasksThisDay = tasks.filter(task => {
        const taskStart = new Date(task.start_date);
        const taskEnd = new Date(task.end_date);
        const dayDate = new Date(date);

        // Normalizar fechas para comparación (solo día, sin hora)
        const normalizeDate = (d: Date) => {
            const normalized = new Date(d);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
        };

        const normalizedDay = normalizeDate(dayDate);
        const normalizedStart = normalizeDate(taskStart);
        const normalizedEnd = normalizeDate(taskEnd);

        // La tarea está en este día si el día está entre start_date y end_date (inclusive)
        return normalizedDay >= normalizedStart && normalizedDay <= normalizedEnd;
    });

    const handleClick = (e: React.MouseEvent) => {
        // Si el click viene de una tarea, no hacer nada (la tarea maneja su propio click)
        const target = e.target as HTMLElement;
        const taskCard = target.closest('[data-task-card]');
        if (taskCard) {
            return;
        }

        // Cualquier otro click en el área del día permite agregar nueva tarea
        e.stopPropagation();
        if (onDayClick) {
            onDayClick(date);
        }
    };

    const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        if (onTaskClick) {
            onTaskClick(taskId, date);
        }
    };

    return (
        <div
            className="min-w-[60px] h-full border-r border-zinc-800/50 relative hover:bg-zinc-800/30 transition-colors group cursor-pointer"
            onClick={handleClick}
        >
            {/* Línea vertical para hoy */}
            {isTodayCell && (
                <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-emerald-500 z-10 pointer-events-none" />
            )}
            {/* Tareas del día */}
            {tasksThisDay.length > 0 ? (
                <>
                    {/* Contenedor de tareas - solo las tareas reciben clicks */}
                    <div className="absolute inset-0 p-0.5 flex flex-col gap-0.5 overflow-hidden pointer-events-none">
                        {tasksThisDay.map(task => (
                            <div key={task.id} className="pointer-events-auto">
                                <TaskCard
                                    task={task}
                                    day={date}
                                    onClick={(e) => handleTaskClick(e, task.id)}
                                />
                            </div>
                        ))}
                    </div>
                    {/* Área visual del botón + cuando hay tareas */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none z-0"
                        aria-hidden="true"
                    >
                        <div className="w-5 h-5 rounded bg-zinc-800/80 border border-zinc-700 flex items-center justify-center pointer-events-none">
                            <Plus className="h-3 w-3 text-zinc-400" />
                        </div>
                    </div>
                </>
            ) : (
                /* Botón agregar si no hay tareas - el área completa es clickeable */
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none"
                    aria-hidden="true"
                >
                    <div className="w-5 h-5 rounded bg-zinc-800/80 border border-zinc-700 flex items-center justify-center pointer-events-none">
                        <Plus className="h-3 w-3 text-zinc-400" />
                    </div>
                </div>
            )}
        </div>
    );
}
