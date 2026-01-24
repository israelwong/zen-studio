'use client';

import React, { useState, useEffect } from 'react';
import { PublicProfileData } from '@/types/public-profile';
import { useProfilePageLogic } from './hooks/useProfilePageLogic';
import { ProfilePageMobile } from './ProfilePageMobile';
import { ProfilePageDesktop } from './ProfilePageDesktop';
import { useIsDesktop } from '@/hooks/use-desktop';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    discount_percentage?: number | null;
    is_permanent?: boolean;
    has_date_range?: boolean;
    start_date?: string | null;
    valid_until?: string | null;
    event_type_name?: string | null;
    banner_destination?: "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING";
}

interface ProfilePageInteractiveProps {
    profileData: PublicProfileData;
    studioSlug: string;
    offers?: PublicOffer[];
}

/**
 * ProfilePageInteractive - Dispatcher que renderiza Mobile o Desktop
 * Lógica compartida extraída a useProfilePageLogic hook
 * Usa estado mounted para evitar mismatch de hidratación
 */
export function ProfilePageInteractive({ profileData, studioSlug, offers = [] }: ProfilePageInteractiveProps) {
    const logic = useProfilePageLogic({ profileData, studioSlug, offers });
    const isDesktop = useIsDesktop();
    const [mounted, setMounted] = useState(false);

    // Evitar mismatch de hidratación: renderizar mobile por defecto hasta que se monte
    useEffect(() => {
        setMounted(true);
    }, []);

    // Durante SSR y antes de montar, siempre renderizar mobile para consistencia
    if (!mounted) {
        return (
            <ProfilePageMobile profileData={profileData} studioSlug={studioSlug} offers={offers} logic={logic} />
        );
    }

    // Después de la hidratación, renderizar según detección
    if (isDesktop) {
        return (
            <ProfilePageDesktop profileData={profileData} studioSlug={studioSlug} offers={offers} logic={logic} />
        );
    }

    return (
        <ProfilePageMobile profileData={profileData} studioSlug={studioSlug} offers={offers} logic={logic} />
    );
}
