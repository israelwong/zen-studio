'use client';

import React from 'react';
import { SocialSection } from '@/app/[slug]/studio/business/identity/components/SocialSection';
import { BuilderProfileData } from '@/types/builder-profile';

interface RedesTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate: (data: BuilderProfileData | null) => void;
    onDataChange?: () => Promise<void>;
}

export function RedesTab({ builderData, loading, studioSlug, onDataChange }: RedesTabProps) {
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    return (
        <SocialSection
            studioSlug={studioSlug}
            redesSociales={builderData?.socialNetworks || []}
            onDataChange={onDataChange}
        />
    );
}
