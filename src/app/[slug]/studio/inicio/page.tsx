'use client';

import React, { useEffect, useState } from 'react';
import { InicioEditorZen } from './components/InicioEditorZen';
import { SectionLayout } from '../components';
import { useParams } from 'next/navigation';
import { getBuilderData } from '@/lib/actions/studio/builder-data.actions';
import { InicioData } from './types';
import { BuilderProfileData } from '@/types/builder-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { Home } from 'lucide-react';

export default function InicioPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [inicioData, setInicioData] = useState<InicioData | null>(null);

    // Cargar datos del builder
    useEffect(() => {
        const loadBuilderData = async () => {
            try {
                setLoading(true);
                const result = await getBuilderData(studioSlug);

                if (result.success && result.data) {
                    setBuilderData(result.data);

                    // Transformar datos para el editor de inicio
                    const transformedData: InicioData = {
                        studio: {
                            studio_name: result.data.studio.studio_name,
                            presentation: result.data.studio.presentation,
                            slogan: result.data.studio.slogan,
                            logo_url: result.data.studio.logo_url,
                            website: result.data.studio.website,
                        },
                        featured_portfolios: result.data.portfolios.slice(0, 3).map(portfolio => ({
                            id: portfolio.id,
                            title: portfolio.title,
                            cover_image_url: portfolio.cover_image_url,
                            category: portfolio.category,
                        })),
                        featured_items: result.data.items.slice(0, 6).map(item => ({
                            id: item.id,
                            name: item.name,
                            type: item.type,
                            cost: item.cost,
                        })),
                        contact_info: {
                            phones: result.data.contactInfo.phones,
                            address: result.data.contactInfo.address,
                        },
                        social_networks: result.data.socialNetworks.map(network => ({
                            platform: network.platform?.name || 'Red Social',
                            url: network.url
                        }))
                    };

                    setInicioData(transformedData);
                } else {
                    console.error('Error loading builder data:', result.error);
                }
            } catch (error) {
                console.error('Error in loadBuilderData:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBuilderData();
    }, [studioSlug]);

    // Datos para el preview móvil
    const previewData = builderData ? {
        // Para ProfileIdentity
        studio_name: builderData.studio.studio_name,
        logo_url: builderData.studio.logo_url,
        slogan: builderData.studio.slogan,
        // Para ProfileContent (sección inicio)
        studio: builderData.studio,
        portfolios: builderData.portfolios,
        items: builderData.items,
        // Para ProfileFooter
        pagina_web: builderData.studio.website,
        palabras_clave: builderData.studio.keywords,
        redes_sociales: builderData.socialNetworks.map(network => ({
            plataforma: network.platform?.name || 'Red Social',
            url: network.url
        })),
        email: null, // No hay email en BuilderProfileData
        telefonos: builderData.contactInfo.phones.map(phone => ({
            numero: phone.number,
            tipo: phone.type === 'principal' ? 'ambos' as const :
                phone.type === 'whatsapp' ? 'whatsapp' as const : 'llamadas' as const,
            is_active: true
        })),
        direccion: builderData.contactInfo.address,
        google_maps_url: builderData.studio.maps_url
    } : null;

    return (
        <SectionLayout section="inicio" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Home className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Página de Inicio</ZenCardTitle>
                            <ZenCardDescription>
                                Personaliza la presentación principal de tu estudio
                            </ZenCardDescription>
                        </div>
                    </div>
                </ZenCardHeader>
                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-4">
                            <div className="h-8 bg-zinc-800/50 rounded animate-pulse"></div>
                            <div className="h-32 bg-zinc-800/50 rounded animate-pulse"></div>
                            <div className="h-32 bg-zinc-800/50 rounded animate-pulse"></div>
                        </div>
                    ) : (
                        <InicioEditorZen
                            studioSlug={studioSlug}
                            data={inicioData}
                            loading={loading}
                        />
                    )}
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
