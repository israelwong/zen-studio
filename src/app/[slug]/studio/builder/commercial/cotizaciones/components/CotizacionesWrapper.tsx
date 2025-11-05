'use client';

import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';

interface CotizacionesWrapperProps {
    studioSlug: string;
}

export function CotizacionesWrapper({ studioSlug }: CotizacionesWrapperProps) {
    return (
        <div className="space-y-6">
            {/* Información Principal */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-orange-400" />
                        Cotizaciones
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Sistema de gestión de cotizaciones y propuestas de servicios
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="text-center py-8">
                        <div className="p-4 bg-orange-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-orange-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Solo Cotizaciones</h3>
                        <p className="text-zinc-400 text-sm">
                            Aquí podrás gestionar todas las cotizaciones y propuestas de servicios
                        </p>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Información Adicional */}
            <ZenCard variant="outline">
                <ZenCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-600/20 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-orange-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Ficha pendiente de implementar</h4>
                            <p className="text-xs text-zinc-400">
                                Esta funcionalidad está en desarrollo. El sistema de cotizaciones
                                se implementará en futuras versiones.
                            </p>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
