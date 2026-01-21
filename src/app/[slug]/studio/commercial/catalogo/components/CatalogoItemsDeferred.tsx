'use client';

import { use, useEffect } from 'react';
import type { ActionResponse } from '@/lib/actions/schemas/catalogo-schemas';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';

interface CatalogoItemsDeferredProps {
    itemsPromise: Promise<ActionResponse<SeccionData[]>>;
    onItemsLoaded?: (itemsData: Record<string, any[]>, categoriasData: Record<string, any[]>) => void;
}

/**
 * ⚠️ STREAMING: Componente deferred (usa use() de React 19)
 * Resuelve la promesa de items del catálogo y notifica al componente padre
 */
export function CatalogoItemsDeferred({
    itemsPromise,
    onItemsLoaded,
}: CatalogoItemsDeferredProps) {
    // ⚠️ React 19: use() resuelve la promesa y suspende si no está lista
    const result = use(itemsPromise);

    useEffect(() => {
        if (!result.success || !result.data || !onItemsLoaded) {
            return;
        }

        // Procesar datos de items
        const categoriasData: Record<string, Array<{
            id: string;
            name: string;
            description?: string;
            order: number;
            items: number;
        }>> = {};
        const itemsData: Record<string, Array<{
            id: string;
            name: string;
            cost: number;
            tipoUtilidad: 'servicio' | 'producto';
            billing_type: 'HOUR' | 'SERVICE' | 'UNIT';
            order: number;
            status: string;
            isNew: boolean;
            isFeatured: boolean;
            categoriaId: string;
            gastos: Array<{ nombre: string; costo: number }>;
        }>> = {};

        result.data.forEach((seccion) => {
            categoriasData[seccion.id] = seccion.categorias.map(cat => ({
                id: cat.id,
                name: cat.nombre,
                description: undefined,
                order: cat.orden,
                items: cat.servicios.length,
            }));

            seccion.categorias.forEach(cat => {
                itemsData[cat.id] = cat.servicios.map(servicio => {
                    const tipoUtilidad: 'servicio' | 'producto' =
                        servicio.tipo_utilidad === 'service' ? 'servicio'
                            : servicio.tipo_utilidad === 'product' ? 'producto'
                                : 'servicio';
                    return {
                        id: servicio.id,
                        name: servicio.nombre,
                        cost: servicio.costo,
                        tipoUtilidad,
                        billing_type: (servicio.billing_type || 'SERVICE') as 'HOUR' | 'SERVICE' | 'UNIT',
                        order: servicio.orden,
                        status: servicio.status || "active",
                        isNew: false,
                        isFeatured: false,
                        categoriaId: cat.id,
                        gastos: servicio.gastos?.map(g => ({
                            nombre: g.nombre,
                            costo: g.costo,
                        })) || [],
                    };
                });
            });
        });

        // Notificar al componente padre cuando los datos estén listos
        onItemsLoaded(itemsData, categoriasData);
    }, [result, onItemsLoaded]);

    // Este componente no renderiza nada visible, solo procesa datos
    return null;
}
