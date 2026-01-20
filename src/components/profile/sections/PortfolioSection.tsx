'use client';

'use client';

import React, { useState, useMemo } from 'react';
import { VList } from 'virtua';
import { PublicPortfolio } from '@/types/public-profile';
import { PortfolioFeedCard } from './PortfolioFeedCard';
import { Image as ImageIcon } from 'lucide-react';
import { reorderPortfolios } from '@/lib/actions/studio/portfolios/portfolios.actions';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

interface PortfolioSectionProps {
    portfolios: PublicPortfolio[];
    onPortfolioClick?: (portfolioSlug: string) => void;
    studioId?: string;
    ownerUserId?: string | null;
    currentUserId?: string | null;
    isDesktop?: boolean;
}

/**
 * PortfolioSection - Sección específica de portafolio
 * Usa PortfolioFeedCard para consistencia con posts
 * Con tracking si studioId está disponible
 * Incluye filtros horizontales por tipo de evento
 */
export function PortfolioSection({ portfolios, onPortfolioClick, studioId, ownerUserId, currentUserId, isDesktop = false }: PortfolioSectionProps) {
    const router = useRouter();
    const params = useParams();
    const studioSlug = params?.slug as string;
    const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);

    // Mostrar controles si hay usuario autenticado (misma lógica que PortfolioCardMenu)
    const isOwner = !!currentUserId;

    // Extraer tipos de evento únicos de los portfolios
    const eventTypes = useMemo(() => {
        const types = new Map<string, { id: string; nombre: string; count: number }>();

        portfolios.forEach(portfolio => {
            if (portfolio.event_type) {
                const existing = types.get(portfolio.event_type.id);
                if (existing) {
                    existing.count++;
                } else {
                    types.set(portfolio.event_type.id, {
                        id: portfolio.event_type.id,
                        nombre: portfolio.event_type.nombre,
                        count: 1
                    });
                }
            }
        });

        return Array.from(types.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [portfolios]);

    // Filtrar y ordenar portfolios
    const filteredPortfolios = useMemo(() => {
        let filtered = portfolios;

        // Filtrar por tipo de evento
        if (selectedEventType && selectedEventType !== 'uncategorized') {
            filtered = filtered.filter(p => p.event_type?.id === selectedEventType);
        } else if (selectedEventType === 'uncategorized') {
            filtered = filtered.filter(p => !p.event_type);
        }

        // Ordenar por order
        return [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [portfolios, selectedEventType]);

    // Handlers de ordenamiento
    const handleMoveUp = async (index: number) => {
        if (index === 0 || isReordering) return;

        setIsReordering(true);

        // Crear nuevo array con el elemento movido
        const newOrder = [...filteredPortfolios];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

        // Extraer IDs en el nuevo orden
        const portfolioIds = newOrder.map(p => p.id);

        console.log('[PortfolioSection] Moviendo arriba:', { portfolioIds });

        try {
            const result = await reorderPortfolios(studioSlug, portfolioIds);
            if (result.success) {
                toast.success('Orden actualizado');
                router.refresh();
            } else {
                toast.error(result.error || "Error al reordenar");
            }
        } catch (error) {
            console.error('[PortfolioSection] Error moveUp:', error);
            toast.error("Error al reordenar portfolios");
        } finally {
            setIsReordering(false);
        }
    };

    const handleMoveDown = async (index: number) => {
        if (index === filteredPortfolios.length - 1 || isReordering) return;

        setIsReordering(true);

        // Crear nuevo array con el elemento movido
        const newOrder = [...filteredPortfolios];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

        // Extraer IDs en el nuevo orden
        const portfolioIds = newOrder.map(p => p.id);

        console.log('[PortfolioSection] Moviendo abajo:', { portfolioIds });

        try {
            const result = await reorderPortfolios(studioSlug, portfolioIds);
            if (result.success) {
                toast.success('Orden actualizado');
                router.refresh();
            } else {
                toast.error(result.error || "Error al reordenar");
            }
        } catch (error) {
            console.error('[PortfolioSection] Error moveDown:', error);
            toast.error("Error al reordenar portfolios");
        } finally {
            setIsReordering(false);
        }
    };

    // Contar portfolios sin categoría
    const uncategorizedCount = useMemo(() => {
        return portfolios.filter(p => !p.event_type).length;
    }, [portfolios]);

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

    // Solo mostrar filtros si hay más de un tipo de evento
    const showFilters = eventTypes.length > 0;

    if (filteredPortfolios.length === 0 && selectedEventType) {
        return (
            <div className="p-8 text-center">
                <p className="text-sm text-zinc-500">
                    No hay portfolios en esta categoría
                </p>
            </div>
        );
    }

    return (
        <PortfolioVirtualList
            portfolios={filteredPortfolios}
            onPortfolioClick={onPortfolioClick}
            isOwner={isOwner}
            isReordering={isReordering}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            showFilters={showFilters}
            eventTypes={eventTypes}
            selectedEventType={selectedEventType}
            onEventTypeChange={setSelectedEventType}
            uncategorizedCount={uncategorizedCount}
            totalCount={portfolios.length}
            isDesktop={isDesktop}
        />
    );
}

/**
 * PortfolioVirtualList - Lista virtualizada de portfolios con virtua
 */
function PortfolioVirtualList({
    portfolios,
    onPortfolioClick,
    isOwner,
    isReordering,
    onMoveUp,
    onMoveDown,
    showFilters,
    eventTypes,
    selectedEventType,
    onEventTypeChange,
    uncategorizedCount,
    totalCount,
    isDesktop = false,
}: {
    portfolios: PublicPortfolio[];
    onPortfolioClick?: (portfolioSlug: string) => void;
    isOwner: boolean;
    isReordering: boolean;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    showFilters: boolean;
    eventTypes: Array<{ id: string; nombre: string; count: number }>;
    selectedEventType: string | null;
    onEventTypeChange: (type: string | null) => void;
    uncategorizedCount: number;
    totalCount: number;
    isDesktop?: boolean;
}) {
    return (
        <div className={`w-full ${isDesktop ? 'flex flex-col' : 'h-full overflow-hidden flex flex-col'}`}>
            {/* Filtros integrados dentro del scroll - Sticky en la parte superior */}
            {showFilters && (
                <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/20 px-4 py-3 mb-4 shrink-0">
                    <div className="flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button
                            onClick={() => onEventTypeChange(null)}
                            className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${selectedEventType === null
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Todos ({totalCount})
                        </button>
                        {eventTypes.map(type => (
                            <button
                                key={type.id}
                                onClick={() => onEventTypeChange(type.id)}
                                className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${selectedEventType === type.id
                                    ? 'bg-zinc-700 text-zinc-100'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {type.nombre} ({type.count})
                            </button>
                        ))}
                        {uncategorizedCount > 0 && (
                            <button
                                onClick={() => onEventTypeChange('uncategorized')}
                                className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${selectedEventType === 'uncategorized'
                                    ? 'bg-zinc-700 text-zinc-100'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Sin categoría ({uncategorizedCount})
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* VList - Ocupa el espacio restante (Native Shell) */}
            {isDesktop ? (
                <div className="w-full pb-4 space-y-3">
                    {portfolios.map((portfolio, index) => (
                        <PortfolioFeedCard
                            key={portfolio.id}
                            portfolio={portfolio}
                            onPortfolioClick={onPortfolioClick}
                            isOwner={isOwner}
                            onMoveUp={isOwner ? () => onMoveUp(index) : undefined}
                            onMoveDown={isOwner ? () => onMoveDown(index) : undefined}
                            canMoveUp={index > 0 && !isReordering}
                            canMoveDown={index < portfolios.length - 1 && !isReordering}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex-1 min-h-0 w-full relative overflow-hidden px-4 pb-24 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <VList
                        data={portfolios}
                        itemSize={120}
                        style={{ height: '100%', width: '100%' }}
                    >
                        {(portfolio, index) => (
                            <div className="mb-3" key={portfolio.id}>
                                <PortfolioFeedCard
                                    portfolio={portfolio}
                                    onPortfolioClick={onPortfolioClick}
                                    isOwner={isOwner}
                                    onMoveUp={isOwner ? () => onMoveUp(index) : undefined}
                                    onMoveDown={isOwner ? () => onMoveDown(index) : undefined}
                                    canMoveUp={index > 0 && !isReordering}
                                    canMoveDown={index < portfolios.length - 1 && !isReordering}
                                />
                            </div>
                        )}
                    </VList>
                </div>
            )}
        </div>
    );
}
