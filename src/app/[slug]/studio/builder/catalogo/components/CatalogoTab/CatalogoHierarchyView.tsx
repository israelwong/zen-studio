"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import { ZenButton } from "@/components/ui/zen";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { SeccionEditorModal, SeccionFormData } from "./secciones";
import { CategoriaEditorModal, CategoriaFormData } from "./categorias";
import { ItemEditorModal, ItemFormData } from "./items";
import { ConfiguracionPrecios, calcularPrecio as calcularPrecioSistema } from "@/lib/actions/studio/builder/catalogo/calcular-precio";
import {
    crearSeccion,
    actualizarSeccion,
    eliminarSeccion,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    crearItem,
    actualizarItem,
    eliminarItem,
    obtenerCategoriasConStats,
    obtenerItemsConStats,
} from "@/lib/actions/studio/builder/catalogo";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/builder/catalogo/utilidad.actions";
import { reordenarSecciones } from "@/lib/actions/studio/builder/catalogo/secciones.actions";
import { reordenarCategorias } from "@/lib/actions/studio/builder/catalogo/categorias.actions";
import { reordenarItems } from "@/lib/actions/studio/builder/catalogo/items.actions";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    mediaSize?: number;
}

interface Categoria {
    id: string;
    name: string;
    description?: string;
    order?: number;
    items?: number;
    mediaSize?: number;
}

interface Item {
    id: string;
    name: string;
    cost: number;
    tipoUtilidad?: 'servicio' | 'producto';
    order?: number;
    isNew?: boolean;
    isFeatured?: boolean;
    mediaSize?: number;
    gastos?: Array<{
        nombre: string;
        costo: number;
    }>;
}

interface CatalogoHierarchyViewProps {
    studioSlug: string;
    secciones: Seccion[];
    onNavigateToUtilidad?: () => void;
}

export function CatalogoHierarchyView({
    studioSlug,
    secciones: initialSecciones,
    onNavigateToUtilidad,
}: CatalogoHierarchyViewProps) {
    // Datos
    const [secciones, setSecciones] = useState<Seccion[]>(initialSecciones);
    const [categoriasData, setCategoriasData] = useState<Record<string, Categoria[]>>({});
    const [itemsData, setItemsData] = useState<Record<string, Item[]>>({});
    const [preciosConfig, setPreciosConfig] = useState<ConfiguracionPrecios | null>(null);

    // Estados de carga
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    
    // Estados para drag & drop
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    
    // Configuración de sensores para drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Estados de modales
    const [isSeccionModalOpen, setIsSeccionModalOpen] = useState(false);
    const [seccionToEdit, setSeccionToEdit] = useState<Seccion | null>(null);
    const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
    const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);
    const [selectedSeccionForCategoria, setSelectedSeccionForCategoria] = useState<string | null>(null);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const [selectedCategoriaForItem, setSelectedCategoriaForItem] = useState<string | null>(null);

    // Estados de confirmación de eliminación
    const [isDeleteSeccionModalOpen, setIsDeleteSeccionModalOpen] = useState(false);
    const [seccionToDelete, setSeccionToDelete] = useState<Seccion | null>(null);
    const [isDeleteCategoriaModalOpen, setIsDeleteCategoriaModalOpen] = useState(false);
    const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
    const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

    // Cargar datos iniciales
    useEffect(() => {
        const loadConfiguracionPrecios = async () => {
            try {
                const response = await obtenerConfiguracionPrecios(studioSlug);
                if (response && response.utilidad_servicio) {
                    setPreciosConfig({
                        utilidad_servicio: parseFloat(response.utilidad_servicio),
                        utilidad_producto: parseFloat(response.utilidad_producto),
                        comision_venta: parseFloat(response.comision_venta),
                        sobreprecio: parseFloat(response.sobreprecio),
                    });
                }
            } catch (error) {
                console.error("Error loading price config:", error);
            }
        };

        const loadInitialData = async () => {
            try {
                setIsLoading(true);

                // Cargar todas las categorías y items para vista jerárquica completa
                const categoriasPromises = secciones.map(async (seccion) => {
                    try {
                        const response = await obtenerCategoriasConStats(seccion.id);
                        if (response.success && response.data) {
                            const categorias = response.data.map(cat => ({
                                id: cat.id,
                                name: cat.name,
                                description: cat.description || undefined,
                                order: cat.order,
                                items: cat.totalItems || 0,
                                mediaSize: cat.mediaSize,
                            }));

                            return { seccionId: seccion.id, categorias };
                        }
                        return { seccionId: seccion.id, categorias: [] };
                    } catch (error) {
                        console.error(`Error loading categories for section ${seccion.id}:`, error);
                        return { seccionId: seccion.id, categorias: [] };
                    }
                });

                const categoriasResults = await Promise.all(categoriasPromises);
                const newCategoriasData: Record<string, Categoria[]> = {};
                categoriasResults.forEach(({ seccionId, categorias }) => {
                    newCategoriasData[seccionId] = categorias;
                });

                setCategoriasData(newCategoriasData);

                // Cargar todos los items para vista completa
                const itemsPromises = categoriasResults.flatMap(({ seccionId, categorias }) =>
                    categorias.map(async (categoria) => {
                        try {
                            const response = await obtenerItemsConStats(categoria.id);
                            if (response.success && response.data) {
                                const items = response.data.map(item => ({
                                    id: item.id,
                                    name: item.name,
                                    cost: item.cost,
                                    tipoUtilidad: item.tipoUtilidad as 'servicio' | 'producto',
                                    order: item.order,
                                    isNew: false,
                                    isFeatured: false,
                                    mediaSize: item.mediaSize,
                                    gastos: item.gastos,
                                }));

                                return { categoriaId: categoria.id, items };
                            }
                            return { categoriaId: categoria.id, items: [] };
                        } catch (error) {
                            console.error(`Error loading items for category ${categoria.id}:`, error);
                            return { categoriaId: categoria.id, items: [] };
                        }
                    })
                );

                const itemsResults = await Promise.all(itemsPromises);
                const newItemsData: Record<string, Item[]> = {};
                itemsResults.forEach(({ categoriaId, items }) => {
                    newItemsData[categoriaId] = items;
                });

                setItemsData(newItemsData);

            } catch (error) {
                console.error("Error loading initial data:", error);
                toast.error("Error al cargar datos iniciales");
            } finally {
                setIsLoading(false);
                setIsInitialLoading(false);
            }
        };

        loadConfiguracionPrecios();
        loadInitialData();
    }, [studioSlug, secciones]);

    // Funciones de drag & drop
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleSeccionDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setActiveId(null);
            return;
        }

        const oldIndex = secciones.findIndex(item => item.id === active.id);
        const newIndex = secciones.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            setActiveId(null);
            return;
        }

        const originalSecciones = [...secciones];

        try {
            setIsReordering(true);
            const newSecciones = arrayMove(secciones, oldIndex, newIndex);
            setSecciones(newSecciones);

            const seccionIds = newSecciones.map(s => s.id);
            const response = await reordenarSecciones(studioSlug, seccionIds);
            
            if (!response.success) {
                throw new Error(response.error);
            }

            toast.success("Orden de secciones actualizado");
        } catch (error) {
            console.error("Error reordenando secciones:", error);
            toast.error("Error al actualizar el orden");
            setSecciones(originalSecciones);
        } finally {
            setIsReordering(false);
            setActiveId(null);
        }
    };

    const handleCategoriaDragEnd = async (event: DragEndEvent, seccionId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setActiveId(null);
            return;
        }

        const categorias = categoriasData[seccionId] || [];
        const oldIndex = categorias.findIndex(item => item.id === active.id);
        const newIndex = categorias.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            setActiveId(null);
            return;
        }

        const originalCategorias = [...categorias];

        try {
            setIsReordering(true);
            const newCategorias = arrayMove(categorias, oldIndex, newIndex);
            setCategoriasData(prev => ({
                ...prev,
                [seccionId]: newCategorias
            }));

            const categoriaIds = newCategorias.map(c => c.id);
            const response = await reordenarCategorias(categoriaIds);
            
            if (!response.success) {
                throw new Error(response.error);
            }

            toast.success("Orden de categorías actualizado");
        } catch (error) {
            console.error("Error reordenando categorías:", error);
            toast.error("Error al actualizar el orden");
            setCategoriasData(prev => ({
                ...prev,
                [seccionId]: originalCategorias
            }));
        } finally {
            setIsReordering(false);
            setActiveId(null);
        }
    };

    const handleItemDragEnd = async (event: DragEndEvent, categoriaId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setActiveId(null);
            return;
        }

        const items = itemsData[categoriaId] || [];
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            setActiveId(null);
            return;
        }

        const originalItems = [...items];

        try {
            setIsReordering(true);
            const newItems = arrayMove(items, oldIndex, newIndex);
            setItemsData(prev => ({
                ...prev,
                [categoriaId]: newItems
            }));

            const itemIds = newItems.map(i => i.id);
            const response = await reordenarItems(itemIds);
            
            if (!response.success) {
                throw new Error(response.error);
            }

            toast.success("Orden de items actualizado");
        } catch (error) {
            console.error("Error reordenando items:", error);
            toast.error("Error al actualizar el orden");
            setItemsData(prev => ({
                ...prev,
                [categoriaId]: originalItems
            }));
        } finally {
            setIsReordering(false);
            setActiveId(null);
        }
    };

    // Handlers para secciones
    const handleCreateSeccion = () => {
        setSeccionToEdit(null);
        setIsSeccionModalOpen(true);
    };

    const handleEditSeccion = (seccion: Seccion) => {
        setSeccionToEdit(seccion);
        setIsSeccionModalOpen(true);
    };

    const handleDeleteSeccion = (seccion: Seccion) => {
        setSeccionToDelete(seccion);
        setIsDeleteSeccionModalOpen(true);
    };

    const handleSaveSeccion = async (data: SeccionFormData) => {
        try {
            if (data.id) {
                const response = await actualizarSeccion(studioSlug, data);
                if (!response.success) throw new Error(response.error);

                setSecciones(prev => prev.map(s =>
                    s.id === data.id ? { ...s, name: data.name } : s
                ));
                toast.success("Sección actualizada");
            } else {
                const response = await crearSeccion(studioSlug, data);
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    setSecciones(prev => [...prev, response.data as Seccion]);
                    toast.success("Sección creada");
                }
            }

            setIsSeccionModalOpen(false);
            setSeccionToEdit(null);
        } catch (error) {
            console.error("Error guardando sección:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar sección");
        }
    };

    const handleConfirmDeleteSeccion = async () => {
        if (!seccionToDelete) return;

        try {
            setIsLoading(true);
            const response = await eliminarSeccion(studioSlug, seccionToDelete.id);
            if (!response.success) throw new Error(response.error);

            setSecciones(prev => prev.filter(s => s.id !== seccionToDelete.id));
            setCategoriasData(prev => {
                const newData = { ...prev };
                delete newData[seccionToDelete.id];
                return newData;
            });
            setItemsData(prev => {
                const newData = { ...prev };
                delete newData[seccionToDelete.id];
                return newData;
            });

            toast.success("Sección eliminada correctamente");
        } catch (error) {
            console.error("Error eliminando sección:", error);
            toast.error(error instanceof Error ? error.message : "Error al eliminar sección");
        } finally {
            setIsLoading(false);
            setIsDeleteSeccionModalOpen(false);
            setSeccionToDelete(null);
        }
    };

    // Handlers para categorías
    const handleCreateCategoria = (seccionId: string) => {
        setSelectedSeccionForCategoria(seccionId);
        setCategoriaToEdit(null);
        setIsCategoriaModalOpen(true);
    };

    const handleEditCategoria = (categoria: Categoria) => {
        setCategoriaToEdit(categoria);
        setIsCategoriaModalOpen(true);
    };

    const handleDeleteCategoria = (categoria: Categoria) => {
        setCategoriaToDelete(categoria);
        setIsDeleteCategoriaModalOpen(true);
    };

    const handleSaveCategoria = async (data: CategoriaFormData) => {
        try {
            if (data.id) {
                const response = await actualizarCategoria(data);
                if (!response.success) throw new Error(response.error);

                setCategoriasData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(seccionId => {
                        newData[seccionId] = newData[seccionId].map(cat =>
                            cat.id === data.id ? { ...cat, name: data.name, description: data.description || undefined } : cat
                        );
                    });
                    return newData;
                });
                toast.success("Categoría actualizada");
            } else {
                const response = await crearCategoria({
                    ...data,
                    seccionId: selectedSeccionForCategoria!,
                });
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    const newCategoria = {
                        id: response.data.id,
                        name: response.data.name,
                        description: response.data.description || undefined,
                        order: response.data.order,
                        items: 0,
                        mediaSize: response.data.mediaSize,
                    };

                    setCategoriasData(prev => ({
                        ...prev,
                        [selectedSeccionForCategoria!]: [
                            ...(prev[selectedSeccionForCategoria!] || []),
                            newCategoria
                        ]
                    }));
                    toast.success("Categoría creada");
                }
            }

            setIsCategoriaModalOpen(false);
            setCategoriaToEdit(null);
            setSelectedSeccionForCategoria(null);
        } catch (error) {
            console.error("Error guardando categoría:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar categoría");
        }
    };

    const handleConfirmDeleteCategoria = async () => {
        if (!categoriaToDelete) return;

        try {
            setIsLoading(true);
            const response = await eliminarCategoria(categoriaToDelete.id);
            if (!response.success) throw new Error(response.error);

            setCategoriasData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(seccionId => {
                    newData[seccionId] = newData[seccionId].filter(cat => cat.id !== categoriaToDelete.id);
                });
                return newData;
            });

            setItemsData(prev => {
                const newData = { ...prev };
                delete newData[categoriaToDelete.id];
                return newData;
            });

            toast.success("Categoría eliminada correctamente");
        } catch (error) {
            console.error("Error eliminando categoría:", error);
            toast.error(error instanceof Error ? error.message : "Error al eliminar categoría");
        } finally {
            setIsLoading(false);
            setIsDeleteCategoriaModalOpen(false);
            setCategoriaToDelete(null);
        }
    };

    // Handlers para items
    const handleCreateItem = (categoriaId: string) => {
        setSelectedCategoriaForItem(categoriaId);
        setItemToEdit(null);
        setIsItemModalOpen(true);
    };

    const handleEditItem = (item: Item) => {
        setItemToEdit(item);
        setIsItemModalOpen(true);
    };

    const handleDeleteItem = (item: Item) => {
        setItemToDelete(item);
        setIsDeleteItemModalOpen(true);
    };

    const handleSaveItem = async (data: ItemFormData) => {
        try {
            if (data.id) {
                const response = await actualizarItem(data);
                if (!response.success) throw new Error(response.error);

                setItemsData(prev => {
                    const newData = { ...prev };
                    Object.keys(newData).forEach(categoriaId => {
                        newData[categoriaId] = newData[categoriaId].map(item =>
                            item.id === data.id ? { ...item, name: data.name, cost: data.cost } : item
                        );
                    });
                    return newData;
                });
                toast.success("Item actualizado");
            } else {
                const response = await crearItem({
                    ...data,
                    categoriaId: selectedCategoriaForItem!,
                });
                if (!response.success) throw new Error(response.error);

                if (response.data) {
                    const newItem = {
                        id: response.data.id,
                        name: response.data.name,
                        cost: response.data.cost,
                        tipoUtilidad: response.data.tipoUtilidad as 'servicio' | 'producto',
                        order: response.data.order,
                        isNew: false,
                        isFeatured: false,
                        mediaSize: response.data.mediaSize,
                        gastos: response.data.gastos,
                    };

                    setItemsData(prev => ({
                        ...prev,
                        [selectedCategoriaForItem!]: [
                            ...(prev[selectedCategoriaForItem!] || []),
                            newItem
                        ]
                    }));

                    setCategoriasData(prev => {
                        const newData = { ...prev };
                        Object.keys(newData).forEach(seccionId => {
                            newData[seccionId] = newData[seccionId].map(cat =>
                                cat.id === selectedCategoriaForItem ? { ...cat, items: (cat.items || 0) + 1 } : cat
                            );
                        });
                        return newData;
                    });

                    toast.success("Item creado");
                }
            }

            setIsItemModalOpen(false);
            setItemToEdit(null);
            setSelectedCategoriaForItem(null);
        } catch (error) {
            console.error("Error guardando item:", error);
            toast.error(error instanceof Error ? error.message : "Error al guardar item");
        }
    };

    const handleConfirmDeleteItem = async () => {
        if (!itemToDelete) return;

        try {
            setIsLoading(true);
            const response = await eliminarItem(itemToDelete.id);
            if (!response.success) throw new Error(response.error);

            setItemsData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(categoriaId => {
                    newData[categoriaId] = newData[categoriaId].filter(item => item.id !== itemToDelete.id);
                });
                return newData;
            });

            setCategoriasData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(seccionId => {
                    newData[seccionId] = newData[seccionId].map(cat => {
                        const categoriaId = Object.keys(itemsData).find(id => 
                            itemsData[id].some(item => item.id === itemToDelete.id)
                        );
                        if (categoriaId === cat.id) {
                            return { ...cat, items: Math.max(0, (cat.items || 0) - 1) };
                        }
                        return cat;
                    });
                });
                return newData;
            });

            toast.success("Item eliminado correctamente");
        } catch (error) {
            console.error("Error eliminando item:", error);
            toast.error(error instanceof Error ? error.message : "Error al eliminar item");
        } finally {
            setIsLoading(false);
            setIsDeleteItemModalOpen(false);
            setItemToDelete(null);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Vista Jerárquica</h3>
                    <div className="text-xs text-zinc-500">Cargando estructura completa...</div>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 bg-zinc-700 rounded"></div>
                                    <div className="h-4 bg-zinc-700 rounded w-32"></div>
                                </div>
                                <div className="h-4 bg-zinc-700 rounded w-16"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Vista Jerárquica</h3>
                <ZenButton
                    onClick={handleCreateSeccion}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Sección
                </ZenButton>
            </div>

            {/* Estructura jerárquica completa */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleSeccionDragEnd}
            >
                <SortableContext
                    items={secciones.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-1">
                        {secciones
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((seccion) => {
                                const categorias = categoriasData[seccion.id] || [];
                                
                                return (
                                    <div key={seccion.id} className="bg-zinc-900/30 border border-zinc-800 rounded-lg overflow-hidden">
                                        {/* Sección */}
                                        <SortableSeccion seccion={seccion} categorias={categorias} />
                                        
                                        {/* Categorías de la sección */}
                                        {categorias.length > 0 && (
                                            <div className="bg-zinc-800/20 border-t border-zinc-700/30">
                                                <DndContext
                                                    sensors={sensors}
                                                    collisionDetection={closestCenter}
                                                    onDragStart={handleDragStart}
                                                    onDragEnd={(event) => handleCategoriaDragEnd(event, seccion.id)}
                                                >
                                                    <SortableContext
                                                        items={categorias.map(c => c.id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        {categorias
                                                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                            .map((categoria) => {
                                                                const items = itemsData[categoria.id] || [];
                                                                
                                                                return (
                                                                    <div key={categoria.id} className="border-t border-zinc-700/30">
                                                                        {/* Categoría */}
                                                                        <SortableCategoria 
                                                                            categoria={categoria} 
                                                                            seccionId={seccion.id}
                                                                        />
                                                                        
                                                                        {/* Items de la categoría */}
                                                                        {items.length > 0 && (
                                                                            <div className="bg-zinc-800/10 border-t border-zinc-700/20 ml-8">
                                                                                <DndContext
                                                                                    sensors={sensors}
                                                                                    collisionDetection={closestCenter}
                                                                                    onDragStart={handleDragStart}
                                                                                    onDragEnd={(event) => handleItemDragEnd(event, categoria.id)}
                                                                                >
                                                                                    <SortableContext
                                                                                        items={items.map(i => i.id)}
                                                                                        strategy={verticalListSortingStrategy}
                                                                                    >
                                                                                        {items
                                                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                            .map((item) => (
                                                                <SortableItem
                                                                    key={item.id}
                                                                    item={item}
                                                                    categoriaId={categoria.id}
                                                                />
                                                            ))}
                                                                                    </SortableContext>
                                                                                </DndContext>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                    </SortableContext>
                                                </DndContext>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </SortableContext>
                
                <DragOverlay>
                    {activeId ? (
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 opacity-90">
                            <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-zinc-500" />
                                <span className="text-sm text-white">
                                    {secciones.find(s => s.id === activeId)?.name || 
                                     categoriasData[Object.keys(categoriasData).find(key => 
                                         categoriasData[key].some(c => c.id === activeId)
                                     ) || '']?.find(c => c.id === activeId)?.name ||
                                     itemsData[Object.keys(itemsData).find(key => 
                                         itemsData[key].some(i => i.id === activeId)
                                     ) || '']?.find(i => i.id === activeId)?.name}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Modales */}
            <SeccionEditorModal
                isOpen={isSeccionModalOpen}
                onClose={() => {
                    setIsSeccionModalOpen(false);
                    setSeccionToEdit(null);
                }}
                onSave={handleSaveSeccion}
                seccion={seccionToEdit}
            />

            <CategoriaEditorModal
                isOpen={isCategoriaModalOpen}
                onClose={() => {
                    setIsCategoriaModalOpen(false);
                    setCategoriaToEdit(null);
                    setSelectedSeccionForCategoria(null);
                }}
                onSave={handleSaveCategoria}
                categoria={categoriaToEdit}
            />

            <ItemEditorModal
                isOpen={isItemModalOpen}
                onClose={() => {
                    setIsItemModalOpen(false);
                    setItemToEdit(null);
                    setSelectedCategoriaForItem(null);
                }}
                onSave={handleSaveItem}
                item={itemToEdit ? {
                    id: itemToEdit.id,
                    name: itemToEdit.name,
                    cost: itemToEdit.cost,
                    tipoUtilidad: itemToEdit.tipoUtilidad || 'servicio',
                    description: '',
                    gastos: itemToEdit.gastos || []
                } : undefined}
                categoriaId={selectedCategoriaForItem || ''}
                studioSlug={studioSlug}
            />

            <ZenConfirmModal
                isOpen={isDeleteSeccionModalOpen}
                onClose={() => {
                    setIsDeleteSeccionModalOpen(false);
                    setSeccionToDelete(null);
                }}
                onConfirm={handleConfirmDeleteSeccion}
                title="Eliminar sección"
                description={`¿Estás seguro de que deseas eliminar la sección "${seccionToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isLoading}
            />

            <ZenConfirmModal
                isOpen={isDeleteCategoriaModalOpen}
                onClose={() => {
                    setIsDeleteCategoriaModalOpen(false);
                    setCategoriaToDelete(null);
                }}
                onConfirm={handleConfirmDeleteCategoria}
                title="Eliminar categoría"
                description={`¿Estás seguro de que deseas eliminar la categoría "${categoriaToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isLoading}
            />

            <ZenConfirmModal
                isOpen={isDeleteItemModalOpen}
                onClose={() => {
                    setIsDeleteItemModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={handleConfirmDeleteItem}
                title="Eliminar item"
                description={`¿Estás seguro de que deseas eliminar el item "${itemToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="destructive"
                loading={isLoading}
            />
        </div>
    );
}

// Componentes sortables minimalistas
const SortableSeccion = ({ seccion, categorias }: { seccion: Seccion; categorias: Categoria[] }) => {
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

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 hover:bg-zinc-800/30 transition-colors">
            <div className="flex items-center gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1 hover:bg-zinc-700 rounded cursor-grab active:cursor-grabbing"
                    title="Arrastrar para reordenar"
                >
                    <GripVertical className="h-4 w-4 text-zinc-500" />
                </button>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                    <h4 className="font-semibold text-white">{seccion.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                            {categorias.length} categorías
                        </span>
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleCreateCategoria(seccion.id) */}}
                    className="w-8 h-8 p-0"
                >
                    <Plus className="w-4 h-4" />
                </ZenButton>
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleEditSeccion(seccion) */}}
                    className="w-8 h-8 p-0"
                >
                    <Edit2 className="w-4 h-4" />
                </ZenButton>
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleDeleteSeccion(seccion) */}}
                    className="w-8 h-8 p-0 text-red-400 hover:text-red-300"
                >
                    <Trash2 className="w-4 h-4" />
                </ZenButton>
            </div>
        </div>
    );
};

const SortableCategoria = ({ categoria, seccionId }: { categoria: Categoria; seccionId: string }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: categoria.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 pl-8 hover:bg-zinc-800/20 transition-colors">
            <div className="flex items-center gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1 hover:bg-zinc-700 rounded cursor-grab active:cursor-grabbing"
                    title="Arrastrar para reordenar"
                >
                    <GripVertical className="h-4 w-4 text-zinc-500" />
                </button>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <div>
                    <h5 className="text-sm font-medium text-zinc-300">{categoria.name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-1 rounded">
                            {categoria.items || 0} items
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleCreateItem(categoria.id) */}}
                    className="w-8 h-8 p-0"
                >
                    <Plus className="w-4 h-4" />
                </ZenButton>
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleEditCategoria(categoria) */}}
                    className="w-8 h-8 p-0"
                >
                    <Edit2 className="w-4 h-4" />
                </ZenButton>
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleDeleteCategoria(categoria) */}}
                    className="w-8 h-8 p-0 text-red-400 hover:text-red-300"
                >
                    <Trash2 className="w-4 h-4" />
                </ZenButton>
            </div>
        </div>
    );
};

const SortableItem = ({ item, categoriaId }: { item: Item; categoriaId: string }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="flex items-center justify-between p-2 pl-12 hover:bg-zinc-700/10 transition-colors"
        >
            <div className="flex items-center gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1 hover:bg-zinc-600 rounded cursor-grab active:cursor-grabbing"
                    title="Arrastrar para reordenar"
                >
                    <GripVertical className="h-4 w-4 text-zinc-500" />
                </button>
                <div className="w-1 h-1 bg-zinc-500 rounded-full"></div>
                <div>
                    <div className="text-sm text-white">{item.name}</div>
                    <div className="text-xs text-zinc-500">
                        {item.tipoUtilidad === 'servicio' ? 'Servicio' : 'Producto'}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleEditItem(item) */}}
                    className="w-8 h-8 p-0"
                >
                    <Edit2 className="w-4 h-4" />
                </ZenButton>
                <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* handleDeleteItem(item) */}}
                    className="w-8 h-8 p-0 text-red-400 hover:text-red-300"
                >
                    <Trash2 className="w-4 h-4" />
                </ZenButton>
            </div>
        </div>
    );
};
