'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Plus, Edit, Copy, Trash2, AlertTriangle } from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { PaqueteFormularioAvanzado, type PaqueteFormularioRef } from './PaqueteFormularioAvanzado';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaquetesPorTipoProps {
    studioSlug: string;
    tipoEvento: TipoEventoData;
    paquetes: PaqueteFromDB[];
    onNavigateBack: () => void;
    onPaquetesChange: (paquetes: PaqueteFromDB[]) => void;
}

export function PaquetesPorTipo({
    studioSlug,
    tipoEvento,
    paquetes,
    onNavigateBack,
    onPaquetesChange
}: PaquetesPorTipoProps) {
    const [loading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingPaquete, setEditingPaquete] = useState<PaqueteFromDB | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingClose, setPendingClose] = useState(false);
    const formRef = useRef<PaqueteFormularioRef>(null);

    // Mostrar todos los paquetes sin filtrado
    const filteredPaquetes = paquetes;

    const handleCrearPaquete = () => {
        setEditingPaquete(null);
        setShowForm(true);
    };

    const handleSave = (savedPaquete: PaqueteFromDB) => {
        if (editingPaquete) {
            // Actualizar paquete existente
            const newPaquetes = paquetes.map((p) =>
                p.id === editingPaquete.id ? savedPaquete : p
            );
            onPaquetesChange(newPaquetes);
        } else {
            // Crear nuevo paquete
            const newPaquetes = [...paquetes, savedPaquete];
            onPaquetesChange(newPaquetes);
        }
        setShowForm(false);
        setEditingPaquete(null);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingPaquete(null);
    };

    // Manejar intento de cierre del modal
    const handleModalClose = (open: boolean) => {
        if (!open && !pendingClose) {
            // Verificar si hay items seleccionados
            if (formRef.current?.hasSelectedItems()) {
                setShowConfirmDialog(true);
                return; // No cerrar el modal
            }
        }

        if (pendingClose) {
            setPendingClose(false);
        }

        setShowForm(open);
        if (!open) {
            setEditingPaquete(null);
        }
    };

    // Confirmar cierre
    const handleConfirmClose = () => {
        setShowConfirmDialog(false);
        setPendingClose(true);
        setShowForm(false);
        setEditingPaquete(null);
    };

    // Cancelar cierre
    const handleCancelClose = () => {
        setShowConfirmDialog(false);
    };

    const handleEditPaquete = (paquete: PaqueteFromDB) => {
        setEditingPaquete(paquete);
        setShowForm(true);
    };

    const handleDuplicatePaquete = async (paquete: PaqueteFromDB) => {
        // TODO: Implementar duplicación
        console.log('Duplicar paquete:', paquete.name);
    };

    const handleDeletePaquete = async (paquete: PaqueteFromDB) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el paquete "${paquete.name}"?`)) {
            return;
        }
        // TODO: Implementar eliminación
        console.log('Eliminar paquete:', paquete.name);
    };

    return (
        <div className="space-y-6">
            {/* Header con breadcrumb */}
            <div className="flex items-center gap-4">
                <ZenButton
                    variant="secondary"
                    size="sm"
                    onClick={onNavigateBack}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </ZenButton>

                <div className="flex items-center gap-2 text-zinc-400">
                    <span>Paquetes</span>
                    <span>/</span>
                    <span className="text-white font-medium">{tipoEvento.nombre}</span>
                </div>
            </div>

            {/* Header del tipo de evento */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {tipoEvento.icono && (
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <span className="text-2xl">{tipoEvento.icono}</span>
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-white">{tipoEvento.nombre}</h2>
                        {tipoEvento.descripcion && (
                            <p className="text-zinc-400 mt-1">{tipoEvento.descripcion}</p>
                        )}
                    </div>
                </div>

                <ZenButton onClick={handleCrearPaquete}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Paquete
                </ZenButton>
            </div>


            {/* Lista de paquetes */}
            {filteredPaquetes.length === 0 ? (
                <ZenCard>
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            No hay paquetes configurados
                        </h3>
                        <p className="text-zinc-400 mb-6">
                            Crea tu primer paquete para {tipoEvento.nombre}
                        </p>
                        <ZenButton onClick={handleCrearPaquete}>
                            <Plus className="w-4 h-4 mr-2" />
                            Crear Primer Paquete
                        </ZenButton>
                    </div>
                </ZenCard>
            ) : (
                <div className="space-y-2">
                    {filteredPaquetes.map((paquete) => (
                        <div key={paquete.id} className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 hover:bg-zinc-800/70 hover:border-zinc-600/50 transition-all duration-200">
                            <div className="flex items-center justify-between">
                                {/* Información principal */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">
                                        {paquete.name}
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        {formatearMoneda(paquete.precio || 0)}
                                    </p>
                                </div>

                                {/* Acciones minimalistas */}
                                <div className="flex items-center gap-1 ml-3">
                                    <button
                                        onClick={() => handleEditPaquete(paquete)}
                                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                                        title="Editar"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDuplicatePaquete(paquete)}
                                        disabled={loading}
                                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                                        title="Duplicar"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePaquete(paquete)}
                                        disabled={loading}
                                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de formulario */}
            <Dialog open={showForm} onOpenChange={handleModalClose}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingPaquete ? 'Editar Paquete' : 'Nuevo Paquete'}
                        </DialogTitle>
                    </DialogHeader>
                    <PaqueteFormularioAvanzado
                        ref={formRef}
                        studioSlug={studioSlug}
                        paquete={editingPaquete}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </DialogContent>
            </Dialog>

            {/* Modal de confirmación de cierre */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            ¿Estás seguro de cerrar?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Se perderán todos los cambios realizados. Los items seleccionados y la configuración del paquete no se guardarán.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            variant="secondary"
                            onClick={handleCancelClose}
                            className="flex-1"
                        >
                            Continuar editando
                        </ZenButton>
                        <ZenButton
                            variant="destructive"
                            onClick={handleConfirmClose}
                            className="flex-1"
                        >
                            Sí, cerrar
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
