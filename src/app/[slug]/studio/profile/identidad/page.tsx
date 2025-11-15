'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IdentidadForm } from './components/';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder-data.actions';
import { actualizarLogo } from '@/lib/actions/studio/profile/identidad';
import { IdentidadData } from './types';
import { BuilderProfileData, BuilderStudioProfile } from '@/types/builder-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Image as ImageIcon } from 'lucide-react';

export default function IdentidadPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // ✅ UNA SOLA CONSULTA - Estrategia homologada con perfil público
                const result = await getBuilderData(studioSlug);
                if (result.success && result.data) {
                    setBuilderData(result.data);
                } else {
                    console.error('Error loading builder data:', result.error);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studioSlug]);

    // Memoizar funciones para evitar re-renders - Campos esenciales + información de contacto
    const handleLocalUpdate = useCallback((data: unknown) => {
        setBuilderData((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            const updateData = data as Partial<IdentidadData>;

            // Mapear campos esenciales de IdentidadData a BuilderStudioProfile
            const studioUpdate: Partial<BuilderStudioProfile> = {};

            if ('studio_name' in updateData) studioUpdate.studio_name = updateData.studio_name;
            if ('slogan' in updateData) studioUpdate.slogan = updateData.slogan;
            if ('presentacion' in updateData) studioUpdate.presentation = updateData.presentacion;
            if ('logo_url' in updateData) studioUpdate.logo_url = updateData.logo_url;
            if ('pagina_web' in updateData) studioUpdate.website = updateData.pagina_web;
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
    }, []);

    const handleLogoLocalUpdate = useCallback((url: string | null) => {
        setBuilderData((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            return {
                ...prev,
                studio: { ...prev.studio, logo_url: url }
            };
        });
    }, []);

    // ✅ Mapear datos para preview - Datos esenciales de identidad
    const previewData = builderData ? {
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        presentacion: builderData.studio.presentation,
    } : null;

    return (
        <SectionLayout section="identidad" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <ImageIcon className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Identidad del Estudio</ZenCardTitle>
                            <ZenCardDescription>
                                Configura el logo, nombre, slogan, website y palabras clave
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-6">
                            <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                            <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                            <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                        </div>
                    ) : (
                        <IdentidadForm
                            data={builderData?.studio ? {
                                id: builderData.studio.id,
                                studio_name: builderData.studio.studio_name,
                                slug: studioSlug,
                                slogan: builderData.studio.slogan,
                                presentacion: builderData.studio.presentation,
                                palabras_clave: builderData.studio.keywords ? builderData.studio.keywords.split(',').map(k => k.trim()) : [],
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
                        />
                    )}
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
