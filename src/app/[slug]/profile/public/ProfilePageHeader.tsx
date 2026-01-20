'use client';

import React, { useEffect, useRef } from 'react';
import { ProfileHeader } from '@/components/profile';

interface ProfilePageHeaderProps {
    studio: {
        id: string;
        owner_id: string | null;
        studio_name: string;
        presentation: string | null;
        keywords: string | null;
        logo_url: string | null;
        slogan: string | null;
        website: string | null;
        address: string | null;
        plan_id: string | null;
        plan: { name: string; slug: string } | null;
        zonas_trabajo: Array<{ id: string; nombre: string; orden: number }>;
        faq: Array<{ id: string; pregunta: string; respuesta: string; orden: number; is_active: boolean }>;
    };
    studioSlug: string;
    isOwner: boolean;
}

/**
 * ⚠️ STREAMING: Componente header (instantáneo)
 * Renderiza header del studio sin esperar posts/portfolios
 */
export function ProfilePageHeader({
    studio,
    studioSlug,
    isOwner,
}: ProfilePageHeaderProps) {
    // Exponer callbacks vía window para que ProfilePageInteractive pueda actualizarlos
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__profilePageCallbacks = {
                onCreatePost: () => {
                    // Se actualizará desde ProfilePageClient
                },
                onCreateOffer: () => {
                    window.open(`/${studioSlug}/studio/commercial/ofertas/nuevo`, '_blank');
                },
            };
        }
    }, [studioSlug]);

    return (
        <header className="sticky top-0 z-50">
            <ProfileHeader
                data={{
                    studio_name: studio.studio_name,
                    slogan: studio.slogan,
                    logo_url: studio.logo_url
                }}
                studioSlug={studioSlug}
                onCreatePost={() => {
                    const callbacks = (window as any).__profilePageCallbacks;
                    if (callbacks?.onCreatePost) {
                        callbacks.onCreatePost();
                    }
                }}
                onCreateOffer={() => {
                    window.open(`/${studioSlug}/studio/commercial/ofertas/nuevo`, '_blank');
                }}
                isEditMode={isOwner}
            />
        </header>
    );
}
