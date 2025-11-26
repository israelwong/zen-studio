interface GanttAgrupacionCellProps {
    servicio: string;
    quantity: number;
    costo?: number;
    profitType?: string | null;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(value);
}

export function GanttAgrupacionCell({
    servicio,
    quantity,
    costo = 0,
    profitType
}: GanttAgrupacionCellProps) {
    const isService = profitType === 'servicio' || profitType === 'service';
    const badgeText = isService ? 'S' : 'P';
    const badgeColor = isService
        ? 'bg-blue-500/20 text-blue-300'
        : 'bg-purple-500/20 text-purple-300';

    return (
        <div className="flex-1 min-w-0 pl-8">
            <div className="items-center gap-2 flex-row">

                <p className="text-sm text-zinc-300 break-words">
                    {servicio}

                    <span className={`ml-1 text-[10px] font-light px-1.5 py-0.5 rounded-xs w-5 h-5 items-center justify-center ${badgeColor}`}>
                        {badgeText}
                    </span>
                    <span className="text-[10px] ml-1 font-medium text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded">
                        x{quantity}
                    </span>
                    <span className="text-xs ml-1 text-emerald-400 font-medium">
                        {costo > 0 ? formatCurrency(costo) : '-'}
                    </span>
                </p>

            </div>
        </div>
    );
}
