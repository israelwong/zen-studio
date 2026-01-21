'use client';

import React, { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Plus } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardDescription,
    ZenButton,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { TipoEventoManagementModal } from '@/components/shared/tipos-evento';
import {
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
} from '@dnd-kit/sortable';
import { deleteOffer, duplicateOffer, reorderOffers, updateOffer, archiveOffer } from '@/lib/actions/studio/offers/offers.actions';
import { getOfferStats } from '@/lib/actions/studio/offers/offer-stats.actions';
import type { StudioOffer } from '@/types/offers';
import { toast } from 'sonner';
import { OffersTable } from './OffersTable';

interface OfferStats {
    total_visits: number;
    total_leadform_visits: number;
    total_submissions: number;
    conversion_rate: number;
}

interface OfertasClientProps {
    studioSlug: string;
    initialOffers: StudioOffer[];
    initialStats: Record<string, OfferStats>;
}

export function OfertasClient({
    studioSlug,
    initialOffers,
    initialStats,
}: OfertasClientProps) {
    const router = useRouter();
    const [offers, setOffers] = useState<StudioOffer[]>(initialOffers);
    const [stats, setStats] = useState<Record<string, OfferStats>>(initialStats);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [duplicatingOfferId, setDuplicatingOfferId] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const [showEventTypesModal, setShowEventTypesModal] = useState(false);

    // Navegación atómica: prevenir race conditions durante transiciones
    const [isNavigating, setIsNavigating] = useState<string | null>(null);
    const isNavigatingRef = useRef(false);

    usePageTitle('Ofertas');

    // Sincronizar ofertas cuando cambian desde el servidor
    useEffect(() => {
        // Solo sincronizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            setOffers(initialOffers);
        }
    }, [initialOffers]);

    // Sincronizar stats cuando cambian desde el servidor
    useEffect(() => {
        // Solo sincronizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            setStats(initialStats);
        }
    }, [initialStats]);

    const handleDelete = async () => {
        if (!offerToDelete) return;

        setIsDeleting(true);

        const deletedOfferId = offerToDelete;

        try {
            const result = await deleteOffer(deletedOfferId, studioSlug);

            if (result.success) {
                setOffers(prev => prev.filter(o => o.id !== deletedOfferId));
                const prevStats = { ...stats };
                delete prevStats[deletedOfferId];
                setStats(prevStats);

                setShowDeleteModal(false);
                setOfferToDelete(null);
                toast.success('Oferta eliminada exitosamente');
            } else {
                setShowDeleteModal(false);
                setOfferToDelete(null);
                toast.error(result.error || 'Error al eliminar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error eliminando oferta:', error);
            setShowDeleteModal(false);
            setOfferToDelete(null);
            toast.error('Error al eliminar la oferta');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (offerId: string) => {
        // Cerrar overlays globales antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }
        
        // Activar flag de navegación
        setIsNavigating(offerId);
        isNavigatingRef.current = true;

        // Usar startTransition para dar prioridad a la navegación
        startTransition(() => {
            router.push(`/${studioSlug}/studio/commercial/ofertas/${offerId}`);
            
            // Limpiar flag después de un delay
            setTimeout(() => {
                setIsNavigating(null);
                isNavigatingRef.current = false;
            }, 1000);
        });
    };

    const handleDuplicate = async (offerId: string) => {
        // Prevenir duplicación durante navegación
        if (isNavigatingRef.current) {
            return;
        }

        setDuplicatingOfferId(offerId);
        try {
            const result = await duplicateOffer(offerId, studioSlug);

            if (result.success && result.data) {
                // Solo actualizar si NO estamos navegando
                if (!isNavigatingRef.current) {
                    const newOffer = result.data;
                    setOffers(prev => [...prev, newOffer].sort((a, b) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    ));

                    // Cargar stats para la nueva oferta
                    const statsResult = await getOfferStats({
                        offer_id: newOffer.id,
                    });
                    if (statsResult.success && statsResult.data) {
                        setStats(prev => ({
                            ...prev,
                            [newOffer.id]: {
                                total_visits: statsResult.data!.total_landing_visits,
                                total_leadform_visits: statsResult.data!.total_leadform_visits,
                                total_submissions: statsResult.data!.total_submissions,
                                conversion_rate: statsResult.data!.conversion_rate,
                            },
                        }));
                    }
                }

                toast.success('Oferta duplicada exitosamente');
            } else {
                toast.error(result.error || 'Error al duplicar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error duplicando oferta:', error);
            toast.error('Error al duplicar la oferta');
        } finally {
            setDuplicatingOfferId(null);
        }
    };

    const handleDeleteClick = (offerId: string) => {
        setOfferToDelete(offerId);
        setShowDeleteModal(true);
    };

    const handleArchive = async (offerId: string) => {
        // Prevenir archivado durante navegación
        if (isNavigatingRef.current) {
            return;
        }

        const offer = offers.find(o => o.id === offerId);

        const previousIsActive = offer?.is_active;
        // Solo actualizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            setOffers(prev => prev.map(o =>
                o.id === offerId ? { ...o, is_active: false } : o
            ));
        }

        try {
            const result = await archiveOffer(offerId, studioSlug);

            if (result.success) {
                toast.success('Oferta archivada exitosamente');
            } else {
                // Revertir si falla
                if (!isNavigatingRef.current) {
                    setOffers(prev => prev.map(o =>
                        o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
                    ));
                }
                toast.error(result.error || 'Error al archivar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error archivando oferta:', error);
            // Revertir si falla
            if (!isNavigatingRef.current) {
                setOffers(prev => prev.map(o =>
                    o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
                ));
            }
            toast.error('Error al archivar la oferta');
        }
    };

    const handleToggleActive = async (offerId: string, isActive: boolean) => {
        // Prevenir toggle durante navegación
        if (isNavigatingRef.current) {
            return;
        }

        const offer = offers.find(o => o.id === offerId);
        const previousIsActive = offer?.is_active;
        // Solo actualizar si NO estamos navegando
        if (!isNavigatingRef.current) {
            setOffers(prev => prev.map(o =>
                o.id === offerId ? { ...o, is_active: isActive } : o
            ));
        }

        try {
            const result = await updateOffer(offerId, studioSlug, { id: offerId, is_active: isActive });

            if (result.success) {
                toast.success(isActive ? 'Oferta activada' : 'Oferta desactivada');
            } else {
                // Revertir si falla
                if (!isNavigatingRef.current) {
                    setOffers(prev => prev.map(o =>
                        o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
                    ));
                }
                toast.error(result.error || 'Error al actualizar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error actualizando oferta:', error);
            // Revertir si falla
            if (!isNavigatingRef.current) {
                setOffers(prev => prev.map(o =>
                    o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
                ));
            }
            toast.error('Error al actualizar la oferta');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        // Prevenir reordenamiento durante navegación o si ya se está reordenando
        if (isReordering || isNavigatingRef.current || !over || active.id === over.id) {
            return;
        }

        const oldIndex = offers.findIndex((offer) => offer.id === active.id);
        const newIndex = offers.findIndex((offer) => offer.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const newOffers = arrayMove(offers, oldIndex, newIndex);

        try {
            setIsReordering(true);
            setOffers(newOffers);

            const offerIds = newOffers.map((offer) => offer.id);
            const result = await reorderOffers(studioSlug, offerIds);

            if (!result.success) {
                toast.error(result.error || 'Error al reordenar las ofertas');
                // Recargar desde props
                setOffers(initialOffers);
            }
        } catch (error) {
            console.error('[OfertasPage] Error reordenando ofertas:', error);
            toast.error('Error al reordenar las ofertas');
            // Recargar desde props
            setOffers(initialOffers);
        } finally {
            setIsReordering(false);
        }
    };

    const handleCreateNew = () => {
        // Cerrar overlays globales antes de navegar
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('close-overlays'));
        }
        
        // Activar flag de navegación
        setIsNavigating('nuevo');
        isNavigatingRef.current = true;

        // Usar startTransition para dar prioridad a la navegación
        startTransition(() => {
            router.push(`/${studioSlug}/studio/commercial/ofertas/nuevo`);
            
            // Limpiar flag después de un delay
            setTimeout(() => {
                setIsNavigating(null);
                isNavigatingRef.current = false;
            }, 1000);
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto">
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/20 rounded-lg">
                                <Megaphone className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Ofertas Comerciales</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona tus ofertas, landing pages y formularios de captura de leads
                                </ZenCardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ZenButton
                                variant="outline"
                                size="sm"
                                onClick={() => setShowEventTypesModal(true)}
                            >
                                Gestionar tipos de evento
                            </ZenButton>
                            <ZenButton onClick={handleCreateNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nueva Oferta
                            </ZenButton>
                        </div>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    {offers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mb-4">
                                <Megaphone className="h-16 w-16 text-zinc-600 mx-auto" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No hay ofertas creadas
                            </h3>
                            <p className="text-zinc-400 max-w-md mx-auto mb-6">
                                Crea tu primera oferta comercial para comenzar a capturar leads desde tus campañas de marketing.
                            </p>
                            <ZenButton onClick={handleCreateNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Primera Oferta
                            </ZenButton>
                        </div>
                    ) : (
                        <OffersTable
                            offers={offers}
                            stats={stats}
                            studioSlug={studioSlug}
                            onEdit={handleEdit}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDeleteClick}
                            onArchive={handleArchive}
                            onToggleActive={handleToggleActive}
                            onDragEnd={handleDragEnd}
                            duplicatingOfferId={duplicatingOfferId}
                            isReordering={isReordering}
                        />
                    )}
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    if (!isDeleting) {
                        setShowDeleteModal(false);
                        setOfferToDelete(null);
                    }
                }}
                onConfirm={handleDelete}
                title="Eliminar Oferta"
                description="¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer y se eliminarán todas las estadísticas asociadas. Si la oferta tiene promesas asociadas, no podrá ser eliminada."
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
            />

            <TipoEventoManagementModal
                isOpen={showEventTypesModal}
                onClose={() => setShowEventTypesModal(false)}
                studioSlug={studioSlug}
            />
        </div>
    );
}
