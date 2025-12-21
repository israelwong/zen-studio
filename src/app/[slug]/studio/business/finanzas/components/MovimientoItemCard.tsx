'use client';

import React, { useState } from 'react';
import { MoreVertical, FileText, X, Trash2, Edit } from 'lucide-react';
import {
    ZenCard,
    ZenCardContent,
    ZenButton,
    ZenDropdownMenu,
    ZenDropdownMenuTrigger,
    ZenDropdownMenuContent,
    ZenDropdownMenuItem,
    ZenDropdownMenuSeparator,
    ZenConfirmModal,
} from '@/components/ui/zen';
import { PaymentReceipt } from '@/components/shared/payments/PaymentReceipt';
import { NominaReceipt } from '@/components/shared/payments/NominaReceipt';
import { eliminarGastoOperativo, obtenerServiciosNomina } from '@/lib/actions/studio/business/finanzas/finanzas.actions';
import { RegistrarMovimientoModal } from './RegistrarMovimientoModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, List } from 'lucide-react';

interface Transaction {
    id: string;
    fecha: Date;
    fuente: 'evento' | 'staff' | 'operativo';
    concepto: string;
    categoria: string;
    monto: number;
    nominaId?: string; // ID de la nómina si viene de "Por Pagar"
    nominaPaymentType?: string; // Tipo de pago de nómina ('individual' | 'consolidado')
    isGastoOperativo?: boolean; // Si es gasto operativo personalizado
}

interface MovimientoItemCardProps {
    transaction: Transaction;
    studioSlug: string;
    onCancelarPago?: (id: string) => void;
    onGastoEliminado?: () => void;
    onNominaCancelada?: () => void;
    onGastoEditado?: () => void;
}

export function MovimientoItemCard({
    transaction,
    studioSlug,
    onCancelarPago,
    onGastoEliminado,
    onNominaCancelada,
    onGastoEditado,
}: MovimientoItemCardProps) {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showCancelNominaModal, setShowCancelNominaModal] = useState(false);
    const [showEliminarNominaModal, setShowEliminarNominaModal] = useState(false);
    const [showEliminarPagoModal, setShowEliminarPagoModal] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [isNominaReceiptModalOpen, setIsNominaReceiptModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCancellingNomina, setIsCancellingNomina] = useState(false);
    const [isEliminandoNomina, setIsEliminandoNomina] = useState(false);
    const [isEliminandoPago, setIsEliminandoPago] = useState(false);
    const [showServiciosDesglose, setShowServiciosDesglose] = useState(false);
    const [servicios, setServicios] = useState<Array<{ service_name: string; assigned_cost: number; assigned_quantity: number }>>([]);
    const [loadingServicios, setLoadingServicios] = useState(false);

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
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const isIngreso = transaction.monto > 0;
    const isEgresoOperativo = !isIngreso && transaction.fuente === 'operativo';
    const isNominaPagada = !isIngreso && transaction.fuente === 'staff' && transaction.nominaId;
    const isNominaConsolidada = isNominaPagada && transaction.nominaPaymentType === 'consolidado';
    const isGastoPersonalizado = transaction.isGastoOperativo && transaction.fuente === 'operativo';
    // Ingresos manuales son aquellos que no tienen cotización asociada (transaction_category === 'manual')
    const isIngresoPersonalizado = isIngreso && transaction.categoria === 'manual';

    // Determinar tipo de badge
    const isManual = transaction.categoria === 'manual' || isIngresoPersonalizado || (isGastoPersonalizado && transaction.categoria !== 'Recurrente');
    const isNomina = transaction.categoria === 'Nómina' || isNominaPagada;
    const isRecurrente = transaction.categoria === 'Recurrente';

    const handleToggleServiciosDesglose = async () => {
        if (showServiciosDesglose) {
            setShowServiciosDesglose(false);
            return;
        }

        if (!transaction.nominaId || !isNominaConsolidada) return;

        setLoadingServicios(true);
        try {
            const result = await obtenerServiciosNomina(studioSlug, transaction.nominaId);
            if (result.success && result.data) {
                setServicios(result.data);
                setShowServiciosDesglose(true);
            } else {
                toast.error(result.error || 'Error al cargar conceptos');
            }
        } catch (error) {
            console.error('Error cargando conceptos:', error);
            toast.error('Error al cargar conceptos');
        } finally {
            setLoadingServicios(false);
        }
    };

    const handleViewReceipt = () => {
        setIsReceiptModalOpen(true);
    };

    const handleViewNominaReceipt = () => {
        setIsNominaReceiptModalOpen(true);
    };

    const handleCancelarClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmCancel = async () => {
        if (!onCancelarPago) return;

        setIsCancelling(true);
        try {
            await onCancelarPago(transaction.id);
            setShowConfirmModal(false);
        } catch (error) {
            console.error('Error cancelando pago:', error);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleEliminarGastoClick = () => {
        setShowDeleteConfirmModal(true);
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await eliminarGastoOperativo(studioSlug, transaction.id);
            if (result.success) {
                toast.success('Gasto eliminado correctamente');
                await onGastoEliminado?.();
                setShowDeleteConfirmModal(false);
            } else {
                toast.error(result.error || 'Error al eliminar gasto');
            }
        } catch (error) {
            console.error('Error eliminando gasto:', error);
            toast.error('Error al eliminar gasto');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditarGastoClick = () => {
        setIsEditModalOpen(true);
    };

    const handleCancelarNominaClick = () => {
        setShowCancelNominaModal(true);
    };

    const handleConfirmCancelNomina = async () => {
        if (!transaction.nominaId) return;

        setIsCancellingNomina(true);
        try {
            const { cancelarNominaPagada } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            const result = await cancelarNominaPagada(studioSlug, transaction.nominaId);
            if (result.success) {
                toast.success('Nómina cancelada. Se ha agregado nuevamente a "Por Pagar"');
                await onNominaCancelada?.();
                setShowCancelNominaModal(false);
            } else {
                toast.error(result.error || 'Error al cancelar nómina');
            }
        } catch (error) {
            console.error('Error cancelando nómina:', error);
            toast.error('Error al cancelar nómina');
        } finally {
            setIsCancellingNomina(false);
        }
    };

    const handleEliminarNominaClick = () => {
        setShowEliminarNominaModal(true);
    };

    const handleConfirmEliminarNomina = async () => {
        if (!transaction.nominaId) return;

        setIsEliminandoNomina(true);
        try {
            const { eliminarNominaPagada } = await import('@/lib/actions/studio/business/finanzas/finanzas.actions');
            const result = await eliminarNominaPagada(studioSlug, transaction.nominaId);
            if (result.success) {
                toast.success('Nómina eliminada correctamente');
                await onNominaCancelada?.();
                setShowEliminarNominaModal(false);
            } else {
                toast.error(result.error || 'Error al eliminar nómina');
            }
        } catch (error) {
            console.error('Error eliminando nómina:', error);
            toast.error('Error al eliminar nómina');
        } finally {
            setIsEliminandoNomina(false);
        }
    };

    const handleEliminarPagoClick = () => {
        setShowEliminarPagoModal(true);
    };

    const handleConfirmEliminarPago = async () => {
        if (!onCancelarPago) return;

        setIsEliminandoPago(true);
        try {
            const { eliminarPago } = await import('@/lib/actions/studio/business/events/payments.actions');
            const result = await eliminarPago(studioSlug, transaction.id);
            if (result.success) {
                toast.success('Pago eliminado correctamente');
                await onCancelarPago(transaction.id);
                setShowEliminarPagoModal(false);
            } else {
                toast.error(result.error || 'Error al eliminar pago');
            }
        } catch (error) {
            console.error('Error eliminando pago:', error);
            toast.error('Error al eliminar pago');
        } finally {
            setIsEliminandoPago(false);
        }
    };

    return (
        <>
            <ZenCard variant="default" padding="sm" className="hover:border-zinc-700 transition-colors">
                <ZenCardContent className="p-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                    {transaction.concepto}
                                </p>
                                {isManual && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
                                        Manual
                                    </span>
                                )}
                                {isNomina && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-900/20 text-blue-400 border border-blue-800/30">
                                        Nómina
                                    </span>
                                )}
                                {isRecurrente && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-900/20 text-yellow-400 border border-yellow-800/30">
                                        Recurrente
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <p className="text-xs text-zinc-500">
                                    {formatDate(transaction.fecha)}
                                </p>
                                <p
                                    className={cn(
                                        'text-base font-semibold',
                                        isIngreso ? 'text-emerald-400' : 'text-rose-400'
                                    )}
                                >
                                    {isIngreso ? '+' : ''}
                                    {formatCurrency(Math.abs(transaction.monto))}
                                </p>
                            </div>
                        </div>
                        <ZenDropdownMenu>
                            <ZenDropdownMenuTrigger asChild>
                                <ZenButton variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </ZenButton>
                            </ZenDropdownMenuTrigger>
                            <ZenDropdownMenuContent align="end">
                                {isIngreso && (
                                    <>
                                        <ZenDropdownMenuItem
                                            onClick={handleViewReceipt}
                                            className="gap-2"
                                        >
                                            <FileText className="h-4 w-4" />
                                            Ver Comprobante
                                        </ZenDropdownMenuItem>
                                        {isIngresoPersonalizado && (
                                            <ZenDropdownMenuItem
                                                onClick={handleEditarGastoClick}
                                                className="gap-2"
                                            >
                                                <Edit className="h-4 w-4" />
                                                Editar
                                            </ZenDropdownMenuItem>
                                        )}
                                    </>
                                )}
                                {isGastoPersonalizado && (
                                    <ZenDropdownMenuItem
                                        onClick={handleEditarGastoClick}
                                        className="gap-2"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Editar
                                    </ZenDropdownMenuItem>
                                )}
                                {isNominaPagada && isNominaConsolidada && (
                                    <ZenDropdownMenuItem
                                        onClick={handleToggleServiciosDesglose}
                                        className="gap-2"
                                    >
                                        <List className="h-4 w-4" />
                                        {showServiciosDesglose ? 'Ocultar' : 'Ver'} Desglose
                                    </ZenDropdownMenuItem>
                                )}
                                <ZenDropdownMenuSeparator />
                                {/* Cancelar - disponible para todos */}
                                {isNominaPagada && (
                                    <ZenDropdownMenuItem
                                        onClick={handleCancelarNominaClick}
                                        className="gap-2"
                                    >
                                        <X className="h-4 w-4" />
                                        Cancelar
                                    </ZenDropdownMenuItem>
                                )}
                                {onCancelarPago && isIngreso && (
                                    <ZenDropdownMenuItem
                                        onClick={handleCancelarClick}
                                        className="gap-2"
                                    >
                                        <X className="h-4 w-4" />
                                        Cancelar
                                    </ZenDropdownMenuItem>
                                )}
                                {/* Comprobante - disponible para nóminas */}
                                {isNominaPagada && (
                                    <ZenDropdownMenuItem
                                        onClick={handleViewNominaReceipt}
                                        className="gap-2"
                                    >
                                        <FileText className="h-4 w-4" />
                                        Comprobante
                                    </ZenDropdownMenuItem>
                                )}
                                <ZenDropdownMenuSeparator />
                                {/* Eliminar - disponible para todos */}
                                {isNominaPagada && (
                                    <ZenDropdownMenuItem
                                        onClick={handleEliminarNominaClick}
                                        className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </ZenDropdownMenuItem>
                                )}
                                {onCancelarPago && isIngreso && (
                                    <ZenDropdownMenuItem
                                        onClick={handleEliminarPagoClick}
                                        className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </ZenDropdownMenuItem>
                                )}
                                {isGastoPersonalizado && (
                                    <ZenDropdownMenuItem
                                        onClick={handleEliminarGastoClick}
                                        className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </ZenDropdownMenuItem>
                                )}
                                {isEgresoOperativo && !isGastoPersonalizado && (
                                    <ZenDropdownMenuItem
                                        onClick={handleEliminarGastoClick}
                                        className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </ZenDropdownMenuItem>
                                )}
                            </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                    </div>
                    {isNominaConsolidada && showServiciosDesglose && (
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-zinc-400 mb-2">Conceptos incluidos:</p>
                                {loadingServicios ? (
                                    <p className="text-xs text-zinc-500">Cargando...</p>
                                ) : servicios.length > 0 ? (
                                    servicios.map((servicio, index) => (
                                        <div key={index} className="flex items-center justify-between text-xs">
                                            <span className="text-zinc-300">{servicio.service_name}</span>
                                            <span className="text-zinc-400">
                                                {servicio.assigned_quantity > 1 && `${servicio.assigned_quantity}x `}
                                                {formatCurrency(servicio.assigned_cost)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-zinc-500">No hay conceptos registrados</p>
                                )}
                            </div>
                        </div>
                    )}
                </ZenCardContent>
            </ZenCard>

            <ZenConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmCancel}
                title="¿Estás seguro de cancelar el pago?"
                description={`Esta acción cancelará el pago "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. El pago se mantendrá en el historial con estado cancelado.`}
                confirmText="Sí, cancelar pago"
                cancelText="No, mantener"
                variant="destructive"
                loading={isCancelling}
                loadingText="Cancelando..."
            />

            <ZenConfirmModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={handleConfirmDelete}
                title="¿Estás seguro de eliminar el gasto?"
                description={`Esta acción eliminará permanentemente el gasto "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar gasto"
                cancelText="No, cancelar"
                variant="destructive"
                loading={isDeleting}
                loadingText="Eliminando..."
            />

            <ZenConfirmModal
                isOpen={showCancelNominaModal}
                onClose={() => setShowCancelNominaModal(false)}
                onConfirm={handleConfirmCancelNomina}
                title="¿Cancelar nómina pagada?"
                description={`Esta acción cancelará el pago de la nómina "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. La nómina será cancelada pero se agregará nuevamente a "Por Pagar" con estado pendiente.`}
                confirmText="Sí, cancelar nómina"
                cancelText="No, mantener"
                variant="destructive"
                loading={isCancellingNomina}
                loadingText="Cancelando..."
            />

            {/* Modal de comprobante de pago */}
            {isReceiptModalOpen && (
                <PaymentReceipt
                    isOpen={isReceiptModalOpen}
                    onClose={() => setIsReceiptModalOpen(false)}
                    studioSlug={studioSlug}
                    paymentId={transaction.id}
                />
            )}

            {/* Modal de comprobante de nómina */}
            {isNominaReceiptModalOpen && transaction.nominaId && (
                <NominaReceipt
                    isOpen={isNominaReceiptModalOpen}
                    onClose={() => setIsNominaReceiptModalOpen(false)}
                    studioSlug={studioSlug}
                    nominaId={transaction.nominaId}
                />
            )}

            {/* Modal de edición */}
            {isEditModalOpen && (
                <RegistrarMovimientoModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    tipo={isIngreso ? 'ingreso' : 'gasto'}
                    studioSlug={studioSlug}
                    movimientoId={transaction.id}
                    initialData={{
                        concepto: transaction.concepto,
                        monto: Math.abs(transaction.monto),
                        metodoPago: undefined, // Se cargará desde el pago si es ingreso
                    }}
                    onSuccess={async () => {
                        await onGastoEditado?.();
                        setIsEditModalOpen(false);
                    }}
                />
            )}

            {/* Modal de confirmación eliminar nómina */}
            <ZenConfirmModal
                isOpen={showEliminarNominaModal}
                onClose={() => setShowEliminarNominaModal(false)}
                onConfirm={handleConfirmEliminarNomina}
                title="¿Eliminar nómina?"
                description={isNominaConsolidada
                    ? `Esta acción eliminará permanentemente el pago consolidado "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))} y todos los items asociados. Esta acción no se puede deshacer.`
                    : `Esta acción eliminará permanentemente la nómina "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))}. Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isEliminandoNomina}
                loadingText="Eliminando..."
            />

            {/* Modal de confirmación eliminar pago */}
            <ZenConfirmModal
                isOpen={showEliminarPagoModal}
                onClose={() => setShowEliminarPagoModal(false)}
                onConfirm={handleConfirmEliminarPago}
                title="¿Eliminar pago?"
                description={`Esta acción eliminará permanentemente el pago "${transaction.concepto}" por ${formatCurrency(Math.abs(transaction.monto))} y los items asociados. Esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isEliminandoPago}
                loadingText="Eliminando..."
            />
        </>
    );
}
