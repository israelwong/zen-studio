interface GanttAgrupacionCellProps {
    servicio: string;
}

export function GanttAgrupacionCell({ servicio }: GanttAgrupacionCellProps) {
    return (
        <div className="flex-1 min-w-0 pl-4">
            <p className="text-sm text-zinc-300 break-words cursor-pointer hover:text-zinc-200 transition-colors">
                {servicio}
            </p>
        </div>
    );
}
