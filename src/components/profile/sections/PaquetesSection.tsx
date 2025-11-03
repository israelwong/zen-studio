import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import { PublicPaquete } from '@/types/public-profile';

interface PaquetesSectionProps {
    paquetes: PublicPaquete[];
}

/**
 * PaquetesSection - Display for studio packages
 * Shows packages grouped by event type in minimalist cards
 */
export function PaquetesSection({ paquetes }: PaquetesSectionProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(price);
    };

    // Agrupar paquetes por tipo de evento
    const paquetesPorTipo = useMemo(() => {
        const grouped: Record<string, PublicPaquete[]> = {};

        paquetes.forEach((paquete) => {
            const tipoEvento = paquete.tipo_evento || 'Sin categoría';
            if (!grouped[tipoEvento]) {
                grouped[tipoEvento] = [];
            }
            grouped[tipoEvento].push(paquete);
        });

        // Ordenar paquetes dentro de cada grupo por order
        Object.keys(grouped).forEach((tipo) => {
            grouped[tipo].sort((a, b) => a.order - b.order);
        });

        return grouped;
    }, [paquetes]);

    if (paquetes.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <Package className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Sin paquetes disponibles
                </h3>
                <p className="text-sm text-zinc-500">
                    Este estudio aún no tiene paquetes configurados
                </p>
            </div>
        );
    }

    const tiposEvento = Object.keys(paquetesPorTipo);

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                    Paquetes de Servicios
                </h2>
                <p className="text-sm text-zinc-400">
                    {paquetes.length} {paquetes.length === 1 ? 'paquete' : 'paquetes'} disponibles
                </p>
            </div>

            {/* Fichas por tipo de evento */}
            <div className="space-y-4">
                {tiposEvento.map((tipoEvento) => {
                    const paquetesDelTipo = paquetesPorTipo[tipoEvento];

                    return (
                        <div
                            key={tipoEvento}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden"
                        >
                            {/* Header del tipo de evento */}
                            <div className="px-4 py-3 bg-zinc-800/70 border-b border-zinc-700">
                                <h3 className="text-lg font-semibold text-zinc-100">
                                    {tipoEvento}
                                </h3>
                            </div>

                            {/* Listado de paquetes */}
                            <div className="divide-y divide-zinc-700/50">
                                {paquetesDelTipo.map((paquete) => (
                                    <div
                                        key={paquete.id}
                                        className="px-4 py-4 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                                        onClick={() => {
                                            // TODO: Navigate to package detail or open modal
                                            console.log('Paquete clicked:', paquete.nombre);
                                        }}
                                    >
                                        <div className="space-y-2">
                                            {/* Nombre y Precio */}
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-base font-semibold text-zinc-100">
                                                    {paquete.nombre}
                                                </h4>
                                                <span className="text-lg font-semibold text-purple-400 ml-4 flex-shrink-0">
                                                    {formatPrice(paquete.precio)}
                                                </span>
                                            </div>
                                            {/* Descripción */}
                                            {paquete.descripcion && (
                                                <p className="text-sm text-zinc-400 line-clamp-2">
                                                    {paquete.descripcion}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
