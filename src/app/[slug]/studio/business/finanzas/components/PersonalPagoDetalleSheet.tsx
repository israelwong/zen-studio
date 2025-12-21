'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { User, Calendar, MoreVertical, Edit, Trash2, CreditCard } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/shadcn/sheet';
import {
    ZenButton,
    ZenCard,
    ZenCardContent,
    ZenConfirmModal,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuSeparator,
    ZenInput,
    ZenDialog,
} from '@/components/ui/zen';
import {
    PorPagarPersonal,
    pagarNominasPersonal,
    editarNomina,
    eliminarNomina,
    eliminarTodasNominasPersonal,
    marcarNominaPagada,
} from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { toast } from 'sonner';

interface PersonalPagoDetalleSheetProps {
    isOpen: boolean;
    onClose: () => void;
    personal: PorPagarPersonal;
    studioSlug: string;
    onPagoConfirmado?: () => void;
}

export function PersonalPagoDetalleSheet({
    isOpen,
    onClose,
    personal,
    studioSlug,
    onPagoConfirmado,
}: PersonalPagoDetalleSheetProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [editingItem, setEditingItem] = useState<{ id: string; concepto: string; monto: number; fecha: Date } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [showPagoIndividualModal, setShowPagoIndividualModal] = useState<string | null>(null);
    const [showEliminarTodosModal, setShowEliminarTodosModal] = useState(false);
    const [editForm, setEditForm] = useState({
        concept: '',
        amount: 0,
        date: new Date(),
    });
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    // Ref para rastrear si hay modales abiertos
    const hasOpenModalRef = useRef(false);
    hasOpenModalRef.current = showDeleteModal !== null || showPagoIndividualModal !== null || editingItem !== null || showEliminarTodosModal;

    // Cerrar todos los dropdowns y quitar focus cuando se abre el sheet
    useEffect(() => {
        if (isOpen) {
            setOpenDropdowns({});
            // Quitar focus de cualquier elemento activo
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    }, [isOpen]);

    // Handler para el Sheet - previene cierre cuando hay modales
    const handleSheetOpenChange = useCallback((newOpen: boolean) => {
        if (!newOpen) {
            // Verificar si hay modales abiertos usando el estado actual, no solo el ref
            const hasModals = showDeleteModal !== null || showPagoIndividualModal !== null || editingItem !== null || showEliminarTodosModal;
            if (hasModals) {
                return; // No permitir que el Sheet se cierre si hay modales abiertos
            }
            onClose();
        }
    }, [onClose, showDeleteModal, showPagoIndividualModal, editingItem, showEliminarTodosModal]);

    // Handler para modales - solo cierra el modal, no el Sheet
    const handleModalClose = useCallback((modalType: 'delete' | 'pago' | 'edit' | 'eliminarTodos') => {
        if (modalType === 'delete') {
            setShowDeleteModal(null);
        } else if (modalType === 'pago') {
            setShowPagoIndividualModal(null);
        } else if (modalType === 'edit') {
            setEditingItem(null);
        } else if (modalType === 'eliminarTodos') {
            setShowEliminarTodosModal(false);
        }
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const handlePagarClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmPago = async () => {
        setIsProcessing(true);
        try {
            const nominaIds = personal.items.map((item) => item.nominaId);
            const result = await pagarNominasPersonal(
                studioSlug,
                personal.personalId,
                nominaIds
            );

            if (result.success) {
                toast.success(`Pago consolidado de ${formatCurrency(personal.totalAcumulado)} confirmado`);
                setShowConfirmModal(false);
                // Esperar un momento para que la revalidación se complete
                await new Promise(resolve => setTimeout(resolve, 100));
                await onPagoConfirmado?.();
                // Cerrar el sheet después de pagar el consolidado completo
                onClose();
            } else {
                toast.error(result.error || 'Error al confirmar el pago');
            }
        } catch (error) {
            console.error('Error confirmando pago:', error);
            toast.error('Error al confirmar el pago');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = (item: { id: string; concepto: string; monto: number; fecha: Date }) => {
        setEditingItem(item);
        setEditForm({
            concept: item.concepto,
            amount: item.monto,
            date: item.fecha,
        });
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;

        setIsProcessing(true);
        try {
            const result = await editarNomina(studioSlug, editingItem.id, {
                concept: editForm.concept,
                net_amount: editForm.amount,
                assignment_date: editForm.date,
            });

            if (result.success) {
                toast.success('Nómina actualizada correctamente');
                setEditingItem(null);
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al actualizar nómina');
            }
        } catch (error) {
            console.error('Error actualizando nómina:', error);
            toast.error('Error al actualizar nómina');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteClick = (nominaId: string) => {
        setShowDeleteModal(nominaId);
    };

    const handleConfirmDelete = async () => {
        if (!showDeleteModal) return;

        setIsProcessing(true);
        try {
            const result = await eliminarNomina(studioSlug, showDeleteModal);

            if (result.success) {
                toast.success('Nómina eliminada correctamente');
                // Cerrar el modal primero
                setShowDeleteModal(null);
                // Esperar un tick para que el estado se actualice antes de refrescar
                await new Promise(resolve => setTimeout(resolve, 0));
                // Luego refrescar los datos
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al eliminar nómina');
            }
        } catch (error) {
            console.error('Error eliminando nómina:', error);
            toast.error('Error al eliminar nómina');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePagoIndividualClick = (nominaId: string) => {
        setShowPagoIndividualModal(nominaId);
    };

    const handleConfirmPagoIndividual = async () => {
        if (!showPagoIndividualModal) return;

        setIsProcessing(true);
        try {
            const result = await marcarNominaPagada(studioSlug, showPagoIndividualModal);

            if (result.success) {
                toast.success('Pago individual confirmado');
                setShowPagoIndividualModal(null);
                await onPagoConfirmado?.();
            } else {
                toast.error(result.error || 'Error al confirmar pago individual');
            }
        } catch (error) {
            console.error('Error confirmando pago individual:', error);
            toast.error('Error al confirmar pago individual');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEliminarTodosClick = () => {
        setShowEliminarTodosModal(true);
    };

    const handleConfirmEliminarTodos = async () => {
        setIsProcessing(true);
        try {
            const result = await eliminarTodasNominasPersonal(studioSlug, personal.personalId);

            if (result.success) {
                toast.success(`${result.deletedCount || personal.items.length} nóminas eliminadas correctamente`);
                setShowEliminarTodosModal(false);
                // Esperar un tick para que el estado se actualice antes de refrescar
                await new Promise(resolve => setTimeout(resolve, 0));
                // Luego refrescar los datos
                await onPagoConfirmado?.();
                // Cerrar el sheet después de eliminar todas las nóminas
                onClose();
            } else {
                toast.error(result.error || 'Error al eliminar nóminas');
            }
        } catch (error) {
            console.error('Error eliminando nóminas:', error);
            toast.error('Error al eliminar nóminas');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
                    showOverlay={true}
                    onInteractOutside={(e) => {
                        if (hasOpenModalRef.current) {
                            e.preventDefault();
                        }
                    }}
                    onEscapeKeyDown={(e) => {
                        if (hasOpenModalRef.current) {
                            e.preventDefault();
                        }
                    }}
                >
                    <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <User className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <SheetTitle className="text-xl font-semibold text-white">
                                    {personal.personalName}
                                </SheetTitle>
                                <SheetDescription className="text-zinc-400">
                                    {personal.items.length} {personal.items.length === 1 ? 'concepto pendiente' : 'conceptos pendientes'}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="p-6 space-y-6">
                        {/* Resumen Total */}
                        <ZenCard variant="default" padding="sm">
                            <ZenCardContent className="p-4">
                                <p className="text-xs text-zinc-500 mb-1">Total acumulado a pagar</p>
                                <p className="text-2xl font-semibold text-rose-400">
                                    {formatCurrency(personal.totalAcumulado)}
                                </p>
                            </ZenCardContent>
                        </ZenCard>

                        {/* Lista de conceptos */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-300">Conceptos incluidos</h3>
                            <div className="space-y-2">
                                {personal.items.map((item) => (
                                    <ZenCard key={item.id} variant="default" padding="sm">
                                        <ZenCardContent className="p-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-zinc-200 mb-0.5">
                                                        {item.concepto}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{formatDate(item.fecha)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <p className="text-sm font-semibold text-rose-400">
                                                        {formatCurrency(item.monto)}
                                                    </p>
                                                    <ZenDropdownMenu
                                                        open={openDropdowns[item.id] || false}
                                                        onOpenChange={(open) => {
                                                            setOpenDropdowns(prev => ({
                                                                ...prev,
                                                                [item.id]: open
                                                            }));
                                                        }}
                                                    >
                                                        <ZenDropdownMenuTrigger asChild>
                                                            <ZenButton
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                                                                onMouseDown={(e) => {
                                                                    // Prevenir focus automático al hacer click
                                                                    e.preventDefault();
                                                                }}
                                                                tabIndex={-1}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </ZenButton>
                                                        </ZenDropdownMenuTrigger>
                                                        <ZenDropdownMenuContent align="end">
                                                            <ZenDropdownMenuItem
                                                                onClick={() => handleEditClick(item)}
                                                                className="gap-2"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                                Editar
                                                            </ZenDropdownMenuItem>
                                                            <ZenDropdownMenuItem
                                                                onClick={() => handlePagoIndividualClick(item.nominaId)}
                                                                className="gap-2"
                                                            >
                                                                <CreditCard className="h-4 w-4" />
                                                                Pasar a pago individual
                                                            </ZenDropdownMenuItem>
                                                            <ZenDropdownMenuSeparator />
                                                            <ZenDropdownMenuItem
                                                                onClick={() => handleDeleteClick(item.nominaId)}
                                                                className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Eliminar
                                                            </ZenDropdownMenuItem>
                                                        </ZenDropdownMenuContent>
                                                    </ZenDropdownMenu>
                                                </div>
                                            </div>
                                        </ZenCardContent>
                                    </ZenCard>
                                ))}
                            </div>
                        </div>

                        {/* Botón de pago */}
                        <div className="pt-4 border-t border-zinc-800 space-y-2">
                            <ZenButton
                                variant="primary"
                                className="w-full"
                                onClick={handlePagarClick}
                                disabled={isProcessing}
                            >
                                Pagar {formatCurrency(personal.totalAcumulado)}
                            </ZenButton>
                            <ZenButton
                                variant="destructive"
                                className="w-full bg-red-600/10 border border-red-600/50 text-red-400 hover:bg-red-600/20 hover:border-red-600 hover:text-red-300"
                                onClick={handleEliminarTodosClick}
                                disabled={isProcessing}
                                icon={Trash2}
                                iconPosition="left"
                            >
                                Eliminar todos
                            </ZenButton>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <ZenConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmPago}
                title="¿Confirmar el pago consolidado?"
                description={`¿Deseas confirmar el pago consolidado de ${formatCurrency(personal.totalAcumulado)} a ${personal.personalName} por ${personal.items.length} ${personal.items.length === 1 ? 'concepto' : 'conceptos'}?`}
                confirmText="Sí, confirmar pago"
                cancelText="Cancelar"
                variant="default"
                loading={isProcessing}
                loadingText="Confirmando..."
            />

            {/* Modal de edición */}
            <ZenDialog
                isOpen={editingItem !== null}
                onClose={() => handleModalClose('edit')}
                title="Editar nómina"
                description="Edita los datos de la nómina pendiente"
                onSave={handleSaveEdit}
                saveLabel="Guardar"
                saveVariant="primary"
                isLoading={isProcessing}
                onCancel={() => setEditingItem(null)}
                cancelLabel="Cancelar"
                maxWidth="sm"
            >
                <div className="space-y-4">
                    <ZenInput
                        label="Concepto"
                        value={editForm.concept}
                        onChange={(e) => setEditForm({ ...editForm, concept: e.target.value })}
                        required
                    />
                    <ZenInput
                        label="Monto"
                        type="number"
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                        required
                    />
                    <ZenInput
                        label="Fecha"
                        type="date"
                        value={editForm.date.toISOString().split('T')[0]}
                        onChange={(e) => setEditForm({ ...editForm, date: new Date(e.target.value) })}
                        required
                    />
                </div>
            </ZenDialog>

            {/* Modal de confirmación eliminar */}
            <ZenConfirmModal
                isOpen={showDeleteModal !== null}
                onClose={() => handleModalClose('delete')}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar nómina?"
                description="Esta acción eliminará permanentemente la nómina. Esta acción no se puede deshacer."
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isProcessing}
                loadingText="Eliminando..."
            />

            {/* Modal de confirmación pago individual */}
            <ZenConfirmModal
                isOpen={showPagoIndividualModal !== null}
                onClose={() => handleModalClose('pago')}
                onConfirm={handleConfirmPagoIndividual}
                title="¿Pasar a pago individual?"
                description="Esta nómina será marcada como pagada y aparecerá en movimientos. Se eliminará de la lista de pendientes."
                confirmText="Sí, pagar"
                cancelText="Cancelar"
                variant="default"
                loading={isProcessing}
                loadingText="Procesando..."
            />

            {/* Modal de confirmación eliminar todos */}
            <ZenConfirmModal
                isOpen={showEliminarTodosModal}
                onClose={() => handleModalClose('eliminarTodos')}
                onConfirm={handleConfirmEliminarTodos}
                title="¿Eliminar la nómina consolidada?"
                description={`¿Estás seguro de que deseas eliminar la nómina consolidada para ${personal.personalName}? Esta acción eliminará todas las ${personal.items.length} ${personal.items.length === 1 ? 'nómina pendiente' : 'nóminas pendientes'} y no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isProcessing}
                loadingText="Eliminando..."
            />
        </>
    );
}
