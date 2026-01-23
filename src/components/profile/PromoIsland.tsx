'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { OfferCard } from './cards/OfferCard';

interface PublicOffer {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    cover_media_url: string | null;
    cover_media_type: "image" | "video" | null;
    discount_percentage?: number | null;
    is_permanent?: boolean;
    has_date_range?: boolean;
    start_date?: string | null;
    valid_until?: string | null;
    event_type_name?: string | null;
    banner_destination?: "LEADFORM_ONLY" | "LANDING_THEN_LEADFORM" | "LEADFORM_WITH_LANDING";
}

interface PromoIslandProps {
    offers: PublicOffer[];
    studioSlug: string;
    studioId: string;
    ownerUserId?: string | null;
}

/**
 * PromoIsland - Isla de ofertas flotante con carrusel swipeable
 * Posicionada fixed bottom-24, con scroll horizontal nativo
 */
export function PromoIsland({ offers, studioSlug, studioId, ownerUserId }: PromoIslandProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const cardWidthRef = useRef<number>(0);

    useEffect(() => {
        if (!offers || offers.length === 0) {
            console.log('[PromoIsland] No offers available');
            return;
        }

        // Debug: Log de ofertas recibidas
        console.log(`[PromoIsland] Received ${offers.length} offers:`, offers.map(o => ({ id: o.id, name: o.name })));

        // Limpiar sessionStorage si existe (para que se muestre de nuevo)
        const sessionKey = `promo-island-closed-${studioId}`;
        if (sessionStorage.getItem(sessionKey) === 'true') {
            sessionStorage.removeItem(sessionKey);
        }

        // Mostrar siempre si hay ofertas
        setIsVisible(true);

        // Calcular ancho de cada card
        if (scrollRef.current) {
            const container = scrollRef.current;
            const cardWidth = container.offsetWidth;
            cardWidthRef.current = cardWidth;
            container.scrollLeft = 0;
            setCurrentIndex(0);
        }
    }, [offers, studioId]);

    // Detectar cambio de scroll para actualizar índice
    useEffect(() => {
        const container = scrollRef.current;
        if (!container || offers.length <= 1) return;

        const handleScroll = () => {
            const scrollLeft = container.scrollLeft;
            const firstCard = container.querySelector('div[data-offer-card]') as HTMLElement;
            
            if (!firstCard) return;

            const cardWidth = firstCard.offsetWidth;
            const gap = 12; // gap-3 = 12px
            const cardWithGap = cardWidth + gap;
            
            // Calcular índice: redondear al card más cercano basado en scrollLeft
            // Usar Math.round para que cambie cuando se pasa el 50% del card
            const rawIndex = scrollLeft / cardWithGap;
            const newIndex = Math.round(rawIndex);
            const clampedIndex = Math.max(0, Math.min(newIndex, offers.length - 1));
            
            setCurrentIndex(clampedIndex);
        };

        // Inicializar índice después de que el DOM esté listo
        const initTimer = setTimeout(() => {
            handleScroll();
        }, 100);

        container.addEventListener('scroll', handleScroll, { passive: true });
        
        // También escuchar cambios de tamaño
        const resizeObserver = new ResizeObserver(() => {
            handleScroll();
        });
        
        if (container) {
            resizeObserver.observe(container);
        }
        
        return () => {
            clearTimeout(initTimer);
            container.removeEventListener('scroll', handleScroll);
            resizeObserver.disconnect();
        };
    }, [offers.length]);

    const scrollToIndex = (index: number) => {
        const container = scrollRef.current;
        if (!container) return;

        const firstCard = container.querySelector('div[data-offer-card]') as HTMLElement;
        if (!firstCard) return;

        const cardWidth = firstCard.offsetWidth;
        const gap = 12; // gap-3 = 12px
        const targetScroll = index * (cardWidth + gap);

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });

        // Actualizar índice inmediatamente para feedback visual
        setCurrentIndex(index);
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            scrollToIndex(currentIndex - 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < offers.length - 1) {
            scrollToIndex(currentIndex + 1);
        }
    };

    const handleClose = () => {
        startTransition(() => {
            setIsVisible(false);
            // No guardar en sessionStorage - permitir que se muestre de nuevo al recargar
        });
    };

    if (!isVisible || !offers || offers.length === 0) {
        return null;
    }

    const hasMultipleOffers = offers.length > 1;

    return (
        <div
            className="fixed left-4 right-4 z-40 lg:hidden pointer-events-none"
            style={{ bottom: 'calc(var(--vabar-height, 80px))' }}
        >
            <div className="relative pointer-events-auto">
                {/* Botón cerrar - Esquina superior derecha superpuesto */}
                <button
                    onClick={handleClose}
                    className="absolute -top-2 -right-2 z-50 p-1.5 rounded-full text-zinc-300 hover:text-zinc-100 bg-zinc-900/90 hover:bg-zinc-800/95 backdrop-blur-sm transition-colors shadow-lg pointer-events-auto"
                    aria-label="Cerrar ofertas"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Carrusel swipeable - Mostrar todas las ofertas */}
                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth relative"
                >
                    {offers.map((offer, index) => (
                        <div
                            key={offer.id}
                            data-offer-card
                            className="shrink-0 w-[calc(100vw-2rem)] snap-start snap-always"
                        >
                            <OfferCard
                                offer={offer}
                                studioId={studioId}
                                studioSlug={studioSlug}
                                ownerUserId={ownerUserId}
                                variant="compact"
                            />
                        </div>
                    ))}
                </div>

                {/* Botones de navegación - Ambos a la derecha, uno arriba del otro */}
                {hasMultipleOffers && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-1.5 pointer-events-none">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNext();
                            }}
                            disabled={currentIndex >= offers.length - 1}
                            className="p-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800/95 backdrop-blur-sm transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                            style={{
                                pointerEvents: currentIndex >= offers.length - 1 ? 'none' : 'auto',
                            }}
                            aria-label="Siguiente oferta"
                        >
                            <ChevronRight className="h-3 w-3 text-zinc-300" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePrev();
                            }}
                            disabled={currentIndex <= 0}
                            className="p-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800/95 backdrop-blur-sm transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
                            style={{
                                pointerEvents: currentIndex <= 0 ? 'none' : 'auto',
                            }}
                            aria-label="Oferta anterior"
                        >
                            <ChevronLeft className="h-3 w-3 text-zinc-300" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
