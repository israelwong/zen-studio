"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import { ZenCard, ZenButton } from "@/components/ui/zen";
import { Plus, Folder, MoreVertical, GripVertical, Edit2, Trash2 } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    mediaSize?: number;
    coverImage?: string;
}

interface SeccionesListViewProps {
    secciones: Seccion[];
    onSelectSeccion: (seccion: Seccion) => void;
    onCreateSeccion: () => void;
    onEditSeccion?: (seccion: Seccion) => void;
    onDeleteSeccion?: (seccionId: string) => void;
    onReorderSecciones?: (seccionIds: string[]) => Promise<void>;
    isLoading?: boolean;
}

// Helper para formatear bytes
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

/**
 * Componente NIVEL 1 de navegación
 * Lista de todas las secciones del catálogo con Drag & Drop
 * Permite crear nueva sección, reordenar y navegar a categorías
 */
function SeccionCard({
    seccion,
    onSelectSeccion,
    onEditSeccion,
    onDeleteSeccion,
}: {
    seccion: Seccion;
    onSelectSeccion: (seccion: Seccion) => void;
    onEditSeccion?: (seccion: Seccion) => void;
    onDeleteSeccion?: (seccionId: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: seccion.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const [menuOpen, setMenuOpen] = React.useState(false);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const cardElement = document.querySelector(`.card-${seccion.id}`);
            if (cardElement && !cardElement.contains(target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [seccion.id]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={isDragging ? "opacity-50" : ""}
        >
            <ZenCard
                className={`p-3 hover:bg-zinc-800/80 transition-colors group cursor-move card-${seccion.id}`}
            >
                <div className="flex items-center gap-4">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing flex-shrink-0"
                        title="Arrastra para reordenar"
                    >
                        <GripVertical className="w-5 h-5" />
                    </button>

                    {/* Imagen de portada o placeholder */}
                    <div
                        className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden cursor-pointer"
                        onClick={() => onSelectSeccion(seccion)}
                    >
                        {seccion.coverImage ? (
                            <Image
                                src={seccion.coverImage}
                                alt={seccion.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Folder className="w-6 h-6 text-zinc-500" />
                            </div>
                        )}
                    </div>

                    {/* Contenido principal */}
                    <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onSelectSeccion(seccion)}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-zinc-100 break-words">
                                {seccion.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                            <span>{seccion.categories?.length ?? 0} categorías</span>
                            <span>•</span>
                            <span>{seccion.items ?? 0} items</span>
                            <span>•</span>
                            <span>{formatBytes(seccion.mediaSize ?? 0)}</span>
                        </div>
                    </div>

                    {/* Botón de menú */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(!menuOpen);
                            }}
                            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition-colors flex-shrink-0"
                            title="Opciones"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Menú desplegable */}
                        {menuOpen && (
                            <div className={`absolute top-full right-0 mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 py-1 card-${seccion.id}`}>
                                {onEditSeccion && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditSeccion(seccion);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors text-left"
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                                    </button>
                                )}
                                {onDeleteSeccion && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteSeccion(seccion.id);
                                            setMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </ZenCard>
        </div>
    );
}

export function SeccionesListView({
    secciones,
    onSelectSeccion,
    onCreateSeccion,
    onEditSeccion,
    onDeleteSeccion,
    onReorderSecciones,
    isLoading = false,
}: SeccionesListViewProps) {
    const [ordenadas, setOrdenadas] = React.useState(secciones);

    React.useEffect(() => {
        setOrdenadas(secciones);
    }, [secciones]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = ordenadas.findIndex((s) => s.id === active.id);
            const newIndex = ordenadas.findIndex((s) => s.id === over.id);

            const newOrdenadas = arrayMove(ordenadas, oldIndex, newIndex);
            setOrdenadas(newOrdenadas);

            // Llamar callback si existe
            if (onReorderSecciones) {
                try {
                    await onReorderSecciones(newOrdenadas.map((s) => s.id));
                } catch (error) {
                    console.error("Error reordenando secciones:", error);
                    // Revertir cambio en UI
                    setOrdenadas(secciones);
                }
            }
        }
    }, [ordenadas, secciones, onReorderSecciones]);

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-100">Sección</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        Gestiona secciones, categorías e items (arrastra para reordenar)
                    </p>
                </div>
                <ZenButton
                    onClick={onCreateSeccion}
                    variant="primary"
                    className="gap-2"
                    disabled={isLoading}
                >
                    <Plus className="w-4 h-4" />
                    Nueva Sección
                </ZenButton>
            </div>

            {/* Secciones List con DND */}
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="h-16 bg-zinc-900 rounded-lg animate-pulse"
                        />
                    ))}
                </div>
            ) : ordenadas.length === 0 ? (
                <ZenCard className="p-12 text-center">
                    <Folder className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-4">
                        Aún no tienes secciones. Crea tu primera sección.
                    </p>
                    <ZenButton
                        onClick={onCreateSeccion}
                        variant="primary"
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Sección
                    </ZenButton>
                </ZenCard>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    key={`dnd-${ordenadas.length}`}
                >
                    <SortableContext
                        items={ordenadas.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {ordenadas.map((seccion) => (
                                <SeccionCard
                                    key={seccion.id}
                                    seccion={seccion}
                                    onSelectSeccion={onSelectSeccion}
                                    onEditSeccion={onEditSeccion}
                                    onDeleteSeccion={onDeleteSeccion}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* Resumen */}
            {ordenadas.length > 0 && (
                <div className="text-xs text-zinc-500 text-center">
                    Total: {ordenadas.length} sección{ordenadas.length !== 1 ? "es" : ""}
                </div>
            )}
        </div>
    );
}
