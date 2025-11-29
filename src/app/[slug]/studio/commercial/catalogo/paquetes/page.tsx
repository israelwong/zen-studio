'use client';

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { PaquetesTipoEventoList } from './components';
import { PaquetesTabSkeleton } from './PaquetesTabSkeleton';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { obtenerPaquetes } from '@/lib/actions/studio/paquetes/paquetes.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

export default function PaquetesPage() {
    const params = useParams();
    const router = useRouter();
    const studioSlug = params.slug as string;

    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>([]);
    const [paquetes, setPaquetes] = useState<PaqueteFromDB[]>([]);
    const [loading, setLoading] = useState(false);
    const loadedRef = useRef(false);

    // Función para cargar datos
    const cargarDatos = async () => {
        try {
            setLoading(true);
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
    };

    // Carga inicial al montar: cargar siempre que el componente se monte
    useLayoutEffect(() => {
        if (!loadedRef.current) {
            loadedRef.current = true;
            cargarDatos();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recargar datos cuando cambia studioSlug
    useEffect(() => {
        if (!loadedRef.current) return;

        // Si cambió studioSlug, recargar
        loadedRef.current = false;
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studioSlug]);

    const handleTiposEventoChange = useCallback((newTiposEvento: TipoEventoData[]) => {
        setTiposEvento(newTiposEvento);
    }, []);

    const handlePaquetesChange = (newPaquetes: PaqueteFromDB[]) => {
        setPaquetes(newPaquetes);
    };

    if (loading) {
        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ZenButton
                            variant="ghost"
                            onClick={() => router.push(`/${studioSlug}/studio/commercial/catalogo`)}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Regresar
                        </ZenButton>
                        <div className="p-3 bg-purple-600/20 rounded-lg">
                            <Package className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Paquetes</h1>
                            <p className="text-sm text-zinc-400">Gestiona tus paquetes de servicios</p>
                        </div>
                    </div>
                </div>

                {/* Skeleton */}
                <ZenCard variant="default" padding="none">
                    <ZenCardContent className="p-6">
                        <PaquetesTabSkeleton />
                    </ZenCardContent>
                </ZenCard>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ZenButton
                        variant="ghost"
                        onClick={() => router.push(`/${studioSlug}/studio/commercial/catalogo`)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Regresar
                    </ZenButton>
                    <div className="p-3 bg-purple-600/20 rounded-lg">
                        <Package className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Paquetes</h1>
                        <p className="text-sm text-zinc-400">Gestiona tus paquetes de servicios</p>
                    </div>
                </div>
            </div>

            {/* Contenido de Paquetes */}
            <ZenCard variant="default" padding="none">
                <ZenCardContent className="p-6">
                    <PaquetesTipoEventoList
                        studioSlug={studioSlug}
                        tiposEvento={tiposEvento}
                        paquetes={paquetes}
                        onTiposEventoChange={handleTiposEventoChange}
                        onPaquetesChange={handlePaquetesChange}
                    />
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
