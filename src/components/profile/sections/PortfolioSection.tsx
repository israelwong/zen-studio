import React from 'react';
import { PublicPortfolio } from '@/types/public-profile';
import { PortfolioFeedCardWithTracking } from './PortfolioFeedCardWithTracking';
import { PortfolioFeedCard } from './PortfolioFeedCard';
import { Image as ImageIcon } from 'lucide-react';

interface PortfolioSectionProps {
    portfolios: PublicPortfolio[];
    onPortfolioClick?: (portfolioSlug: string) => void;
    studioId?: string;
    ownerUserId?: string | null;
}

/**
 * PortfolioSection - Sección específica de portafolio
 * Usa PortfolioFeedCard para consistencia con posts
 * Con tracking si studioId está disponible
 */
export function PortfolioSection({ portfolios, onPortfolioClick, studioId, ownerUserId }: PortfolioSectionProps) {
    if (portfolios.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Portafolio vacío
                </h3>
                <p className="text-sm text-zinc-500">
                    Aún no hay portafolios disponibles
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Portfolios Fullwidth */}
            <div className="space-y-6">
                {portfolios.map((portfolio) => {
                    // Si tenemos studioId, usar versión con tracking
                    if (studioId) {
                        return (
                            <PortfolioFeedCardWithTracking
                                key={portfolio.id}
                                portfolio={portfolio}
                                studioId={studioId}
                                ownerUserId={ownerUserId}
                                onPortfolioClick={onPortfolioClick}
                            />
                        );
                    }

                    // Sin studioId, usar card básico
                    return (
                        <PortfolioFeedCard
                            key={portfolio.id}
                            portfolio={portfolio}
                            onPortfolioClick={onPortfolioClick}
                        />
                    );
                })}
            </div>
        </div>
    );
}
