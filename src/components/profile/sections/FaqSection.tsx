'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Plus, Edit2, Trash2, X, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { ZenInput, ZenTextarea } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { createFAQ, updateFAQ, deleteFAQ, reorderFAQ } from '@/lib/actions/studio/faq.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface FAQItem {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    is_active: boolean;
}

interface FaqSectionProps {
    faq?: FAQItem[];
    data?: {
        faq?: FAQItem[];
    };
    loading?: boolean;
    viewMode?: 'compact' | 'expanded';
    studioSlug: string;
    ownerId?: string | null;
}

/**
 * FaqSection - Unified FAQ section with inline editing
 * Sigue el patrón de ContactSection.tsx
 * 
 * Features:
 * - Vista de lectura con accordions
 * - Edición inline con hover effects
 * - Crear, editar, eliminar inline
 * - Confirmación modal para eliminación
 * 
 * Usado en:
 * - ProfileContent variant="faq" (sección principal)
 * - MobilePreviewContainer (persistente antes del footer)
 * - ProfilePageClient (persistente antes del footer)
 */
export function FaqSection({
    faq,
    data,
    loading = false,
    viewMode = 'compact',
    studioSlug,
    ownerId
}: FaqSectionProps) {
    const { user } = useAuth();
    const router = useRouter();

    // Estados para accordions
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());

    // Estados para edición inline
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editData, setEditData] = useState({ pregunta: '', respuesta: '' });
    const [saving, setSaving] = useState<string | null>(null);

    // Estado para confirmación de eliminación
    const [confirmDelete, setConfirmDelete] = useState<{
        id: string;
        pregunta: string;
    } | null>(null);

    // Verificar si el usuario es el dueño
    const isOwner = user?.id === ownerId;

    // Soporte para ambos formatos de props
    const faqData = faq || data?.faq || [];
    const activeFAQ = faqData.filter(faq => faq.is_active);

    // Handler para refrescar datos
    const handleDataRefresh = () => {
        router.refresh();
    };

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleCreate = () => {
        setIsCreating(true);
        setEditingId(null);
        setEditData({ pregunta: '', respuesta: '' });
    };

    const handleEdit = (faqItem: FAQItem) => {
        setEditingId(faqItem.id);
        setIsCreating(false);
        setEditData({ pregunta: faqItem.pregunta, respuesta: faqItem.respuesta });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setIsCreating(false);
        setEditData({ pregunta: '', respuesta: '' });
    };

    const handleSave = async (faqId?: string) => {
        if (!editData.pregunta.trim() || !editData.respuesta.trim()) {
            toast.error('Pregunta y respuesta son requeridas');
            return;
        }

        const targetId = faqId || editingId;
        setSaving(targetId || 'new');

        try {
            if (isCreating) {
                const result = await createFAQ(studioSlug, editData);
                if (result.success) {
                    toast.success('Pregunta agregada');
                    handleCancelEdit();
                    handleDataRefresh();
                } else {
                    toast.error(result.error || 'Error al crear');
                }
            } else if (targetId) {
                const result = await updateFAQ(targetId, studioSlug, editData);
                if (result.success) {
                    toast.success('Pregunta actualizada');
                    handleCancelEdit();
                    handleDataRefresh();
                } else {
                    toast.error(result.error || 'Error al actualizar');
                }
            }
        } catch (error) {
            toast.error('Error al guardar');
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteClick = (faqId: string, pregunta: string) => {
        setConfirmDelete({ id: faqId, pregunta });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;

        setSaving(confirmDelete.id);
        try {
            const result = await deleteFAQ(confirmDelete.id, studioSlug);
            if (result.success) {
                toast.success('Pregunta eliminada');
                handleDataRefresh();
            } else {
                toast.error(result.error || 'Error al eliminar');
            }
        } catch (error) {
            toast.error('Error al eliminar');
        } finally {
            setSaving(null);
            setConfirmDelete(null);
        }
    };

    const handleReorder = async (faqId: string, direction: 'up' | 'down') => {
        const currentIndex = activeFAQ.findIndex(f => f.id === faqId);
        if (currentIndex === -1) return;

        // Validar límites
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === activeFAQ.length - 1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        setSaving(faqId);
        try {
            const result = await reorderFAQ(faqId, newIndex, studioSlug);
            if (result.success) {
                handleDataRefresh();
            } else {
                toast.error(result.error || 'Error al reordenar');
            }
        } catch (error) {
            toast.error('Error al reordenar');
        } finally {
            setSaving(null);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse"></div>
                    <div className="h-5 bg-zinc-700 rounded animate-pulse w-32"></div>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="border border-zinc-800 rounded-lg p-4">
                            <div className="h-4 bg-zinc-700 rounded animate-pulse w-3/4 mb-2"></div>
                            <div className="h-3 bg-zinc-700 rounded animate-pulse w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Empty state para visitantes
    if (!activeFAQ.length && !isOwner) {
        return null;
    }

    const isCompact = viewMode === 'compact';

    return (
        <div className="space-y-4">{/* Reducido spacing para eliminar header */}

            {/* Formulario para crear nueva FAQ - inline */}
            {isCreating && (
                <div className="relative rounded-lg p-3 -mx-3 border border-purple-500/50 bg-zinc-900/50 space-y-3">
                    <ZenInput
                        label="Pregunta"
                        value={editData.pregunta}
                        onChange={(e) => setEditData(prev => ({ ...prev, pregunta: e.target.value }))}
                        placeholder="¿Cuál es tu pregunta?"
                        required
                    />
                    <ZenTextarea
                        label="Respuesta"
                        value={editData.respuesta}
                        onChange={(e) => setEditData(prev => ({ ...prev, respuesta: e.target.value }))}
                        placeholder="Escribe la respuesta..."
                        rows={3}
                        required
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSave()}
                            disabled={saving === 'new'}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                        >
                            {saving === 'new' ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Guardar
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            disabled={saving === 'new'}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state para owner - Slot para agregar pregunta */}
            {!activeFAQ.length && isOwner && !isCreating && (
                <div className="relative rounded-lg p-6 border border-dashed border-purple-600/30 bg-purple-600/5 text-center">
                    <HelpCircle className="w-12 h-12 mx-auto mb-4 text-purple-400/60" />
                    <h4 className="text-base font-medium text-white mb-2">
                        Agrega tu primera pregunta frecuente
                    </h4>
                    <p className="text-sm text-zinc-400 mb-4">
                        Responde las dudas más comunes de tus clientes
                    </p>
                    <button
                        onClick={handleCreate}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-purple-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Crear pregunta
                    </button>
                </div>
            )}

            {/* Lista de FAQs */}
            {activeFAQ.length > 0 && (
                <div className={`relative rounded-lg -mx-3 border border-zinc-800 bg-zinc-900/50 overflow-hidden ${isCompact ? '' : 'space-y-3'}`}>
                    <div className={isCompact ? 'space-y-0 divide-y divide-zinc-800' : 'p-3 space-y-3'}>
                        {activeFAQ
                            .sort((a, b) => a.orden - b.orden)
                            .map((faqItem, index) => {
                                const isOpen = openItems.has(faqItem.id);
                                const isEditing = editingId === faqItem.id;
                                const isSaving = saving === faqItem.id;
                                const currentIndex = index;

                                // Modo edición inline
                                if (isEditing) {
                                    return (
                                        <div
                                            key={faqItem.id}
                                            className={`${isCompact ? 'p-4' : ''} bg-zinc-800/30 space-y-3 ${isCompact ? '' : 'border border-purple-500/50 rounded-lg p-4'}`}
                                        >
                                            <ZenInput
                                                label="Pregunta"
                                                value={editData.pregunta}
                                                onChange={(e) => setEditData(prev => ({ ...prev, pregunta: e.target.value }))}
                                                required
                                            />
                                            <ZenTextarea
                                                label="Respuesta"
                                                value={editData.respuesta}
                                                onChange={(e) => setEditData(prev => ({ ...prev, respuesta: e.target.value }))}
                                                rows={3}
                                                required
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSave(faqItem.id)}
                                                    disabled={isSaving}
                                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    {isSaving ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Check className="w-4 h-4" />
                                                    )}
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    disabled={isSaving}
                                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-sm rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                // Modo lectura con hover effects - Diseño mejorado
                                return (
                                    <div
                                        key={faqItem.id}
                                        className={`relative group ${isCompact ? '' : 'border border-zinc-800 rounded-lg overflow-hidden'} ${isOwner ? 'hover:border-purple-600/30' : ''} transition-all duration-200`}
                                    >
                                        {/* Header del FAQ */}
                                        <div className="flex items-start gap-3 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                                            {/* Icono de pregunta */}
                                            <div className={`${isCompact ? 'pt-2 pl-3' : 'pt-4 pl-4'}`}>
                                                <div className={`flex items-center justify-center shrink-0 rounded-full bg-purple-600/10 ${isOpen ? 'bg-purple-600/20' : ''} transition-colors`}
                                                    style={{ width: '28px', height: '28px' }}
                                                >
                                                    <HelpCircle className={`w-4 h-4 ${isOpen ? 'text-purple-400' : 'text-purple-500/60'} transition-colors`} />
                                                </div>
                                            </div>

                                            {/* Contenido del botón */}
                                            <button
                                                onClick={() => toggleItem(faqItem.id)}
                                                className={`flex-1 text-left flex items-start justify-between gap-3 ${isCompact ? 'py-2 pr-3' : 'py-4 pr-4'}`}
                                            >
                                                <div className="flex-1">
                                                    <span className={`block font-semibold leading-relaxed text-sm ${isOpen ? 'text-purple-300' : 'text-white'} transition-colors`}>
                                                        {faqItem.pregunta}
                                                    </span>
                                                </div>

                                                {/* Indicador visual mejorado */}
                                                <div className={`shrink-0 mt-0.5 rounded-full p-1 ${isOpen ? 'bg-purple-600/20 text-purple-400' : 'bg-zinc-700/50 text-zinc-500'} transition-all duration-200`}>
                                                    {isOpen ? (
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Botones de edición y reordenamiento - visible on hover */}
                                            {isOwner && !isOpen && (
                                                <div className="flex items-center gap-1 pr-3 pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {/* Flechas de reordenamiento */}
                                                    <div className="flex flex-col gap-0.5 mr-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleReorder(faqItem.id, 'up');
                                                            }}
                                                            disabled={currentIndex === 0 || saving === faqItem.id}
                                                            className="p-1 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                            aria-label="Mover arriba"
                                                        >
                                                            <ArrowUp className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleReorder(faqItem.id, 'down');
                                                            }}
                                                            disabled={currentIndex === activeFAQ.length - 1 || saving === faqItem.id}
                                                            className="p-1 rounded hover:bg-zinc-700/50 text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                            aria-label="Mover abajo"
                                                        >
                                                            <ArrowDown className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(faqItem);
                                                        }}
                                                        className="p-1.5 rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 transition-all"
                                                        aria-label="Editar pregunta"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(faqItem.id, faqItem.pregunta);
                                                        }}
                                                        className="p-1.5 rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-all"
                                                        aria-label="Eliminar pregunta"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Respuesta expandible con animación mejorada */}
                                        {isOpen && (
                                            <div className="border-t border-zinc-800 bg-zinc-900/50">
                                                <div className={`${isCompact ? 'px-3 pb-3 pt-3' : 'px-4 pb-4 pt-4'} pl-14`}>
                                                    <div className="relative">
                                                        {/* Barra decorativa lateral */}
                                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-600/50 via-purple-600/20 to-transparent rounded-full" />

                                                        {/* Respuesta */}
                                                        <div className="pl-4">
                                                            <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                                {faqItem.respuesta}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Botones de edición cuando está abierto */}
                                                    {isOwner && (
                                                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/50">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEdit(faqItem);
                                                                }}
                                                                className="px-3 py-1.5 rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-xs font-medium transition-all flex items-center gap-1.5"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteClick(faqItem.id, faqItem.pregunta);
                                                                }}
                                                                className="px-3 py-1.5 rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-400 text-xs font-medium transition-all flex items-center gap-1.5"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>

                    {/* Botón para agregar más preguntas */}
                    {isOwner && !isCreating && (
                        <div className="border-t border-zinc-800/50 p-4">
                            <button
                                onClick={handleCreate}
                                className="w-full py-2.5 rounded-lg border border-dashed border-purple-600/30 bg-purple-600/5 hover:bg-purple-600/10 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar otra pregunta
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de confirmación para eliminar */}
            <ZenConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar pregunta"
                description={`¿Eliminar "${confirmDelete?.pregunta}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={saving === confirmDelete?.id}
            />
        </div>
    );
}
