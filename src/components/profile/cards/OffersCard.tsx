'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
}

interface OffersCardProps {
    offers: PublicOffer[];
    studioSlug: string;
}

/**
 * OffersCard - Card de ofertas activas para sidebar
 * Muestra ofertas públicas activas del estudio
 */
export function OffersCard({ offers, studioSlug }: OffersCardProps) {
    // No mostrar card si no hay ofertas
    if (!offers || offers.length === 0) {
        return null;
    }

    // Mostrar máximo 3 ofertas
    const displayOffers = offers.slice(0, 3);

    return (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h3 className="text-base font-semibold text-zinc-100">
                        Ofertas Especiales
                    </h3>
                </div>
                {offers.length > 1 && (
                    <span className="text-xs text-zinc-400">
                        {offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="space-y-3">
                {displayOffers.map((offer) => (
                    <a
                        key={offer.id}
                        href={`/${studioSlug}/offer/${offer.slug}`}
                        className="block"
                    >
                        <div className="bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800/50 backdrop-blur-sm hover:border-purple-500/30 transition-all group">
                            {/* Cover Media */}
                            <div className="relative w-full bg-zinc-800 aspect-[4/3]">
                                {offer.cover_media_url ? (
                                    offer.cover_media_type === 'video' ? (
                                        <video
                                            src={offer.cover_media_url}
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <img
                                            src={offer.cover_media_url}
                                            alt={offer.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                        <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 border-t border-zinc-800/50">
                                <p className="text-sm font-medium text-zinc-300 group-hover:text-purple-400 transition-colors">
                                    {offer.name}
                                </p>
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            {/* View all link */}
            {offers.length > 3 && (
                <button
                    onClick={() => window.location.href = `/${studioSlug}#ofertas`}
                    className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors py-2 border-t border-zinc-800/50"
                >
                    Ver todas las ofertas
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
