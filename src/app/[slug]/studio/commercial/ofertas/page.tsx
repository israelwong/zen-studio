'use client';

import React from 'react';
import { Megaphone } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';

export default function OfertasPage() {
    return (
        <div className="w-full max-w-7xl mx-auto">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Megaphone className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Ofertas</ZenCardTitle>
                            <ZenCardDescription>
                                Gestiona tus ofertas, landing pages y campañas publicitarias
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <div className="text-center py-12">
                        <div className="mb-4">
                            <Megaphone className="h-16 w-16 text-zinc-600 mx-auto" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Ofertas - Próximamente
                        </h3>
                        <p className="text-zinc-400 max-w-md mx-auto">
                            Esta sección permitirá gestionar ofertas, configurar landing pages, 
                            lead forms y asociar campañas publicitarias (Meta Ads, Google Ads, ZEN Ads).
                        </p>
                    </div>
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}

