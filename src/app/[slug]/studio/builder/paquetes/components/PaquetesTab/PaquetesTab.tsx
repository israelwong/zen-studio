'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Package, Settings } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { TiposEventoList } from './TiposEventoList';
import { PaquetesPorTipo } from './PaquetesPorTipo';
import { PaqueteFormularioAvanzado } from './PaqueteFormularioAvanzado';
import { PaquetesConfiguracion } from './PaquetesConfiguracion';
import { ArrowLeft } from 'lucide-react';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { obtenerPaquetes } from '@/lib/actions/studio/builder/catalogo/paquetes.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

type NavigationLevel = 1 | 2;
type TabType = 'paquetes' | 'configuracion';

interface PaquetesTabProps {
    studioSlug: string;
}

export function PaquetesTab({ studioSlug }: PaquetesTabProps) {
    // Estado de pestañas
    const [activeTab, setActiveTab] = useState<TabType>('paquetes');
    
    // Estado de navegación (solo para pestaña paquetes)
    const [currentLevel, setCurrentLevel] = useState<NavigationLevel>(1);
    const [selectedTipoEvento, setSelectedTipoEvento] = useState<TipoEventoData | null>(null);

    // Datos
    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>([]);
    const [paquetes, setPaquetes] = useState<PaqueteFromDB[]>([]);
    const [loading, setLoading] = useState(true);

    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);

            // Cargar tipos de evento y paquetes en paralelo
            const [tiposResult, paquetesResult] = await Promise.all([
                obtenerTiposEvento(studioSlug),
                obtenerPaquetes(studioSlug)
            ]);

            if (tiposResult.success && tiposResult.data) {
                setTiposEvento(tiposResult.data);
            } else {
                toast.error(tiposResult.error || 'Error al cargar tipos de evento');
            }

            if (paquetesResult.success && paquetesResult.data) {
                setPaquetes(paquetesResult.data);
            } else {
                toast.error(paquetesResult.error || 'Error al cargar paquetes');
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Navegación entre niveles
    const navigateToTipoEvento = (tipoEvento: TipoEventoData) => {
        setSelectedTipoEvento(tipoEvento);
        setCurrentLevel(2);
    };

    // navigateToPaquete eliminado - ahora se usa modal en PaquetesList

    const navigateBack = () => {
        if (currentLevel === 2) {
            setCurrentLevel(1);
            setSelectedTipoEvento(null);
        }
    };


    // Handlers para actualizar datos
    const handlePaquetesChange = (newPaquetes: PaqueteFromDB[]) => {
        setPaquetes(newPaquetes);
    };

    const handleTipoEventoChange = (newTiposEvento: TipoEventoData[]) => {
        setTiposEvento(newTiposEvento);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Tabs skeleton */}
                <div className="flex space-x-1 bg-zinc-800 p-1 rounded-lg w-fit">
                    <div className="h-10 bg-zinc-700 rounded w-24 animate-pulse"></div>
                    <div className="h-10 bg-zinc-700 rounded w-32 animate-pulse"></div>
                </div>
                
                {/* Content skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
                                <div className="h-5 bg-zinc-700 rounded w-3/4"></div>
                                <div className="h-8 bg-zinc-700 rounded w-1/2"></div>
                                <div className="flex gap-2 pt-2">
                                    <div className="h-8 bg-zinc-700 rounded flex-1"></div>
                                    <div className="h-8 bg-zinc-700 rounded w-8"></div>
                                    <div className="h-8 bg-zinc-700 rounded w-8"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex space-x-1 bg-zinc-800 p-1 rounded-lg w-fit">
                <ZenButton
                    variant={activeTab === 'paquetes' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('paquetes')}
                    className="flex items-center gap-2"
                >
                    <Package className="h-4 w-4" />
                    Paquetes
                </ZenButton>
                <ZenButton
                    variant={activeTab === 'configuracion' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('configuracion')}
                    className="flex items-center gap-2"
                >
                    <Settings className="h-4 w-4" />
                    Configuración
                </ZenButton>
            </div>

            {/* Tab Content */}
            {activeTab === 'paquetes' && (
                <>
                    {/* Renderizar según el nivel de navegación */}
                    {currentLevel === 1 && (
                        <TiposEventoList
                            studioSlug={studioSlug}
                            tiposEvento={tiposEvento}
                            paquetes={paquetes}
                            onNavigateToTipoEvento={navigateToTipoEvento}
                            onTiposEventoChange={handleTipoEventoChange}
                            onPaquetesChange={handlePaquetesChange}
                        />
                    )}

                    {currentLevel === 2 && selectedTipoEvento && (
                        <PaquetesPorTipo
                            studioSlug={studioSlug}
                            tipoEvento={selectedTipoEvento}
                            paquetes={paquetes.filter(p => p.event_types?.name === selectedTipoEvento.nombre)}
                            onNavigateBack={navigateBack}
                            onPaquetesChange={handlePaquetesChange}
                        />
                    )}
                </>
            )}

            {activeTab === 'configuracion' && (
                <PaquetesConfiguracion studioSlug={studioSlug} />
            )}
        </div>
    );
}
