'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Edit, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/shadcn/dialog';
import { ZenButton } from '@/components/ui/zen';
import {
    eliminarPaquete,
    duplicarPaquete,
} from '@/lib/actions/studio/builder/catalogo/paquetes.actions';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';

interface PaqueteItemProps {
    paquete: {
        id: string;
        name: string;
        precio?: number | null;
        cost?: number | null;
        expense?: number | null;
        event_type_id: string;
    };
    studioSlug: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
}

export function PaqueteItem({
    paquete,
    studioSlug,
    onEdit,
    onDelete,
    onDuplicate,
}: PaqueteItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    const precioFormateado = formatearMoneda(paquete.precio || 0);

    const handleEliminar = async () => {
        setIsDeleting(true);
        try {
            const result = await eliminarPaquete(studioSlug, paquete.id);

            if (result.success) {
                toast.success('Paquete eliminado correctamente');
                onDelete(paquete.id);
                setShowDeleteModal(false);
            } else {
                toast.error(result.error || 'Error al eliminar el paquete');
            }
        } catch (error) {
            toast.error('Error al eliminar el paquete');
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicar = async () => {
        setIsDuplicating(true);
        try {
            const result = await duplicarPaquete(studioSlug, paquete.id);

            if (result.success && result.data) {
                toast.success('Paquete duplicado correctamente');
                onDuplicate(result.data.id);
                setShowDuplicateModal(false);
            } else {
                toast.error(result.error || 'Error al duplicar el paquete');
            }
        } catch (error) {
            toast.error('Error al duplicar el paquete');
            console.error(error);
        } finally {
            setIsDuplicating(false);
        }
    };

    return (
        <div className="group relative bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 hover:bg-zinc-800/70 hover:border-zinc-600/50 transition-all duration-200">
            <div className="flex items-center justify-between">
                {/* Información principal */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">
                        {paquete.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        {precioFormateado}
                    </p>
                </div>

                {/* Acciones minimalistas */}
                <div className="flex items-center gap-1 ml-3">
                    <button
                        onClick={() => onEdit(paquete.id)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Editar"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setShowDuplicateModal(true)}
                        disabled={isDuplicating}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                        title="Duplicar"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={isDeleting}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        title="Eliminar"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Modal de confirmación para eliminar */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            ¿Eliminar paquete?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            ¿Estás seguro de que quieres eliminar &ldquo;{paquete.name}&rdquo;? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            variant="secondary"
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="destructive"
                            onClick={handleEliminar}
                            disabled={isDeleting}
                            className="flex-1"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de confirmación para duplicar */}
            <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Copy className="w-5 h-5 text-blue-500" />
                            ¿Duplicar paquete?
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Se creará una copia del paquete &ldquo;{paquete.name}&rdquo; con el nombre &ldquo;{paquete.name} (Copia)&rdquo;.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <ZenButton
                            variant="secondary"
                            onClick={() => setShowDuplicateModal(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </ZenButton>
                        <ZenButton
                            variant="primary"
                            onClick={handleDuplicar}
                            disabled={isDuplicating}
                            className="flex-1"
                        >
                            {isDuplicating ? 'Duplicando...' : 'Duplicar'}
                        </ZenButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
