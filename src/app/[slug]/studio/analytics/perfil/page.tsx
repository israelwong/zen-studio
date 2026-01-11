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
    // Obtener studio profile
    const result = await getStudioProfileBySlug({ slug: studioSlug });

    if (!result.success || !result.data) {
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

    // Obtener datos de analytics
    const [summaryResult, topContentResult] = await Promise.all([
        getStudioAnalyticsSummary(studio.id),
        getTopContent(studio.id, 5),
    ]);

    if (!summaryResult.success || !topContentResult.success) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar analytics</p>
            </div>
        );
    }

    // Validar que data existe
    if (!summaryResult.data || !topContentResult.data) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar datos de analytics</p>
            </div>
        );
    }

    const analyticsData = summaryResult.data;
    const topContentData = topContentResult.data;

    return (
        <PerfilAnalyticsClient
            studioId={studio.id}
            studioSlug={studioSlug}
            initialSummaryData={analyticsData}
            initialTopContentData={topContentData}
        />
    );
}

export default async function PerfilAnalyticsPage({ params }: PerfilAnalyticsPageProps) {
    const { slug } = await params;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Content */}
            <Suspense fallback={<AnalyticsSkeleton />}>
                <PerfilAnalyticsContent studioSlug={slug} />
            </Suspense>
        </div>
    );
}
