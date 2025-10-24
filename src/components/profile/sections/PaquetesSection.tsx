import React from 'react';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PublicPaquete } from '@/types/public-profile';

interface PaquetesSectionProps {
    paquetes: PublicPaquete[];
}

/**
 * PaquetesSection - Display for studio packages
 * Shows studio packages in a responsive grid with integrated card components
 */
export function PaquetesSection({ paquetes }: PaquetesSectionProps) {
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

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(price);
    };

    return (
        <div className="p-4">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                    Paquetes de Servicios
                </h2>
                <p className="text-sm text-zinc-400">
                    {paquetes.length} {paquetes.length === 1 ? 'paquete' : 'paquetes'} disponibles
                </p>
            </div>

            {/* Paquetes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                {paquetes.map((paquete) => (
                    <div
                        key={paquete.id}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:bg-zinc-800/70 transition-colors cursor-pointer"
                        onClick={() => {
                            // TODO: Navigate to package detail or open modal
                            console.log('Paquete clicked:', paquete.nombre);
                        }}
                    >
                        {/* Header */}
                        <div className="mb-3">
                            <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                                {paquete.nombre}
                            </h3>
                            {paquete.tipo_evento && (
                                <p className="text-sm text-zinc-400 mb-2">
                                    {paquete.tipo_evento}
                                </p>
                            )}
                        </div>

                        {/* Price */}
                        <div className="mb-4">
                            <span className="text-2xl font-bold text-purple-400">
                                {formatPrice(paquete.precio)}
                            </span>
                            {paquete.duracion_horas && (
                                <div className="flex items-center gap-1 mt-1 text-sm text-zinc-400">
                                    <Clock className="h-4 w-4" />
                                    <span>{paquete.duracion_horas} horas</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {paquete.descripcion && (
                            <p className="text-sm text-zinc-300 mb-4 line-clamp-2">
                                {paquete.descripcion}
                            </p>
                        )}

                        {/* Included Items */}
                        {paquete.incluye && paquete.incluye.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-sm font-medium text-zinc-200 mb-2 flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4 text-green-400" />
                                    Incluye:
                                </h4>
                                <ul className="space-y-1">
                                    {paquete.incluye.slice(0, 3).map((item, index) => (
                                        <li key={index} className="text-xs text-zinc-400 flex items-center gap-1">
                                            <div className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                    {paquete.incluye.length > 3 && (
                                        <li className="text-xs text-zinc-500">
                                            +{paquete.incluye.length - 3} más...
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Excluded Items */}
                        {paquete.no_incluye && paquete.no_incluye.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-sm font-medium text-zinc-200 mb-2 flex items-center gap-1">
                                    <XCircle className="h-4 w-4 text-red-400" />
                                    No incluye:
                                </h4>
                                <ul className="space-y-1">
                                    {paquete.no_incluye.slice(0, 2).map((item, index) => (
                                        <li key={index} className="text-xs text-zinc-400 flex items-center gap-1">
                                            <div className="w-1 h-1 bg-red-400 rounded-full flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                    {paquete.no_incluye.length > 2 && (
                                        <li className="text-xs text-zinc-500">
                                            +{paquete.no_incluye.length - 2} más...
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Conditions */}
                        {paquete.condiciones && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                                <p className="text-xs text-zinc-500">
                                    {paquete.condiciones}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
