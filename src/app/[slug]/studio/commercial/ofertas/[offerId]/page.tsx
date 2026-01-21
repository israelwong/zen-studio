import React from 'react';
import { unstable_cache } from 'next/cache';
import { getOffer } from '@/lib/actions/studio/offers/offers.actions';
import { OfertaEditorClient } from './components/OfertaEditorClient';
import { notFound } from 'next/navigation';

interface OfertaPageProps {
    params: Promise<{ slug: string; offerId: string }>;
}

export default async function OfertaPage({ params }: OfertaPageProps) {
    const { slug: studioSlug, offerId } = await params;

    // Cachear oferta con tag para invalidación granular
    // ⚠️ CRÍTICO: Tag incluye offerId para invalidación por oferta individual
    const getCachedOffer = unstable_cache(
        async () => {
            return getOffer(offerId, studioSlug);
        },
        ['offer', offerId, studioSlug], // ✅ Incluye offerId y studioSlug en keys
        {
            tags: [`offer-${offerId}`], // ✅ Tag granular por oferta
            revalidate: false, // No cachear por tiempo, solo por tags
        }
    );

    const offerResult = await getCachedOffer();

    if (!offerResult.success || !offerResult.data) {
        notFound();
    }

    return (
        <OfertaEditorClient
            studioSlug={studioSlug}
            initialOffer={offerResult.data}
        />
    );
}
