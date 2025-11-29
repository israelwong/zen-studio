'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PaquetesTipoEventoList } from './components';
import { PaquetesTabSkeleton } from './PaquetesTabSkeleton';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import { obtenerPaquetes } from '@/lib/actions/studio/paquetes/paquetes.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaquetesTabProps {
    isActive?: boolean;
}

export function PaquetesTab({ isActive = true }: PaquetesTabProps) {
    const params = useParams();
    const studioSlug = params.slug as string;

    const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>([]);
    const [paquetes, setPaquetes] = useState<PaqueteFromDB[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Cargar cuando la tab se activa por primera vez
    useEffect(() => {
        if (!isActive || hasLoaded || loading) return;

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
                setHasLoaded(true);
            }
        };

        cargarDatos();
    }, [isActive, hasLoaded, loading, studioSlug]);

    const handleTiposEventoChange = useCallback((newTiposEvento: TipoEventoData[]) => {
        setTiposEvento(newTiposEvento);
    }, []);

    const handlePaquetesChange = (newPaquetes: PaqueteFromDB[]) => {
        setPaquetes(newPaquetes);
    };

    if (loading) {
        return <PaquetesTabSkeleton />;
    }

    return (
        <PaquetesTipoEventoList
            studioSlug={studioSlug}
            tiposEvento={tiposEvento}
            paquetes={paquetes}
            onTiposEventoChange={handleTiposEventoChange}
            onPaquetesChange={handlePaquetesChange}
        />
    );
}
