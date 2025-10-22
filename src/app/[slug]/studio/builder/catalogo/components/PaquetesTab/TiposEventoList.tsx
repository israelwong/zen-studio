'use client';

import React, { useState, useCallback } from 'react';
import { Plus, ArrowRight, Package, GripVertical } from 'lucide-react';
import { ZenCard, ZenButton, ZenBadge } from '@/components/ui/zen';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import { actualizarOrdenTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface TiposEventoListProps {
    studioSlug: string;
    tiposEvento: TipoEventoData[];
    paquetes: PaqueteFromDB[];
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
    onTiposEventoChange: (tiposEvento: TipoEventoData[]) => void;
    onPaquetesChange: (paquetes: PaqueteFromDB[]) => void;
}

// Componente para tipo de evento arrastrable
interface SortableTipoEventoCardProps {
    tipo: TipoEventoData & { paquetesCount: number; precioPromedio: number };
    onNavigateToTipoEvento: (tipoEvento: TipoEventoData) => void;
}

function SortableTipoEventoCard({ tipo, onNavigateToTipoEvento }: SortableTipoEventoCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tipo.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <ZenCard 
            ref={setNodeRef}
            style={style}
            className={`hover:scale-105 transition-transform cursor-pointer group ${
                isDragging ? 'shadow-2xl border-emerald-500' : ''
            }`}
            onClick={() => onNavigateToTipoEvento(tipo)}
        >
            <div className="p-6">
                {/* Header del tipo de evento */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Handle de arrastre */}
                        <div
                            {...attributes}
                            {...listeners}
                            className="cursor-grab hover:cursor-grabbing p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GripVertical className="w-4 h-4" />
                        </div>
                        
                        {tipo.icono && (
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                                <span className="text-lg">{tipo.icono}</span>
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                {tipo.nombre}
                            </h3>
                            {tipo.descripcion && (
                                <p className="text-sm text-zinc-400 mt-1">
                                    {tipo.descripcion}
                                </p>
                            )}
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                </div>

                {/* Estadísticas */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Paquetes</span>
                        <ZenBadge variant="secondary">
                            {tipo.paquetesCount} {tipo.paquetesCount === 1 ? 'paquete' : 'paquetes'}
                        </ZenBadge>
                    </div>
                    
                    {tipo.precioPromedio > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-400">Precio promedio</span>
                            <span className="text-sm font-medium text-emerald-400">
                                {formatearMoneda(tipo.precioPromedio)}
                            </span>
                        </div>
                    )}

                    {tipo.paquetesCount === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-zinc-500">
                                Sin paquetes configurados
                            </p>
                        </div>
                    )}
                </div>

                {/* Acción */}
                <div className="mt-4 pt-4 border-t border-zinc-800">
                    <ZenButton 
                        variant="secondary" 
                        className="w-full group-hover:bg-emerald-600 group-hover:text-white transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTipoEvento(tipo);
                        }}
                    >
                        Gestionar Paquetes
                    </ZenButton>
                </div>
            </div>
        </ZenCard>
    );
}

export function TiposEventoList({
    studioSlug,
    tiposEvento,
    paquetes,
    onNavigateToTipoEvento,
    onTiposEventoChange,
    onPaquetesChange
}: TiposEventoListProps) {
    const [loading, setLoading] = useState(false);
    const [localTiposEvento, setLocalTiposEvento] = useState<TipoEventoData[]>(tiposEvento);

    // Configurar sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Evita activación accidental
            },
        })
    );

    // Sincronizar estado local con props
    React.useEffect(() => {
        setLocalTiposEvento(tiposEvento);
    }, [tiposEvento]);

    // Manejar drag & drop
    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || !active) return;

            const activeId = String(active.id);
            const overId = String(over.id);

            if (activeId === overId) return;

            const activeIndex = localTiposEvento.findIndex(tipo => tipo.id === activeId);
            const overIndex = localTiposEvento.findIndex(tipo => tipo.id === overId);

            if (activeIndex === -1 || overIndex === -1) return;

            // Guardar estado original para revertir en caso de error
            const originalTipos = [...localTiposEvento];

            // Actualizar estado local inmediatamente (optimistic update)
            const newTipos = [...localTiposEvento];
            const [movedTipo] = newTipos.splice(activeIndex, 1);
            newTipos.splice(overIndex, 0, movedTipo);
            setLocalTiposEvento(newTipos);

            try {
                // Actualizar en el backend
                const result = await actualizarOrdenTiposEvento(studioSlug, {
                    tipos: newTipos.map((tipo, index) => ({
                        id: tipo.id,
                        orden: index
                    }))
                });

                if (result.success) {
                    toast.success('Orden actualizado exitosamente');
                    onTiposEventoChange(newTipos);
                } else {
                    toast.error(result.error || 'Error al actualizar el orden');
                    setLocalTiposEvento(originalTipos);
                }
            } catch (error) {
                console.error('Error updating order:', error);
                toast.error('Error al actualizar la posición');
                setLocalTiposEvento(originalTipos);
            }
        },
        [localTiposEvento, studioSlug, onTiposEventoChange]
    );

    // Calcular estadísticas por tipo de evento
    const tiposConStats = localTiposEvento.map(tipo => {
        const paquetesDelTipo = paquetes.filter(p => p.event_types?.name === tipo.nombre);
        const precioPromedio = paquetesDelTipo.length > 0 
            ? paquetesDelTipo.reduce((sum, p) => sum + (p.precio || 0), 0) / paquetesDelTipo.length
            : 0;
        
        return {
            ...tipo,
            paquetesCount: paquetesDelTipo.length,
            precioPromedio
        };
    });

    const handleCrearTipoEvento = () => {
        // TODO: Implementar modal de creación de tipo de evento
        console.log('Crear nuevo tipo de evento');
    };

    if (localTiposEvento.length === 0) {
        return (
            <div className="text-center py-12">
                <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                    No hay tipos de evento configurados
                </h3>
                <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                    Primero necesitas crear tipos de evento (Bodas, XV Años, etc.) antes de poder crear paquetes.
                </p>
                <ZenButton onClick={handleCrearTipoEvento}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Tipo de Evento
                </ZenButton>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Paquetes por Tipo de Evento</h2>
                        <p className="text-zinc-400 mt-1 text-sm sm:text-base">
                            Organiza tus paquetes según el tipo de evento. Arrastra para reordenar.
                        </p>
                    </div>
                    <ZenButton onClick={handleCrearTipoEvento} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Tipo de Evento
                    </ZenButton>
                </div>

                {/* Grid de tipos de evento con drag & drop */}
                <SortableContext
                    items={localTiposEvento.map(tipo => tipo.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                        {tiposConStats.map((tipo) => (
                            <SortableTipoEventoCard
                                key={tipo.id}
                                tipo={tipo}
                                onNavigateToTipoEvento={onNavigateToTipoEvento}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </DndContext>
    );
}
