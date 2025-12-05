import React, { Suspense } from 'react';
import { getStudioBySlug } from '@/lib/actions/studio/business/identity/identity.actions';
import { getStudioAnalyticsSummary, getTopContent } from './actions/analytics-dashboard.actions';
import { AnalyticsOverviewCards, TopContentList, AnalyticsSkeleton } from './components';
import { BarChart3 } from 'lucide-react';

interface AnalyticsPageProps {
    params: {
        slug: string;
    };
}

async function AnalyticsContent({ studioSlug }: { studioSlug: string }) {
    // Obtener studio ID
    const studioResult = await getStudioBySlug(studioSlug);
    
    if (!studioResult.success || !studioResult.data) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar el studio</p>
            </div>
        );
    }

    const studioId = studioResult.data.id;

    // Obtener datos de analytics
    const [summaryResult, topContentResult] = await Promise.all([
        getStudioAnalyticsSummary(studioId),
        getTopContent(studioId, 10)
    ]);

    if (!summaryResult.success || !topContentResult.success) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400">Error al cargar analytics</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <AnalyticsOverviewCards data={summaryResult.data} />

            {/* Top Content */}
            <TopContentList 
                posts={topContentResult.data.posts}
                studioSlug={studioSlug}
            />
        </div>
    );
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
    const { slug } = params;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                    <h1 className="text-2xl font-bold text-white">
                        Analytics Dashboard
                    </h1>
                </div>
                <p className="text-sm text-zinc-400">
                    Estadísticas de tu perfil público y contenido
                </p>
            </div>

            {/* Content */}
            <Suspense fallback={<AnalyticsSkeleton />}>
                <AnalyticsContent studioSlug={slug} />
            </Suspense>
        </div>
    );
}
