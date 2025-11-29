'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ShoppingBag, Package, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { ZenCard, ZenCardContent, ZenButton, ZenDialog } from '@/components/ui/zen';
import { UtilidadForm, CatalogoTab, PaquetesTab } from './tabs';
import { obtenerSeccionesConStats } from '@/lib/actions/studio/catalogo';
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

type TabType = 'catalogo' | 'paquetes';

export default function OfertaComercialPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [secciones, setSecciones] = useState<Seccion[]>([]);
    const [isUtilidadModalOpen, setIsUtilidadModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('catalogo');

    // Sincronizar con URL después de hidratar (solo una vez)
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!isInitialized) {
            const tabFromUrl = searchParams.get('tab') as TabType;
            if (tabFromUrl && (tabFromUrl === 'catalogo' || tabFromUrl === 'paquetes')) {
                setActiveTab(tabFromUrl);
            }
            setIsInitialized(true);
        }
    }, [searchParams, isInitialized]);

    // Actualizar URL cuando cambia la tab (sin leer searchParams para evitar loop)
    useEffect(() => {
        if (!isInitialized) return;
        router.replace(`?tab=${activeTab}`, { scroll: false });
    }, [activeTab, router, isInitialized]);

    useEffect(() => {
        const loadCatalogoData = async () => {
            try {
                const resultSecciones = await obtenerSeccionesConStats(studioSlug);

                if (resultSecciones.success && resultSecciones.data) {
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

            } catch (error) {
                console.error('Error cargando datos del catálogo:', error);
                toast.error('Error al cargar el catálogo');
            }
        };

        loadCatalogoData();
    }, [studioSlug]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 rounded-lg">
                        <ShoppingBag className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Oferta Comercial</h1>
                        <p className="text-sm text-zinc-400">Gestiona tu catálogo y paquetes de servicios</p>
                    </div>
                </div>
                <ZenButton
                    variant="outline"
                    onClick={() => setIsUtilidadModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <DollarSign className="h-4 w-4" />
                    Márgenes
                </ZenButton>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg mb-6 p-1">
                    <TabsList className="w-full bg-transparent h-auto gap-1 p-0 rounded-md grid grid-cols-2">
                        <TabsTrigger
                            value="catalogo"
                            className="rounded-md bg-transparent text-zinc-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-600/10 data-[state=active]:text-purple-300 hover:text-zinc-300 transition-all duration-200 py-2.5 px-4 flex items-center justify-center gap-2 font-medium text-sm border border-transparent data-[state=active]:border-purple-500/30"
                        >
                            <ShoppingBag className="h-4 w-4" />
                            <span>Catálogo</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="paquetes"
                            className="rounded-md bg-transparent text-zinc-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/20 data-[state=active]:to-purple-600/10 data-[state=active]:text-purple-300 hover:text-zinc-300 transition-all duration-200 py-2.5 px-4 flex items-center justify-center gap-2 font-medium text-sm border border-transparent data-[state=active]:border-purple-500/30"
                        >
                            <Package className="h-4 w-4" />
                            <span>Paquetes</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <ZenCard variant="default" padding="none">
                    <ZenCardContent className="p-6">
                        {activeTab === 'catalogo' && (
                            <TabsContent value="catalogo" className="mt-0">
                                <CatalogoTab
                                    studioSlug={studioSlug}
                                    secciones={secciones}
                                    isActive={true}
                                />
                            </TabsContent>
                        )}

                        {activeTab === 'paquetes' && (
                            <TabsContent value="paquetes" className="mt-0">
                                <PaquetesTab isActive={true} />
                            </TabsContent>
                        )}
                    </ZenCardContent>
                </ZenCard>
            </Tabs>

            {/* Modal de Márgenes */}
            <ZenDialog
                isOpen={isUtilidadModalOpen}
                onClose={() => setIsUtilidadModalOpen(false)}
                title="Márgenes de Utilidad"
                description="Gestiona los márgenes de utilidad, comisiones y sobreprecios"
                maxWidth="2xl"
                closeOnClickOutside={false}
            >
                <UtilidadForm
                    studioSlug={studioSlug}
                    onClose={() => setIsUtilidadModalOpen(false)}
                />
            </ZenDialog>
        </div>
    );
}
