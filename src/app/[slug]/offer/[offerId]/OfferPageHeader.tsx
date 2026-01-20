'use client';

import React from 'react';
import { OfferHeader } from '@/components/offers/OfferHeader';
import { TrackingScripts } from '@/components/offers/TrackingScripts';
import { OfferBackgroundWrapper } from '@/components/offers/OfferBackgroundWrapper';

interface OfferPageHeaderProps {
    offer: {
        id: string;
        name: string;
        slug: string;
        cover_media_url: string | null;
    };
    studio: {
        studio_name: string;
        slogan: string | null;
        logo_url: string | null;
        gtm_id: string | null;
        facebook_pixel_id: string | null;
    };
    studioSlug: string;
}

/**
 * ⚠️ STREAMING: Componente header (instantáneo)
 * Renderiza header y tracking sin esperar content blocks
 */
export function OfferPageHeader({
    offer,
    studio,
    studioSlug,
}: OfferPageHeaderProps) {
    return (
        <>
            {/* Scripts de tracking */}
            <TrackingScripts
                gtmId={studio.gtm_id || undefined}
                facebookPixelId={studio.facebook_pixel_id || undefined}
                customEvents={[
                    {
                        eventName: "offer_landing_view",
                        eventData: {
                            offer_id: offer.id,
                            offer_slug: offer.slug,
                            offer_name: offer.name,
                        },
                    },
                    {
                        eventName: "ViewContent",
                        eventData: {
                            content_name: offer.slug,
                            content_category: "offer",
                        },
                    },
                ]}
            />

            {/* Wrapper con fondo glassmorphism */}
            <OfferBackgroundWrapper coverUrl={offer.cover_media_url}>
                {/* Header sticky fixed en top */}
                <OfferHeader
                    studioSlug={studioSlug}
                    studioName={studio.studio_name}
                    studioSlogan={studio.slogan}
                    logoUrl={studio.logo_url}
                />
            </OfferBackgroundWrapper>
        </>
    );
}
