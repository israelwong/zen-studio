'use client';

import React from 'react';
import {
    ZenCard,
    ZenButton,
    ZenBadge
} from '@/components/ui/zen';
import { Edit, Trash2, GripVertical, Percent, Clock, AlertTriangle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CondicionComercialData } from '../types';

interface CondicionComercialItemProps {
    condicion: CondicionComercialData;
    onEditar: (condicion: CondicionComercialData) => void;
    onEliminar: (condicionId: string) => void;
}

export function CondicionComercialItem({
    condicion,
    onEditar,
    onEliminar
}: CondicionComercialItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: condicion.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <ZenCard
            ref={setNodeRef}
            style={style}
            variant="default"
            padding="lg"
            className={`transition-all duration-200 hover:shadow-lg ${isDragging ? 'opacity-50 scale-95' : ''
                } ${condicion.status === 'inactive' ? 'opacity-60' : ''}`}
        >
            <div className="flex items-center justify-between">
                {/* Información Principal */}
                <div className="flex items-center space-x-4 flex-1">
                    {/* Handle de arrastre */}
                    <div
                        className="cursor-move text-zinc-400 hover:text-zinc-300"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">
                                {condicion.nombre}
                            </h3>
                            <ZenBadge
                                variant={condicion.status === 'active' ? 'success' : 'secondary'}
                            >
                                {condicion.status === 'active' ? 'Activa' : 'Inactiva'}
                            </ZenBadge>
                        </div>

                        {condicion.descripcion && (
                            <p className="text-zinc-400 text-sm mb-3">
                                {condicion.descripcion}
                            </p>
                        )}

                        {/* Detalles de la condición */}
                        <div className="flex items-center space-x-6 text-sm">
                            {/* Descuento */}
                            <div className="flex items-center space-x-1">
                                <Percent className="h-4 w-4 text-green-400" />
                                <span className={condicion.porcentaje_descuento && condicion.porcentaje_descuento > 0 ? "text-green-400" : "text-zinc-500"}>
                                    {condicion.porcentaje_descuento && condicion.porcentaje_descuento > 0
                                        ? `${condicion.porcentaje_descuento}% descuento`
                                        : "Sin descuento"
                                    }
                                </span>
                            </div>

                            {/* Anticipo */}
                            <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-blue-400" />
                                <span className={condicion.porcentaje_anticipo && condicion.porcentaje_anticipo > 0 ? "text-blue-400" : "text-zinc-500"}>
                                    {condicion.porcentaje_anticipo && condicion.porcentaje_anticipo > 0
                                        ? `${condicion.porcentaje_anticipo}% anticipo`
                                        : "Sin anticipo"
                                    }
                                </span>
                            </div>

                            {/* Mensaje cuando no hay ninguno configurado */}
                            {(!condicion.porcentaje_descuento || condicion.porcentaje_descuento === 0) &&
                                (!condicion.porcentaje_anticipo || condicion.porcentaje_anticipo === 0) && (
                                    <div className="flex items-center space-x-1 text-zinc-500">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>Sin descuentos ni anticipos</span>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center space-x-2">
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditar(condicion)}
                        className="text-zinc-400 hover:text-white"
                    >
                        <Edit className="h-4 w-4" />
                    </ZenButton>
                    <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onEliminar(condicion.id)}
                        className="text-zinc-400 hover:text-red-400"
                    >
                        <Trash2 className="h-4 w-4" />
                    </ZenButton>
                </div>
            </div>
        </ZenCard>
    );
}
