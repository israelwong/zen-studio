'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UbicacionSection } from './components';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder-data.actions';
import { BuilderProfileData } from '@/types/builder-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { MapPin } from 'lucide-react';

export default function UbicacionPage() {
    const params = useParams();
    const studioSlug = params.slug as string;
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
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

    // Memoizar función para actualizar datos locales
    const handleLocalUpdate = useCallback((data: unknown) => {
        setBuilderData((prev: BuilderProfileData | null) => {
            if (!prev) return null;
            const updateData = data as Partial<{ direccion: string | null; google_maps_url: string | null }>;

            const studioUpdate: Partial<typeof prev.studio> = {};
            const contactUpdate: Partial<typeof prev.contactInfo> = {};

            if ('direccion' in updateData) {
                contactUpdate.address = updateData.direccion || null;
            }

            if ('google_maps_url' in updateData) {
                studioUpdate.maps_url = updateData.google_maps_url || null;
            }

            return {
                ...prev,
                studio: { ...prev.studio, ...studioUpdate },
                contactInfo: {
                    ...prev.contactInfo,
                    ...contactUpdate
                }
            };
        });
    }, []);

    // ✅ Mapear datos para preview
    const previewData = builderData ? {
        studio_name: builderData.studio.studio_name,
        slogan: builderData.studio.slogan,
        logo_url: builderData.studio.logo_url,
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        presentacion: builderData.studio.presentation,
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url,
    } : null;

    return (
        <SectionLayout section="contacto" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <MapPin className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Ubicación del Estudio</ZenCardTitle>
                            <ZenCardDescription>
                                Configura la dirección física y enlace de Google Maps de tu estudio
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-6">
                            <div className="h-24 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                            <div className="h-12 bg-zinc-800/50 rounded-lg animate-pulse"></div>
                        </div>
                    ) : (
                        <UbicacionSection
                            data={{
                                direccion: builderData?.contactInfo.address || null,
                                google_maps_url: builderData?.studio.maps_url || null,
                            }}
                            onLocalUpdate={handleLocalUpdate}
                            studioSlug={studioSlug}
                            loading={loading}
                        />
                    )}
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}

