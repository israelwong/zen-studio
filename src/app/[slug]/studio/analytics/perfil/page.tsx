import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getStudioProfileBySlug } from '@/lib/actions/public/profile.actions';
import { getStudioAnalyticsSummary, getTopContent } from '@/lib/actions/studio/analytics/analytics-dashboard.actions';
import { AnalyticsSkeleton } from '../components';
import { PerfilAnalyticsClient } from './components/PerfilAnalyticsClient';

export const metadata: Metadata = {
    title: 'Analytics - Perfil de Negocio',
    description: 'Estadísticas del perfil público y contenido',
};

interface PerfilAnalyticsPageProps {
    params: Promise<{
        slug: string;
    }>;
}

async function PerfilAnalyticsContent({ studioSlug }: { studioSlug: string }) {
    console.log('[PerfilAnalyticsContent] 🚀 Iniciando carga para studioSlug:', studioSlug);
    try {
        // Obtener studio profile
        console.log('[PerfilAnalyticsContent] 📋 Obteniendo studio profile...');
        const result = await getStudioProfileBySlug({ slug: studioSlug });
        console.log('[PerfilAnalyticsContent] ✅ Studio profile obtenido:', {
            success: result.success,
            hasData: !!result.data,
            studioId: result.data?.studio?.id,
        });

        if (!result.success || !result.data) {
            console.error('[PerfilAnalyticsContent] ❌ Error al obtener studio:', {
                success: result.success,
                error: result.success === false ? result.error : 'No data',
            });
            return (
                <div className="text-center py-12">
                    <p className="text-zinc-400">Error al cargar el studio</p>
                    <p className="text-xs text-zinc-500 mt-2">
                        {result.success === false ? result.error : 'No data'}
                    </p>
                </div>
            );
        }

        const studio = result.data.studio;
        console.log('[PerfilAnalyticsContent] 🎯 Studio ID:', studio.id);

        // Obtener datos de analytics con manejo de errores individual
        let summaryResult;
        let topContentResult;

        console.log('[PerfilAnalyticsContent] 📊 Iniciando carga de analytics...');
        try {
            const startTime = Date.now();
            [summaryResult, topContentResult] = await Promise.all([
                getStudioAnalyticsSummary(studio.id),
                getTopContent(studio.id, 5),
            ]);
            const duration = Date.now() - startTime;
            console.log('[PerfilAnalyticsContent] ⏱️ Analytics cargados en', duration, 'ms');
            console.log('[PerfilAnalyticsContent] 📊 Resultados:', {
                summarySuccess: summaryResult.success,
                summaryHasData: !!summaryResult.data,
                topContentSuccess: topContentResult.success,
                topContentHasData: !!topContentResult.data,
            });
        } catch (error) {
            console.error('[PerfilAnalyticsContent] ❌ Error en Promise.all:', error);
            return (
                <div className="text-center py-12">
                    <p className="text-zinc-400">Error al cargar analytics</p>
                    <p className="text-xs text-zinc-500 mt-2">
                        {error instanceof Error ? error.message : 'Error desconocido'}
                    </p>
                </div>
            );
        }

        // Validar resultados individualmente con mensajes específicos
        if (!summaryResult.success) {
            console.error('[PerfilAnalyticsContent] ❌ Error en summaryResult:', summaryResult.error);
            return (
                <div className="text-center py-12">
                    <p className="text-zinc-400">Error al cargar resumen de analytics</p>
                    <p className="text-xs text-zinc-500 mt-2">
                        {summaryResult.error || 'Error desconocido'}
                    </p>
                </div>
            );
        }

        if (!topContentResult.success) {
            console.error('[PerfilAnalyticsContent] ❌ Error en topContentResult:', topContentResult.error);
            return (
                <div className="text-center py-12">
                    <p className="text-zinc-400">Error al cargar contenido destacado</p>
                    <p className="text-xs text-zinc-500 mt-2">
                        {topContentResult.error || 'Error desconocido'}
                    </p>
                </div>
            );
        }

        // Validar que data existe
        if (!summaryResult.data) {
            console.error('[PerfilAnalyticsContent] ❌ summaryResult.data es null/undefined');
            return (
                <div className="text-center py-12">
                    <p className="text-zinc-400">No hay datos de resumen disponibles</p>
                </div>
            );
        }

        if (!topContentResult.data) {
            console.error('[PerfilAnalyticsContent] ❌ topContentResult.data es null/undefined');
            return (
                <div className="text-center py-12">
                    <p className="text-zinc-400">No hay datos de contenido disponibles</p>
                </div>
            );
        }

        console.log('[PerfilAnalyticsContent] 📦 Estructura de datos:', {
            summaryProfile: !!summaryResult.data.profile,
            summaryPosts: !!summaryResult.data.posts,
            summaryPortfolios: !!summaryResult.data.portfolios,
            summaryOffers: !!summaryResult.data.offers,
            topContentPosts: topContentResult.data.posts?.length || 0,
        });

        // Validar que los datos sean serializables antes de pasarlos al cliente
        console.log('[PerfilAnalyticsContent] 🔍 Validando serialización...');
        try {
            // Intentar serializar los datos para detectar problemas
            const summaryJson = JSON.stringify(summaryResult.data);
            const topContentJson = JSON.stringify(topContentResult.data);
            console.log('[PerfilAnalyticsContent] ✅ Serialización exitosa:', {
                summarySize: summaryJson.length,
                topContentSize: topContentJson.length,
            });
        } catch (serializationError) {
            console.error('[PerfilAnalyticsContent] ❌ Error de serialización:', serializationError);
            return (
                <div className="text-center py-12">
                    <p className="text-zinc-400">Error al preparar datos para visualización</p>
                    <p className="text-xs text-zinc-500 mt-2">
                        {serializationError instanceof Error ? serializationError.message : 'Error de serialización'}
                    </p>
                </div>
            );
        }

        console.log('[PerfilAnalyticsContent] 🎨 Renderizando PerfilAnalyticsClient');
        return (
            <PerfilAnalyticsClient
                studioId={studio.id}
                studioSlug={studioSlug}
                initialSummaryData={summaryResult.data}
                initialTopContentData={topContentResult.data}
            />
        );
    } catch (error) {
        console.error('[PerfilAnalyticsContent] ❌ Error inesperado:', error);
        console.error('[PerfilAnalyticsContent] Stack:', error instanceof Error ? error.stack : 'No stack');
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error inesperado al cargar la página</p>
                <p className="text-xs text-zinc-500 mt-2">
                    {error instanceof Error ? error.message : 'Error desconocido'}
                </p>
            </div>
        );
    }
}

export default async function PerfilAnalyticsPage({ params }: PerfilAnalyticsPageProps) {
    const { slug } = await params;
    console.log('[PerfilAnalyticsPage] 📄 Página renderizada para slug:', slug);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Content */}
            <Suspense fallback={<AnalyticsSkeleton />}>
                <PerfilAnalyticsContent studioSlug={slug} />
            </Suspense>
        </div>
    );
}
