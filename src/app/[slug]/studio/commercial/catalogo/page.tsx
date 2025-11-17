'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Store, DollarSign } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDialog } from '@/components/ui/zen';
import { UtilidadTab, CatalogoTab, CatalogoTabSkeleton } from './tabs';
import { GuiaDeUso } from './guia';
import { obtenerSeccionesConStats } from '@/lib/actions/studio/catalogo';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import type { ConfiguracionPrecios } from '@/lib/actions/studio/catalogo/calcular-precio';
import { toast } from 'sonner';

interface Seccion {
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    categories?: Array<{ id: string; name: string }>;
    items?: number;
    mediaSize?: number;
}

export default function CatalogoPage() {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [secciones, setSecciones] = useState<Seccion[]>([]);
    const [studioConfig, setStudioConfig] = useState<ConfiguracionPrecios | null>(null);
    const [isUtilidadModalOpen, setIsUtilidadModalOpen] = useState(false);

    // Cargar secciones y configuración de precios
    useEffect(() => {
        const loadCatalogoData = async () => {
            try {
                const [resultSecciones, config] = await Promise.all([
                    obtenerSeccionesConStats(studioSlug),
                    obtenerConfiguracionPrecios(studioSlug),
                ]);

                if (resultSecciones.success && resultSecciones.data) {
                    // Transformar datos de secciones al formato esperado
                    const seccionesTransformadas = resultSecciones.data.map((seccion: {
                        id: string;
                        name: string;
                        order: number;
                        createdAt: Date;
                        totalCategorias?: number;
                        totalItems?: number;
                        mediaSize?: number;
                    }) => ({
                        id: seccion.id,
                        name: seccion.name,
                        order: seccion.order,
                        createdAt: seccion.createdAt,
                        categories: seccion.totalCategorias ? Array(seccion.totalCategorias).fill(null) : [],
                        items: seccion.totalItems ?? 0,
                        mediaSize: seccion.mediaSize ?? 0,
                    }));
                    setSecciones(seccionesTransformadas);
                }

                if (config) {
                    setStudioConfig({
                        utilidad_servicio: Number(config.utilidad_servicio),
                        utilidad_producto: Number(config.utilidad_producto),
                        sobreprecio: Number(config.sobreprecio),
                        comision_venta: Number(config.comision_venta),
                    });
                }
            } catch (error) {
                console.error('Error cargando datos del catálogo:', error);
                toast.error('Error al cargar el catálogo');
            }
        };

        loadCatalogoData();
    }, [studioSlug]);

    return (
        <div className="space-y-8">
            {/* Grid de 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna 1: Catálogo */}
                <div className="space-y-6">
                    <ZenCard variant="default" padding="none">
                        <ZenCardHeader className="border-b border-zinc-800">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-600/20 rounded-lg">
                                        <Store className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <ZenCardTitle>Catálogo</ZenCardTitle>
                                        <ZenCardDescription>
                                            Gestiona secciones, categorías e items
                                        </ZenCardDescription>
                                    </div>
                                </div>
                                <ZenButton
                                    variant="outline"
                                    onClick={() => setIsUtilidadModalOpen(true)}
                                    className="flex items-center gap-2"
                                >
                                    <DollarSign className="h-4 w-4" />
                                    Utilidad
                                </ZenButton>
                            </div>
                        </ZenCardHeader>

                        <ZenCardContent className="p-6">
                            {!studioConfig ? (
                                <CatalogoTabSkeleton />
                            ) : (
                                <CatalogoTab
                                    studioSlug={studioSlug}
                                    secciones={secciones}
                                />
                            )}
                        </ZenCardContent>
                    </ZenCard>
                </div>

                {/* Columna 2: Guía de uso */}
                <div className="space-y-6">
                    <GuiaDeUso />
                </div>
            </div>

            {/* Modal de Configuración de Utilidad */}
            <ZenDialog
                isOpen={isUtilidadModalOpen}
                onClose={() => setIsUtilidadModalOpen(false)}
                title="Configuración de Márgenes de Utilidad"
                description="Gestiona los márgenes de utilidad, comisiones y sobreprecios para tus servicios y productos"
                maxWidth="2xl"
                closeOnClickOutside={false}
            >
                <UtilidadTab
                    studioSlug={studioSlug}
                    onClose={() => setIsUtilidadModalOpen(false)}
                />
            </ZenDialog>
        </div>
    );
}
