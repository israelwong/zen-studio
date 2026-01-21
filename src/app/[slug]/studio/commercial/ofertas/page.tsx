import React from 'react';
import { unstable_cache } from 'next/cache';
import { getOffersShell } from '@/lib/actions/studio/offers/offers.actions';
import { getOffersStatsBatch } from '@/lib/actions/studio/offers/offer-stats.actions';
import { OfertasClient } from './components/OfertasClient';

interface OfertasPageProps {
    params: Promise<{ slug: string }>;
}

export default async function OfertasPage({ params }: OfertasPageProps) {
    const { slug: studioSlug } = await params;

    // Cachear ofertas con tag para invalidación selectiva
    // ⚠️ CRÍTICO: Tag incluye studioSlug para aislamiento entre tenants
    const getCachedOffersShell = unstable_cache(
        async () => {
            return getOffersShell(studioSlug, { include_inactive: true });
        },
        ['offers-shell', studioSlug], // ✅ studioSlug en keys
        {
            tags: [`offers-shell-${studioSlug}`], // ✅ Incluye studioSlug en tags
            revalidate: false, // No cachear por tiempo, solo por tags
        }
    );

    const offersResult = await getCachedOffersShell();

    if (!offersResult.success || !offersResult.data) {
        return (
            <div className="w-full max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <p className="text-red-400">
                        {offersResult.error || 'Error al cargar las ofertas'}
                    </p>
                </div>
            </div>
        );
    }

    // Obtener stats en batch (una sola query para todas las ofertas)
    const offerIds = offersResult.data.map(o => o.id);
    const statsResult = await getOffersStatsBatch(offerIds);

    const stats = statsResult.success && statsResult.data
        ? statsResult.data
        : {};

    return (
        <OfertasClient
            studioSlug={studioSlug}
            initialOffers={offersResult.data}
            initialStats={stats}
        />
    );
}
