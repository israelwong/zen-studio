import React from 'react';
import { unstable_cache } from 'next/cache';
import { getPortfoliosShell } from '@/lib/actions/studio/portfolios/portfolios.actions';
import { PortafoliosClient } from './components/PortafoliosClient';

interface PortafoliosPageProps {
    params: Promise<{ slug: string }>;
}

export default async function PortafoliosPage({ params }: PortafoliosPageProps) {
    const { slug: studioSlug } = await params;

    // Cachear portfolios con tag para invalidación selectiva
    // ⚠️ CRÍTICO: Tag incluye studioSlug para aislamiento entre tenants
    const getCachedPortfoliosShell = unstable_cache(
        async () => {
            return getPortfoliosShell(studioSlug);
        },
        ['portfolios-shell', studioSlug], // ✅ studioSlug en keys
        {
            tags: [`portfolios-shell-${studioSlug}`], // ✅ Incluye studioSlug en tags
            revalidate: false, // No cachear por tiempo, solo por tags
        }
    );

    const portfoliosResult = await getCachedPortfoliosShell();

    if (!portfoliosResult.success || !portfoliosResult.data) {
        return (
            <div className="w-full max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <p className="text-red-400">
                        {portfoliosResult.error || 'Error al cargar los portafolios'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PortafoliosClient
            studioSlug={studioSlug}
            initialPortfolios={portfoliosResult.data}
        />
    );
}
