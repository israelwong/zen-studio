'use client';

import React from 'react';
import { OfferEditor } from '../../components/OfferEditor';
import type { StudioOffer } from '@/types/offers';

interface OfertaEditorClientProps {
    studioSlug: string;
    initialOffer: StudioOffer;
}

export function OfertaEditorClient({
    studioSlug,
    initialOffer,
}: OfertaEditorClientProps) {
    return (
        <div className="w-full max-w-7xl mx-auto">
            <OfferEditor
                studioSlug={studioSlug}
                mode="edit"
                offer={initialOffer}
            />
        </div>
    );
}
