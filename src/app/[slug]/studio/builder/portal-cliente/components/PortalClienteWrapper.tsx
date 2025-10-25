'use client';

import { useState } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';

interface PortalClienteWrapperProps {
    studioSlug: string;
}

export function PortalClienteWrapper({ studioSlug }: PortalClienteWrapperProps) {
    return (
        <div className="space-y-6">
            {/* Información Principal */}
            <ZenCard>
                <ZenCardHeader>
                    <ZenCardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-cyan-400" />
                        Portal Cliente
                    </ZenCardTitle>
                    <ZenCardDescription>
                        Sistema de portal de acceso para clientes
                    </ZenCardDescription>
                </ZenCardHeader>
                <ZenCardContent>
                    <div className="text-center py-8">
                        <div className="p-4 bg-cyan-600/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Users className="h-8 w-8 text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Solo Portal Cliente</h3>
                        <p className="text-zinc-400 text-sm">
                            Aquí podrás configurar el portal de acceso para tus clientes
                        </p>
                    </div>
                </ZenCardContent>
            </ZenCard>

            {/* Información Adicional */}
            <ZenCard variant="outline">
                <ZenCardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyan-600/20 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Ficha pendiente de implementar</h4>
                            <p className="text-xs text-zinc-400">
                                Esta funcionalidad está en desarrollo. El portal de cliente
                                se implementará en futuras versiones.
                            </p>
                        </div>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
