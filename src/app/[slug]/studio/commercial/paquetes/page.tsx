import React from 'react';
import { Package, Percent } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { getPaquetesShell } from '@/lib/actions/studio/paquetes/paquetes.actions';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { PaquetesClient } from './components/PaquetesClient';

interface PaquetesPageProps {
    params: Promise<{ slug: string }>;
}

export default async function PaquetesPage({ params }: PaquetesPageProps) {
    const { slug: studioSlug } = await params;

    // Cachear paquetes con tag para invalidación selectiva
    // ⚠️ CRÍTICO: Tag incluye studioSlug para aislamiento entre tenants
    const getCachedPaquetesShell = unstable_cache(
        async () => {
            return getPaquetesShell(studioSlug);
        },
        ['paquetes-shell', studioSlug], // ✅ studioSlug en keys
        {
            tags: [`paquetes-shell-${studioSlug}`], // ✅ Incluye studioSlug en tags
            revalidate: false, // No cachear por tiempo, solo por tags
        }
    );

    // Cachear tipos de evento (cambian poco)
    const getCachedTiposEvento = unstable_cache(
        async () => {
            return obtenerTiposEvento(studioSlug);
        },
        ['tipos-evento', studioSlug], // ✅ studioSlug en keys
        {
            tags: [`tipos-evento-${studioSlug}`], // ✅ Incluye studioSlug en tags
            revalidate: 3600, // 1 hora (cambian poco)
        }
    );

    const [paquetesResult, tiposResult] = await Promise.all([
        getCachedPaquetesShell(),
        getCachedTiposEvento(),
    ]);

    if (!paquetesResult.success || !paquetesResult.data) {
        return (
            <div className="space-y-6">
                <ZenCard variant="default" padding="none">
                    <ZenCardContent className="p-6">
                        <p className="text-red-400">Error al cargar paquetes: {paquetesResult.error}</p>
                    </ZenCardContent>
                </ZenCard>
            </div>
        );
    }

    if (!tiposResult.success || !tiposResult.data) {
        return (
            <div className="space-y-6">
                <ZenCard variant="default" padding="none">
                    <ZenCardContent className="p-6">
                        <p className="text-red-400">Error al cargar tipos de evento: {tiposResult.error}</p>
                    </ZenCardContent>
                </ZenCard>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <Package className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Paquetes</ZenCardTitle>
                                <ZenCardDescription>
                                    Crea y gestiona paquetes de servicios
                                </ZenCardDescription>
                            </div>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <PaquetesClient
                        studioSlug={studioSlug}
                        initialPaquetes={paquetesResult.data}
                        initialTiposEvento={tiposResult.data}
                    />
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
