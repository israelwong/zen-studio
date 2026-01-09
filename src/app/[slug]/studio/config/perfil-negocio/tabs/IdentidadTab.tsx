'use client';

import React, { useCallback } from 'react';
import { IdentidadForm } from '@/app/[slug]/studio/business/identity/components/IdentidadForm';
import { actualizarLogo } from '@/lib/actions/studio/profile/identidad';
import { IdentidadData } from '@/app/[slug]/studio/business/identity/types';
import { BuilderProfileData, BuilderStudioProfile } from '@/types/builder-profile';

interface IdentidadTabProps {
    builderData: BuilderProfileData | null;
    loading: boolean;
    studioSlug: string;
    onUpdate: (updater: (prev: BuilderProfileData | null) => BuilderProfileData | null) => void;
    onDataChange?: () => Promise<void>;
}

export function IdentidadTab({ builderData, loading, studioSlug, onUpdate, onDataChange }: IdentidadTabProps) {
    const handleLocalUpdate = useCallback((data: unknown) => {
        onUpdate((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            const updateData = data as Partial<IdentidadData>;

            const studioUpdate: Partial<BuilderStudioProfile> = {};

            if ('studio_name' in updateData) studioUpdate.studio_name = updateData.studio_name;
            if ('slogan' in updateData) studioUpdate.slogan = updateData.slogan;
            if ('presentacion' in updateData) studioUpdate.presentation = updateData.presentacion;
            if ('logo_url' in updateData) studioUpdate.logo_url = updateData.logo_url;
            if ('palabras_clave' in updateData) {
                studioUpdate.keywords = Array.isArray(updateData.palabras_clave)
                    ? updateData.palabras_clave.join(', ')
                    : updateData.palabras_clave;
            }

            return {
                ...prev,
                studio: { ...prev.studio, ...studioUpdate },
            };
        });
    }, [onUpdate]);

    const handleLogoLocalUpdate = useCallback((url: string | null) => {
        onUpdate((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            return {
                ...prev,
                studio: { ...prev.studio, logo_url: url }
            };
        });
    }, [onUpdate]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }

    // Función helper para parsear keywords
    const parseKeywords = (keywords: string | null | undefined): string[] => {
        if (!keywords) return [];
        
        const trimmed = keywords.trim();
        
        // Si está vacío o es un array vacío en string
        if (!trimmed || trimmed === '[]' || trimmed === '""') {
            return [];
        }
        
        // Si parece ser JSON (empieza con [), intentar parsear
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed)
                    ? parsed.filter((k: unknown) => k && typeof k === 'string').map((k: string) => k.trim()).filter((k: string) => k)
                    : [];
            } catch {
                // Si falla el parse, tratar como string normal separado por comas
            }
        }
        
        // Si es un string normal separado por comas
        return trimmed.split(',').map(k => k.trim()).filter(k => k && k !== '[]' && k !== '""');
    };

    return (
        <IdentidadForm
            data={builderData?.studio ? {
                id: builderData.studio.id,
                studio_name: builderData.studio.studio_name,
                slug: studioSlug,
                slogan: builderData.studio.slogan,
                presentacion: builderData.studio.presentation,
                palabras_clave: parseKeywords(builderData.studio.keywords),
                logo_url: builderData.studio.logo_url,
                pagina_web: builderData.studio.website,
            } : {
                id: 'temp-id',
                studio_name: 'Mi Estudio',
                slug: studioSlug,
                slogan: null,
                presentacion: null,
                palabras_clave: [],
                logo_url: null,
                pagina_web: null,
            }}
            onLocalUpdate={handleLocalUpdate}
            onLogoUpdate={async (url: string) => {
                try {
                    await actualizarLogo(studioSlug, { tipo: 'logo', url });
                } catch (error) {
                    console.error('Error updating logo:', error);
                }
            }}
            onLogoLocalUpdate={handleLogoLocalUpdate}
            studioSlug={studioSlug}
            onDataChange={onDataChange}
        />
    );
}
