'use client';

import React, { useState } from 'react';
import { User, ChevronRight } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { PorPagarPersonal } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { PersonalPagoDetalleSheet } from './PersonalPagoDetalleSheet';

interface PorPagarPersonalCardProps {
    personal: PorPagarPersonal;
    studioSlug: string;
    onPagoConfirmado?: () => void;
}

export function PorPagarPersonalCard({
    personal,
    studioSlug,
    onPagoConfirmado,
}: PorPagarPersonalCardProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    return (
        <>
            <ZenCard
                variant="default"
                padding="sm"
                className="hover:border-zinc-700 transition-colors cursor-pointer"
                onClick={() => setIsSheetOpen(true)}
            >
                <ZenCardContent className="p-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg flex-shrink-0">
                                <User className="h-4 w-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-200 mb-0.5 truncate">
                                    {personal.personalName}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs text-zinc-400">
                                        {personal.items.length} {personal.items.length === 1 ? 'concepto' : 'conceptos'}
                                    </p>
                                    <span className="text-xs text-zinc-500">•</span>
                                    <p className="text-base text-rose-400 font-semibold">
                                        {formatCurrency(personal.totalAcumulado)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                    </div>
                </ZenCardContent>
            </ZenCard>

            <PersonalPagoDetalleSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                personal={personal}
                studioSlug={studioSlug}
                onPagoConfirmado={async () => {
                    await onPagoConfirmado?.();
                    // Solo cerrar el sheet si ya no hay items pendientes (pago consolidado completo)
                    // El sheet se mantendrá abierto si solo se eliminó o editó un item
                }}
            />
        </>
    );
}
