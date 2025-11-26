interface GanttAgrupacionCellProps {
    servicio: string;
    quantity: number;
    description?: string | null;
}

export function GanttAgrupacionCell({
    servicio,
    quantity,
    description
}: GanttAgrupacionCellProps) {
    return (
        <div className="flex flex-col gap-1 min-w-[200px] pl-8">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200">{servicio}</span>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                    x{quantity}
                </span>
            </div>
            {description && (
                <p className="text-xs text-zinc-500 line-clamp-1" title={description}>
                    {description}
                </p>
            )}
        </div>
    );
}
