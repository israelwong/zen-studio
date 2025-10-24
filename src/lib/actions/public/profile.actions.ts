"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import {
    GetStudioProfileInputSchema,
    GetStudioProfileOutputSchema,
    type GetStudioProfileInputForm,
    type GetStudioProfileOutputForm
} from "@/lib/actions/schemas/public-profile-schemas";
import {
    PublicProfileData,
    PublicStudioProfile,
    PublicSocialNetwork,
    PublicContactInfo,
    PublicCatalogItem,
    PublicPortfolio,
    PublicPaquete
} from "@/types/public-profile";

/**
 * Get complete public studio profile by slug
 * Fetches all data needed for public profile display
 */
export async function getStudioProfileBySlug(
    input: GetStudioProfileInputForm
): Promise<GetStudioProfileOutputForm> {
    try {
        // Validate input
        const validatedInput = GetStudioProfileInputSchema.parse(input);
        const { slug } = validatedInput;

        console.log('🔍 [getStudioProfileBySlug] Fetching profile for slug:', slug);

        return await retryDatabaseOperation(async () => {
            // Single query to get all profile data
            const studio = await prisma.studios.findUnique({
                where: {
                    slug,
                    is_active: true
                },
                select: {
                    id: true,
                    studio_name: true,
                    description: true,
                    keywords: true,
                    logo_url: true,
                    slogan: true,
                    website: true,
                    address: true,
                    plan_id: true,
                    social_networks: {
                        where: { is_active: true },
                        include: {
                            platform: {
                                select: {
                                    id: true,
                                    name: true,
                                    icon: true,
                                }
                            }
                        },
                        orderBy: { order: 'asc' }
                    },
                    phones: {
                        where: { is_active: true },
                        select: {
                            id: true,
                            number: true,
                            type: true,
                        },
                        orderBy: { order: 'asc' }
                    },
                    business_hours: {
                        select: {
                            id: true,
                            day_of_week: true,
                            start_time: true,
                            end_time: true,
                            is_active: true,
                        },
                        orderBy: { order: 'asc' }
                    },
                    items: {
                        where: { status: 'active' },
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            cost: true,
                            order: true,
                        },
                        take: 50,
                        orderBy: { order: 'asc' }
                    },
                    portfolios: {
                        where: { is_published: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            description: true,
                            cover_image_url: true,
                            category: true,
                            order: true,
                            items: {
                                select: {
                                    id: true,
                                    title: true,
                                    description: true,
                                    image_url: true,
                                    video_url: true,
                                    item_type: true,
                                    order: true,
                                },
                                orderBy: { order: 'asc' }
                            }
                        },
                        orderBy: { order: 'asc' }
                    },
                    plan: {
                        select: {
                            name: true,
                            slug: true,
                        }
                    },
                    zonas_trabajo: {
                        select: {
                            id: true,
                            nombre: true,
                            orden: true,
                        },
                        orderBy: { orden: 'asc' }
                    }
                }
            });

            if (!studio) {
                console.log('❌ [getStudioProfileBySlug] Studio not found:', slug);
                return {
                    success: false,
                    error: 'Studio not found'
                };
            }

            // Debug: Verificar zonas de trabajo en la query
            console.log('🔍 getStudioProfileBySlug Debug:');
            console.log('  - studio.zonas_trabajo from DB:', studio.zonas_trabajo);
            console.log('  - studio.zonas_trabajo length:', studio.zonas_trabajo?.length);
            console.log('  - studio.zonas_trabajo type:', typeof studio.zonas_trabajo);
            console.log('  - studio.zonas_trabajo is array:', Array.isArray(studio.zonas_trabajo));
            console.log('  - studio.id:', studio.id);
            console.log('  - studio.studio_name:', studio.studio_name);
            console.log('  - Full studio object keys:', Object.keys(studio));

            // Transform data to match our types
            const studioProfile: PublicStudioProfile = {
                id: studio.id,
                studio_name: studio.studio_name,
                description: studio.description,
                keywords: studio.keywords,
                logo_url: studio.logo_url,
                slogan: studio.slogan,
                website: studio.website,
                address: studio.address,
                plan_id: studio.plan_id,
                plan: studio.plan,
                zonas_trabajo: studio.zonas_trabajo,
            };

            const socialNetworks: PublicSocialNetwork[] = studio.social_networks.map(network => ({
                id: network.id,
                url: network.url,
                platform: network.platform,
                order: network.order,
            }));

            // Debug: Verificar business_hours
            console.log('🔍 [getStudioProfileBySlug] Debug business_hours:');
            console.log('  - studio.business_hours:', studio.business_hours);
            console.log('  - studio.business_hours length:', studio.business_hours?.length);
            console.log('  - studio.business_hours type:', typeof studio.business_hours);
            console.log('  - studio.business_hours is array:', Array.isArray(studio.business_hours));

            const contactInfo: PublicContactInfo = {
                phones: studio.phones.map(phone => ({
                    id: phone.id,
                    number: phone.number,
                    type: phone.type,
                })),
                address: studio.address,
                website: studio.website,
                google_maps_url: null, // TODO: Add google_maps_url field to database schema
                horarios: studio.business_hours?.map(horario => ({
                    id: horario.id,
                    dia: horario.day_of_week,
                    apertura: horario.start_time,
                    cierre: horario.end_time,
                    cerrado: !horario.is_active,
                })) || [],
            };

            // Debug: Verificar horarios mapeados
            console.log('🔍 [getStudioProfileBySlug] Debug horarios mapeados:');
            console.log('  - contactInfo.horarios:', contactInfo.horarios);
            console.log('  - contactInfo.horarios length:', contactInfo.horarios?.length);
            console.log('  - contactInfo.horarios type:', typeof contactInfo.horarios);
            console.log('  - contactInfo.horarios is array:', Array.isArray(contactInfo.horarios));

            const items: PublicCatalogItem[] = studio.items.map(item => ({
                id: item.id,
                name: item.name,
                type: item.type as 'PRODUCTO' | 'SERVICIO',
                cost: item.cost,
                order: item.order,
            }));

            const portfolios: PublicPortfolio[] = studio.portfolios.map(portfolio => ({
                id: portfolio.id,
                title: portfolio.title,
                slug: portfolio.slug,
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
                    item_type: item.item_type as 'PHOTO' | 'VIDEO',
                    order: item.order,
                })),
            }));

            // Obtener paquetes del estudio
            const paquetes = await prisma.studio_paquetes.findMany({
                where: {
                    studio_id: studio.id,
                    status: "active",
                },
                include: {
                    event_types: {
                        select: {
                            name: true,
                        },
                    },
                },
                orderBy: { order: "asc" },
            });

            const publicPaquetes: PublicPaquete[] = paquetes.map(paquete => ({
                id: paquete.id,
                nombre: paquete.nombre,
                descripcion: paquete.descripcion || undefined,
                precio: paquete.precio,
                tipo_evento: paquete.event_types?.name || undefined,
                duracion_horas: paquete.duracion_horas || undefined,
                incluye: paquete.incluye || undefined,
                no_incluye: paquete.no_incluye || undefined,
                condiciones: paquete.condiciones || undefined,
                order: paquete.order,
            }));

            const profileData: PublicProfileData = {
                studio: studioProfile,
                socialNetworks,
                contactInfo,
                items,
                portfolios,
                paquetes: publicPaquetes,
            };

            console.log('✅ [getStudioProfileBySlug] Profile data fetched successfully');
            console.log('📊 [getStudioProfileBySlug] Data summary:', {
                studio: studioProfile.studio_name,
                socialNetworks: socialNetworks.length,
                phones: contactInfo.phones.length,
                items: items.length,
                portfolios: portfolios.length,
                zonas_trabajo: studioProfile.zonas_trabajo?.length || 0,
            });
            console.log('🔍 Final studioProfile.zonas_trabajo:', studioProfile.zonas_trabajo);
            console.log('🔍 Final studioProfile.zonas_trabajo type:', typeof studioProfile.zonas_trabajo);
            console.log('🔍 Final studioProfile.zonas_trabajo is array:', Array.isArray(studioProfile.zonas_trabajo));

            return {
                success: true,
                data: profileData,
            };
        });

    } catch (error) {
        console.error('❌ [getStudioProfileBySlug] Error:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred while fetching profile data',
        };
    }
}

