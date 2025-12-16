'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Megaphone, Plus, Copy, Trash2, GripVertical, MoreVertical, Edit, Calendar, Infinity, Percent, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ZenCard,
    ZenCardContent,
    ZenCardHeader,
    ZenCardTitle,
    ZenCardDescription,
    ZenButton,
    ZenBadge,
    ZenConfirmModal,
    ZenSwitch
} from '@/components/ui/zen';
import {
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuSeparator,
} from '@/components/ui/zen/overlays/ZenDropdownMenu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/shadcn/table';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listOffers, deleteOffer, duplicateOffer, reorderOffers, updateOffer } from '@/lib/actions/studio/offers/offers.actions';
import { getOfferStats } from '@/lib/actions/studio/offers/offer-stats.actions';
import type { StudioOffer } from '@/types/offers';
import { toast } from 'sonner';

interface SortableOfferRowProps {
    offer: StudioOffer;
    stats: {
        total_visits: number;
        total_leadform_visits: number;
        total_submissions: number;
        conversion_rate: number;
    };
    studioSlug: string;
    onEdit: (offerId: string) => void;
    onDuplicate: (offerId: string) => void;
    onDelete: (offerId: string) => void;
    onToggleActive: (offerId: string, isActive: boolean) => void;
    isDuplicating: boolean;
}

function SortableOfferRow({
    offer,
    stats,
    studioSlug,
    onEdit,
    onDuplicate,
    onDelete,
    onToggleActive,
    isDuplicating,
}: SortableOfferRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: offer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const noConvertidos = Math.max(0, stats.total_leadform_visits - stats.total_submissions);

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            className="border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors group"
            onClick={() => onEdit(offer.id)}
        >
            <TableCell className="w-8 py-4 sticky left-0 bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800" onClick={(e) => e.stopPropagation()}>
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing flex items-center justify-center"
                >
                    <GripVertical className="h-4 w-4 text-zinc-500" />
                </div>
            </TableCell>
            <TableCell className="text-center py-4 px-4 w-[80px] sticky left-8 bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800" onClick={(e) => e.stopPropagation()}>
                <ZenSwitch
                    checked={offer.is_active}
                    onCheckedChange={(checked) => {
                        onToggleActive(offer.id, checked);
                    }}
                />
            </TableCell>
            <TableCell className="font-medium text-zinc-100 py-4 min-w-[320px] sticky left-[88px] bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        {offer.cover_media_url ? (
                            offer.cover_media_type === 'video' ? (
                                <video
                                    src={offer.cover_media_url}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                />
                            ) : (
                                <Image
                                    src={offer.cover_media_url}
                                    alt={offer.name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                    unoptimized
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                <Megaphone className="h-5 w-5 text-zinc-600" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="truncate">{offer.name}</span>
                        {offer.description ? (
                            <span className="text-xs text-zinc-500 line-clamp-1 truncate">
                                {offer.description}
                            </span>
                        ) : (
                            <span className="text-xs text-zinc-600 italic">
                                Agrega una descripción
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                            {offer.is_permanent ? (
                                <>
                                    <Infinity className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span>Permanente</span>
                                </>
                            ) : (offer.has_date_range || offer.start_date || offer.end_date) && offer.start_date && offer.end_date ? (
                                <>
                                    <Clock className="h-3 w-3 text-blue-400 shrink-0" />
                                    <span className="whitespace-nowrap">
                                        {format(new Date(offer.start_date), 'dd MMM', { locale: es })} - {format(new Date(offer.end_date), 'dd MMM yyyy', { locale: es })}
                                    </span>
                                </>
                            ) : (
                                <span className="text-zinc-600">Sin vigencia</span>
                            )}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="w-[48px] py-4 sticky left-[408px] bg-zinc-800 z-10 group-hover:bg-zinc-900 transition-colors border-r border-zinc-800" onClick={(e) => e.stopPropagation()}>
                <ZenDropdownMenu>
                    <ZenDropdownMenuTrigger asChild>
                        <ZenButton
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </ZenButton>
                    </ZenDropdownMenuTrigger>
                    <ZenDropdownMenuContent align="end">
                        <ZenDropdownMenuItem onClick={() => onEdit(offer.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuItem
                            onClick={() => onDuplicate(offer.id)}
                            disabled={isDuplicating}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuSeparator />
                        <ZenDropdownMenuItem
                            onClick={() => onDelete(offer.id)}
                            className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                        </ZenDropdownMenuItem>
                    </ZenDropdownMenuContent>
                </ZenDropdownMenu>
            </TableCell>
            <TableCell className="text-zinc-300 py-4 px-4 min-w-[180px]">
                <div className="flex flex-col gap-1.5">
                    {offer.business_term?.discount_percentage ? (
                        <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-sm">{offer.business_term.discount_percentage}% desc.</span>
                        </div>
                    ) : null}
                    {(() => {
                        const businessTerm = offer.business_term;
                        if (!businessTerm) return null;
                        const advanceType = businessTerm.advance_type || 'percentage';
                        if (advanceType === 'fixed_amount' && businessTerm.advance_amount) {
                            return (
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-400 shrink-0" />
                                    <span className="text-sm">${businessTerm.advance_amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} anticipo</span>
                                </div>
                            );
                        } else if (advanceType === 'percentage' && businessTerm.advance_percentage) {
                            return (
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-400 shrink-0" />
                                    <span className="text-sm">{businessTerm.advance_percentage}% anticipo</span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                    {!offer.business_term?.discount_percentage && !offer.business_term?.advance_percentage && (
                        <span className="text-sm text-zinc-500">Sin condiciones</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="text-center text-zinc-300 py-4 px-4 w-[100px]">
                <span className="text-base">{stats.total_visits}</span>
            </TableCell>
            <TableCell className="text-center text-zinc-300 py-4 px-4 w-[120px]">
                <span className="text-base">{noConvertidos}</span>
            </TableCell>
            <TableCell className="text-center text-zinc-300 py-4 px-4 w-[120px]">
                <span className="text-base">{stats.total_submissions}</span>
            </TableCell>

        </TableRow>
    );
}

export default function OfertasPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [offers, setOffers] = useState<StudioOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [duplicatingOfferId, setDuplicatingOfferId] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const [stats, setStats] = useState<Record<string, {
        total_visits: number;
        total_leadform_visits: number;
        total_submissions: number;
        conversion_rate: number;
    }>>({});

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadOffers();
    }, [studioSlug]);

    const loadOffers = async () => {
        try {
            setLoading(true);
            const result = await listOffers(studioSlug, { include_inactive: true });

            if (result.success && result.data) {
                setOffers(result.data);

                // Cargar estadísticas para cada oferta
                const statsPromises = result.data.map(async (offer) => {
                    const statsResult = await getOfferStats({
                        offer_id: offer.id,
                    });

                    if (statsResult.success && statsResult.data) {
                        return {
                            offerId: offer.id,
                            stats: {
                                total_visits: statsResult.data.total_landing_visits,
                                total_leadform_visits: statsResult.data.total_leadform_visits,
                                total_submissions: statsResult.data.total_submissions,
                                conversion_rate: statsResult.data.conversion_rate,
                            },
                        };
                    }
                    return null;
                });

                const statsResults = await Promise.all(statsPromises);
                const statsMap: Record<string, {
                    total_visits: number;
                    total_leadform_visits: number;
                    total_submissions: number;
                    conversion_rate: number;
                }> = {};

                statsResults.forEach((result) => {
                    if (result) {
                        statsMap[result.offerId] = result.stats;
                    }
                });

                setStats(statsMap);
            } else {
                toast.error(result.error || 'Error al cargar las ofertas');
            }
        } catch (error) {
            console.error('[OfertasPage] Error:', error);
            toast.error('Error al cargar las ofertas');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!offerToDelete) return;

        setIsDeleting(true);

        // Optimistic update: remover del estado local
        const offerToRemove = offers.find(o => o.id === offerToDelete);
        setOffers(prev => prev.filter(o => o.id !== offerToDelete));
        const prevStats = { ...stats };
        delete prevStats[offerToDelete];
        setStats(prevStats);

        setShowDeleteModal(false);
        const deletedOfferId = offerToDelete;
        setOfferToDelete(null);

        try {
            const result = await deleteOffer(deletedOfferId, studioSlug);

            if (result.success) {
                toast.success('Oferta eliminada exitosamente');
            } else {
                // Revertir si falla
                if (offerToRemove) {
                    setOffers(prev => [...prev, offerToRemove].sort((a, b) =>
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    ));
                    setStats(prevStats);
                }
                toast.error(result.error || 'Error al eliminar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error eliminando oferta:', error);
            // Revertir si falla
            if (offerToRemove) {
                setOffers(prev => [...prev, offerToRemove].sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ));
                setStats(prevStats);
            }
            toast.error('Error al eliminar la oferta');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (offerId: string) => {
        router.push(`/${studioSlug}/studio/commercial/ofertas/${offerId}`);
    };

    const handleDuplicate = async (offerId: string) => {
        setDuplicatingOfferId(offerId);
        try {
            const result = await duplicateOffer(offerId, studioSlug);

            if (result.success && result.data) {
                // Optimistic update: agregar al estado local
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

    const handleToggleActive = async (offerId: string, isActive: boolean) => {
        const offer = offers.find(o => o.id === offerId);

        if (isActive && (!offer?.landing_page || !offer.landing_page.content_blocks || offer.landing_page.content_blocks.length === 0)) {
            toast.error('Debes crear una landing page con al menos un bloque antes de activar la oferta');
            return;
        }

        // Optimistic update: actualizar estado local
        const previousIsActive = offer?.is_active;
        setOffers(prev => prev.map(o =>
            o.id === offerId ? { ...o, is_active: isActive } : o
        ));

        try {
            const result = await updateOffer(offerId, studioSlug, { id: offerId, is_active: isActive });

            if (result.success) {
                // Solo actualizar is_active, preservar todos los demás campos (incluyendo vigencia)
                setOffers(prev => prev.map(o =>
                    o.id === offerId ? { ...o, is_active: isActive } : o
                ));
                toast.success(isActive ? 'Oferta activada' : 'Oferta desactivada');
            } else {
                // Revertir si falla
                setOffers(prev => prev.map(o =>
                    o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
                ));
                console.error('[OfertasPage] Error al actualizar oferta:', result.error);
                toast.error(result.error || 'Error al actualizar la oferta');
            }
        } catch (error) {
            console.error('[OfertasPage] Error actualizando oferta:', error);
            // Revertir si falla
            setOffers(prev => prev.map(o =>
                o.id === offerId ? { ...o, is_active: previousIsActive ?? false } : o
            ));
            toast.error('Error al actualizar la oferta');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (isReordering || !over || active.id === over.id) {
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
                await loadOffers();
            }
        } catch (error) {
            console.error('[OfertasPage] Error reordenando ofertas:', error);
            toast.error('Error al reordenar las ofertas');
            await loadOffers();
        } finally {
            setIsReordering(false);
        }
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
                        <ZenButton onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/nuevo`)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Oferta
                        </ZenButton>
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-zinc-800/50 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : offers.length === 0 ? (
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
                            <ZenButton onClick={() => router.push(`/${studioSlug}/studio/commercial/ofertas/nuevo`)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Crear Primera Oferta
                            </ZenButton>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-zinc-800 overflow-hidden relative">
                            <div className="overflow-x-auto">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <Table className="min-w-[1100px]">
                                        <TableHeader>
                                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                                <TableHead className="text-zinc-400 font-medium w-8 py-4 sticky left-0 bg-zinc-900 z-20 border-r border-zinc-800"></TableHead>
                                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[80px] sticky left-8 bg-zinc-900 z-20 border-r border-zinc-800">Status</TableHead>
                                                <TableHead className="text-zinc-400 font-medium py-4 min-w-[280px] sticky left-[88px] bg-zinc-900 z-20 border-r border-zinc-800">Oferta</TableHead>
                                                <TableHead className="w-[32px] py-4 sticky left-[408px] bg-zinc-900 z-20 border-r border-zinc-800"></TableHead>
                                                <TableHead className="text-zinc-400 font-medium py-4 px-4 min-w-[180px]">Condiciones</TableHead>
                                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[100px]">Visitas Landing</TableHead>
                                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[120px]">Visitas Leadform</TableHead>
                                                <TableHead className="text-zinc-400 font-medium text-center py-4 px-4 w-[120px]">Conversiones Leadform</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <SortableContext
                                                items={offers.map((offer) => offer.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {offers.map((offer) => {
                                                    const offerStats = stats[offer.id] || {
                                                        total_visits: 0,
                                                        total_leadform_visits: 0,
                                                        total_submissions: 0,
                                                        conversion_rate: 0,
                                                    };

                                                    return (
                                                        <SortableOfferRow
                                                            key={offer.id}
                                                            offer={offer}
                                                            stats={offerStats}
                                                            studioSlug={studioSlug}
                                                            onEdit={handleEdit}
                                                            onDuplicate={handleDuplicate}
                                                            onDelete={handleDeleteClick}
                                                            onToggleActive={handleToggleActive}
                                                            isDuplicating={duplicatingOfferId === offer.id}
                                                        />
                                                    );
                                                })}
                                            </SortableContext>
                                        </TableBody>
                                    </Table>
                                </DndContext>
                            </div>
                            {isReordering && (
                                <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-10 rounded-lg">
                                    <div className="flex items-center gap-2 text-zinc-300">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        <span className="text-sm">Actualizando orden...</span>
                                    </div>
                                </div>
                            )}
                        </div>
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
                description="¿Estás seguro de que quieres eliminar esta oferta? Esta acción no se puede deshacer y se eliminarán todas las estadísticas asociadas."
                confirmText="Sí, Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isDeleting}
            />
        </div>
    );
}
