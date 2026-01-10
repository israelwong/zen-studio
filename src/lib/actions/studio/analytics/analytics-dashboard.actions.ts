"use server";

import { prisma } from "@/lib/prisma";
import { detectDeviceType, calculateUniqueVisits, calculateRecurrentVisits } from "@/lib/utils/analytics-helpers";
import { getStudioOwnerId, createOwnerExclusionFilter } from "@/lib/utils/analytics-filters";

/**
 * Obtener métricas de conversión de ofertas
 */
export async function getConversionMetrics(studioId: string) {
    try {
        // Límite de tiempo: últimos 90 días
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 90);

        // Obtener todas las ofertas del studio
        const offers = await prisma.studio_offers.findMany({
            where: {
                studio_id: studioId,
                is_active: true,
            },
            select: {
                id: true,
            },
        });

        const offerIds = offers.map(o => o.id);

        if (offerIds.length === 0) {
            return {
                success: true,
                data: {
                    totalSubmissions: 0,
                    totalLandingVisits: 0,
                    totalLeadformVisits: 0,
                    conversionRate: 0,
                    clickThroughRate: 0,
                    totalConversionValue: 0,
                    submissionsByOffer: [],
                },
            };
        }

        // Obtener visitas y submissions en paralelo
        const [landingVisits, leadformVisits, submissions] = await Promise.all([
            prisma.studio_offer_visits.count({
                where: {
                    offer_id: { in: offerIds },
                    visit_type: 'landing',
                    created_at: { gte: dateLimit },
                },
            }),
            prisma.studio_offer_visits.count({
                where: {
                    offer_id: { in: offerIds },
                    visit_type: 'leadform',
                    created_at: { gte: dateLimit },
                },
            }),
            prisma.studio_offer_submissions.findMany({
                where: {
                    offer_id: { in: offerIds },
                    created_at: { gte: dateLimit },
                },
                select: {
                    id: true,
                    offer_id: true,
                    conversion_value: true,
                },
            }),
        ]);

        // Calcular métricas
        const totalSubmissions = submissions.length;
        const totalConversionValue = submissions.reduce((sum, s) => {
            return sum + (s.conversion_value ? Number(s.conversion_value) : 0);
        }, 0);

        const conversionRate = leadformVisits > 0 
            ? (totalSubmissions / leadformVisits) * 100 
            : 0;

        const clickThroughRate = landingVisits > 0
            ? (leadformVisits / landingVisits) * 100
            : 0;

        // Submissions por oferta
        const submissionsByOffer = submissions.reduce((acc, s) => {
            const offerId = s.offer_id;
            if (!acc[offerId]) {
                acc[offerId] = { offerId, count: 0, value: 0 };
            }
            acc[offerId].count++;
            acc[offerId].value += s.conversion_value ? Number(s.conversion_value) : 0;
            return acc;
        }, {} as Record<string, { offerId: string; count: number; value: number }>);

        const topOffers = Object.values(submissionsByOffer)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            success: true,
            data: {
                totalSubmissions,
                totalLandingVisits: landingVisits,
                totalLeadformVisits: leadformVisits,
                conversionRate,
                clickThroughRate,
                totalConversionValue,
                topOffers,
            },
        };
    } catch (error) {
        console.error('[getConversionMetrics] Error:', error);
        return {
            success: false,
            error: 'Error al obtener métricas de conversión',
        };
    }
}

/**
 * Obtener resumen de analytics del studio
 */
export async function getStudioAnalyticsSummary(studioId: string) {
    try {
        // Obtener owner_id y crear filtro de exclusión
        const ownerId = await getStudioOwnerId(studioId);
        const ownerExclusionFilter = await createOwnerExclusionFilter(studioId, ownerId);

        // Límite de tiempo: últimos 90 días para optimizar performance
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 90);

        // Paralelizar queries independientes
        const [postsStats, portfoliosStats, offersStats, profileViewsFull, postClicksData] = await Promise.all([
            // Stats de posts (excluyendo owner)
            prisma.studio_content_analytics.groupBy({
                by: ['event_type'],
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    created_at: { gte: dateLimit },
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),

            // Stats de portfolios (excluyendo owner)
            prisma.studio_content_analytics.groupBy({
                by: ['event_type'],
                where: {
                    studio_id: studioId,
                    content_type: 'PORTFOLIO',
                    created_at: { gte: dateLimit },
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),

            // Stats de ofertas (excluyendo owner)
            prisma.studio_content_analytics.groupBy({
                by: ['event_type'],
                where: {
                    studio_id: studioId,
                    content_type: 'OFFER',
                    created_at: { gte: dateLimit },
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),

            // Stats de perfil público (usando PACKAGE como contentType con metadata.profile_view)
            // Obtener datos completos de visitas al perfil para calcular métricas avanzadas (excluyendo owner)
            // LIMITADO a últimos 90 días y ordenado por fecha descendente para optimizar
            prisma.studio_content_analytics.findMany({
                where: {
                    studio_id: studioId,
                    content_type: 'PACKAGE',
                    content_id: studioId, // El content_id es el mismo studio_id para perfiles
                    event_type: 'PAGE_VIEW',
                    created_at: { gte: dateLimit },
                    ...ownerExclusionFilter,
                },
                select: {
                    id: true,
                    ip_address: true,
                    session_id: true,
                    user_agent: true,
                    referrer: true,
                    utm_source: true,
                    utm_medium: true,
                    utm_campaign: true,
                    metadata: true,
                },
                orderBy: {
                    created_at: 'desc'
                },
                // Limitar a 10,000 registros máximo para evitar timeouts
                take: 10000
            }),

            // Obtener datos completos de posts para calcular clicks totales (MODAL_OPEN + MEDIA_CLICK) (excluyendo owner)
            prisma.studio_content_analytics.findMany({
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    event_type: { in: ['MODAL_OPEN', 'MEDIA_CLICK'] },
                    created_at: { gte: dateLimit },
                    ...ownerExclusionFilter,
                },
                select: {
                    event_type: true,
                }
            })
        ]);

        // Filtrar en memoria los que tienen profile_view: true en metadata
        const profileViewsFiltered = profileViewsFull.filter(item => {
            const metadata = item.metadata as Record<string, unknown> | null;
            return metadata && metadata.profile_view === true;
        });

        // Calcular métricas de perfil
        const profileUniqueVisits = calculateUniqueVisits(profileViewsFiltered);
        const profileRecurrentVisits = calculateRecurrentVisits(profileViewsFiltered);
        
        // Calcular device types
        const profileDeviceTypes = profileViewsFiltered.reduce((acc, item) => {
            const deviceType = detectDeviceType(item.user_agent);
            acc[deviceType] = (acc[deviceType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calcular métricas de origen del tráfico
        const trafficSourceStats = profileViewsFiltered.reduce((acc, item) => {
            const metadata = item.metadata as Record<string, unknown> | null;
            const trafficSource = metadata?.traffic_source as string || 'unknown';
            acc[trafficSource] = (acc[trafficSource] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calcular top referrers (dominios)
        const referrerStats = profileViewsFiltered
            .filter(item => item.referrer)
            .reduce((acc, item) => {
                try {
                    const url = new URL(item.referrer!);
                    const domain = url.hostname.replace('www.', '');
                    acc[domain] = (acc[domain] || 0) + 1;
                } catch {
                    // Si no es URL válida, usar referrer tal cual
                    acc[item.referrer!] = (acc[item.referrer!] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

        // Top referrers ordenados
        const topReferrers = Object.entries(referrerStats)
            .map(([domain, count]) => ({ domain, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calcular métricas UTM
        const utmSourceStats = profileViewsFiltered
            .filter(item => item.utm_source)
            .reduce((acc, item) => {
                acc[item.utm_source!] = (acc[item.utm_source!] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const utmMediumStats = profileViewsFiltered
            .filter(item => item.utm_medium)
            .reduce((acc, item) => {
                acc[item.utm_medium!] = (acc[item.utm_medium!] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        const utmCampaignStats = profileViewsFiltered
            .filter(item => item.utm_campaign)
            .reduce((acc, item) => {
                acc[item.utm_campaign!] = (acc[item.utm_campaign!] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        // Top UTM sources
        const topUtmSources = Object.entries(utmSourceStats)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calcular totales
        const postViews = postsStats.find(s => s.event_type === 'FEED_VIEW')?._count.id || 0;
        const postModalOpens = postClicksData.filter(e => e.event_type === 'MODAL_OPEN').length;
        const postMediaClicks = postClicksData.filter(e => e.event_type === 'MEDIA_CLICK').length;
        const postTotalClicks = postModalOpens + postMediaClicks;
        const postLinkCopies = postsStats.find(s => s.event_type === 'LINK_COPY')?._count.id || 0;

        const portfolioViews = portfoliosStats.find(s => s.event_type === 'FEED_VIEW')?._count.id || 0;

        const offerViews = offersStats.find(s => s.event_type === 'SIDEBAR_VIEW')?._count.id || 0;
        const offerClicks = offersStats.find(s => s.event_type === 'OFFER_CLICK')?._count.id || 0;

        return {
            success: true,
            data: {
                profile: {
                    totalViews: profileViewsFiltered.length,
                    uniqueVisits: profileUniqueVisits.unique,
                    recurrentVisits: profileRecurrentVisits.recurrent,
                    mobileViews: profileDeviceTypes.mobile || 0,
                    desktopViews: profileDeviceTypes.desktop || 0,
                    trafficSources: {
                        profile: trafficSourceStats.profile || 0,
                        external: trafficSourceStats.external || 0,
                        unknown: trafficSourceStats.unknown || 0,
                    },
                    topReferrers: topReferrers,
                    topUtmSources: topUtmSources,
                    utmMediums: utmMediumStats,
                    utmCampaigns: utmCampaignStats,
                },
                posts: {
                    totalViews: postViews,
                    totalClicks: postTotalClicks,
                    modalOpens: postModalOpens,
                    mediaClicks: postMediaClicks,
                    totalShares: postLinkCopies,
                },
                portfolios: {
                    totalViews: portfolioViews,
                },
                offers: {
                    totalViews: offerViews,
                    totalClicks: offerClicks,
                }
            }
        };
    } catch (error) {
        console.error('[getStudioAnalyticsSummary] Error:', error);
        return {
            success: false,
            error: 'Error al obtener resumen de analytics'
        };
    }
}

/**
 * Obtener contenido más visto (posts y portfolios)
 */
export async function getTopContent(studioId: string, limit = 10) {
    try {
        // Obtener owner_id y crear filtro de exclusión
        const ownerId = await getStudioOwnerId(studioId);
        const ownerExclusionFilter = await createOwnerExclusionFilter(studioId, ownerId);

        // Top posts por vistas (excluyendo owner)
        const topPosts = await prisma.studio_content_analytics.groupBy({
            by: ['content_id'],
            where: {
                studio_id: studioId,
                content_type: 'POST',
                event_type: 'FEED_VIEW',
                ...ownerExclusionFilter,
            },
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: limit
        });

        // Obtener detalles de posts
        const postIds = topPosts.map(p => p.content_id);
        const posts = await prisma.studio_posts.findMany({
            where: {
                id: { in: postIds }
            },
            select: {
                id: true,
                slug: true,
                title: true,
                caption: true,
                view_count: true,
                media: {
                    select: {
                        file_url: true,
                        thumbnail_url: true
                    },
                    take: 1,
                    orderBy: {
                        display_order: 'asc'
                    }
                }
            }
        });

        // Obtener clics (MODAL_OPEN + MEDIA_CLICK) y shares (LINK_COPY) por post
        const [clicksData, sharesData] = await Promise.all([
            prisma.studio_content_analytics.groupBy({
                by: ['content_id'],
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    event_type: { in: ['MODAL_OPEN', 'MEDIA_CLICK'] },
                    content_id: { in: postIds },
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            }),
            prisma.studio_content_analytics.groupBy({
                by: ['content_id'],
                where: {
                    studio_id: studioId,
                    content_type: 'POST',
                    event_type: 'LINK_COPY',
                    content_id: { in: postIds },
                    ...ownerExclusionFilter,
                },
                _count: {
                    id: true
                }
            })
        ]);

        // Mapear con conteo de vistas, clics y shares
        const postsWithViews = posts.map(post => {
            const viewCount = topPosts.find(tp => tp.content_id === post.id)?._count.id || 0;
            const clicksCount = clicksData.find(c => c.content_id === post.id)?._count.id || 0;
            const sharesCount = sharesData.find(s => s.content_id === post.id)?._count.id || 0;
            return {
                ...post,
                analyticsViews: viewCount,
                analyticsClicks: clicksCount,
                analyticsShares: sharesCount,
                coverImage: post.media[0]?.thumbnail_url || post.media[0]?.file_url
            };
        }).sort((a, b) => b.analyticsViews - a.analyticsViews);

        return {
            success: true,
            data: {
                posts: postsWithViews
            }
        };
    } catch (error) {
        console.error('[getTopContent] Error:', error);
        return {
            success: false,
            error: 'Error al obtener contenido top'
        };
    }
}

/**
 * Obtener estadísticas de últimos 30 días
 */
export async function getAnalyticsTrends(studioId: string, days = 30) {
    try {
        // Obtener owner_id y crear filtro de exclusión
        const ownerId = await getStudioOwnerId(studioId);
        const ownerExclusionFilter = await createOwnerExclusionFilter(studioId, ownerId);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trends = await prisma.studio_content_analytics.groupBy({
            by: ['content_type', 'event_type'],
            where: {
                studio_id: studioId,
                created_at: {
                    gte: startDate
                },
                ...ownerExclusionFilter,
            },
            _count: {
                id: true
            }
        });

        // Agrupar por tipo de contenido
        const posts = trends
            .filter(t => t.content_type === 'POST')
            .reduce((acc, curr) => {
                acc[curr.event_type] = curr._count.id;
                return acc;
            }, {} as Record<string, number>);

        const portfolios = trends
            .filter(t => t.content_type === 'PORTFOLIO')
            .reduce((acc, curr) => {
                acc[curr.event_type] = curr._count.id;
                return acc;
            }, {} as Record<string, number>);

        const offers = trends
            .filter(t => t.content_type === 'OFFER')
            .reduce((acc, curr) => {
                acc[curr.event_type] = curr._count.id;
                return acc;
            }, {} as Record<string, number>);

        return {
            success: true,
            data: {
                period: `${days} días`,
                posts,
                portfolios,
                offers
            }
        };
    } catch (error) {
        console.error('[getAnalyticsTrends] Error:', error);
        return {
            success: false,
            error: 'Error al obtener tendencias'
        };
    }
}
