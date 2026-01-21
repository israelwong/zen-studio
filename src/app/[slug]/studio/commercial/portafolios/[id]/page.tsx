import React from 'react';
import { unstable_cache } from 'next/cache';
import { getStudioPortfolioById } from '@/lib/actions/studio/portfolios/portfolios.actions';
import { PortfolioEditorClient } from './components/PortfolioEditorClient';

interface EditarPortfolioPageProps {
    params: Promise<{ slug: string; id: string }>;
}

// Helper para convertir BigInt a Number (necesario para serialización JSON en unstable_cache)
function serializePortfolioForCache(portfolio: NonNullable<Awaited<ReturnType<typeof getStudioPortfolioById>>['data']>) {
    return {
        ...portfolio,
        cover_storage_bytes: portfolio.cover_storage_bytes ? Number(portfolio.cover_storage_bytes) : null,
        media: portfolio.media?.map(item => ({
            ...item,
            storage_bytes: Number(item.storage_bytes),
        })),
        content_blocks: portfolio.content_blocks?.map(block => ({
            ...block,
            block_media: block.block_media?.map(bm => ({
                ...bm,
                media: {
                    ...bm.media,
                    storage_bytes: Number(bm.media.storage_bytes),
                },
            })),
        })),
    };
}

export default async function EditarPortfolioPage({ params }: EditarPortfolioPageProps) {
    const { slug: studioSlug, id: portfolioId } = await params;

    // Cachear portfolio con tag para invalidación selectiva
    // ⚠️ CRÍTICO: Tag incluye portfolioId para invalidación granular
    // ⚠️ CRÍTICO: Serializar BigInt a Number antes de cachear
    const getCachedPortfolio = unstable_cache(
        async () => {
            const result = await getStudioPortfolioById(portfolioId);
            if (result.success && result.data) {
                return {
                    ...result,
                    data: serializePortfolioForCache(result.data),
                };
            }
            return result;
        },
        ['portfolio', portfolioId], // ✅ portfolioId en keys
        {
            tags: [`portfolio-${portfolioId}`], // ✅ Incluye portfolioId en tags
            revalidate: false, // No cachear por tiempo, solo por tags
        }
    );

    const portfolioResult = await getCachedPortfolio();

    if (!portfolioResult.success || !portfolioResult.data) {
        return (
            <div className="w-full max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <p className="text-red-400">
                        {portfolioResult.error || 'Portafolio no encontrado'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <PortfolioEditorClient
            studioSlug={studioSlug}
            portfolioId={portfolioId}
            initialPortfolio={portfolioResult.data}
        />
    );
}
