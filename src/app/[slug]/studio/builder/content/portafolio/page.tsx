'use client';

import React, { useEffect, useState } from 'react';
import { PortafolioEditorZen } from './components/PortafolioEditorZen';
import { SectionLayout } from '../../components';
import { useParams } from 'next/navigation';
import { getBuilderProfileData } from '@/lib/actions/studio/builder/builder-profile.actions';
import { PortafolioData } from './types';
import { BuilderProfileData } from '@/types/builder-profile';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { ImageIcon } from 'lucide-react';

export default function PortafolioPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [builderData, setBuilderData] = useState<BuilderProfileData | null>(null);
    const [portafolioData, setPortafolioData] = useState<PortafolioData | null>(null);

    // Cargar datos del builder
    useEffect(() => {
        const loadBuilderData = async () => {
            try {
                setLoading(true);
                const result = await getBuilderProfileData(studioSlug);

                if (result.success && result.data) {
                    setBuilderData(result.data);

                    // Transformar datos para el editor de portafolio
                    const transformedData: PortafolioData = {
                        portfolios: result.data.portfolios.map(portfolio => ({
                            id: portfolio.id,
                            title: portfolio.title,
                            description: portfolio.description,
                            cover_image_url: portfolio.cover_image_url,
                            category: portfolio.category,
                            order: portfolio.order,
                            items: portfolio.items.map(item => ({
                                id: item.id,
                                title: item.title,
                                description: item.description,
                                image_url: item.image_url,
                                video_url: item.video_url,
                                item_type: item.item_type,
                                order: item.order,
                            }))
                        }))
                    };

                    setPortafolioData(transformedData);
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
        // Para ProfileContent (sección portafolio)
        studio: builderData.studio,
        portfolios: builderData.portfolios,
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
        <SectionLayout section="portafolio" studioSlug={studioSlug} data={previewData as unknown as Record<string, unknown>} loading={loading}>
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                            <ImageIcon className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <ZenCardTitle>Portafolio</ZenCardTitle>
                            <ZenCardDescription>
                                Gestiona tus proyectos y trabajos destacados
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
                        <PortafolioEditorZen
                            studioSlug={studioSlug}
                            data={portafolioData}
                            loading={loading}
                        />
                    )}
                </ZenCardContent>
            </ZenCard>
        </SectionLayout>
    );
}
