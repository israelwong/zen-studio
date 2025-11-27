'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { CrewMemberSelector } from '@/components/shared/crew-members/CrewMemberSelector';
import { asignarCrewAItem } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventoDetalle } from '@/lib/actions/studio/business/events/events.actions';

interface GanttItemPopoverProps {
    item: NonNullable<NonNullable<EventoDetalle['cotizaciones']>[0]['cotizacion_items']>[0];
    servicioNombre: string;
    studioSlug: string;
    children: React.ReactNode;
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(value);
}

export function GanttItemPopover({ item, servicioNombre, studioSlug, children }: GanttItemPopoverProps) {
    const [open, setOpen] = useState(false);

    const isService = item.profit_type === 'servicio' || item.profit_type === 'service';
    const badgeText = isService ? 'S' : 'P';
    const badgeColor = isService
        ? 'bg-blue-500/20 text-blue-300'
        : 'bg-purple-500/20 text-purple-300';

    const costoUnitario = item.cost ?? 0;
    const costoTotal = costoUnitario * item.quantity;

    const handleCrewChange = async (memberId: string | null) => {
        const result = await asignarCrewAItem(
            studioSlug,
            item.id,
            memberId
        );
        if (result.success) {
            toast.success('Personal asignado correctamente');
            // Cerrar popover después de asignar
            setOpen(false);
            // Revalidar datos
            window.location.reload();
        } else {
            toast.error(result.error || 'Error al asignar personal');
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-4 bg-zinc-900 border-zinc-800"
                align="start"
                side="bottom"
                sideOffset={4}
            >
                <div className="space-y-4">
                    {/* Título */}
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-300">
                            {servicioNombre}
                        </h3>
                    </div>

                    {/* Información del item */}
                    <div className="space-y-2 text-sm">
                        {/* Tipo */}
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Tipo:</span>
                            <span className={`text-[10px] font-light px-1.5 py-0.5 rounded-xs ${badgeColor}`}>
                                {badgeText}
                            </span>
                            <span className="text-zinc-300">
                                {isService ? 'Servicio' : 'Producto'}
                            </span>
                        </div>

                        {/* Cantidad */}
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Cantidad:</span>
                            <span className="text-zinc-300">x{item.quantity}</span>
                        </div>

                        {/* Costo unitario */}
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Costo unitario:</span>
                            <span className="text-zinc-300">
                                {costoUnitario > 0 ? formatCurrency(costoUnitario) : '—'}
                            </span>
                        </div>

                        {/* Costo total */}
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Costo total:</span>
                            <span className="text-emerald-400 font-medium">
                                {costoTotal > 0 ? formatCurrency(costoTotal) : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-zinc-800" />

                    {/* Asignar personal */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                            Asignar personal:
                        </label>
                        <CrewMemberSelector
                            studioSlug={studioSlug}
                            selectedMemberId={item.assigned_to_crew_member_id || null}
                            onSelect={handleCrewChange}
                            placeholder="Sin asignar"
                            className="w-full"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

