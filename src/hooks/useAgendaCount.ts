'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAgendaCount } from '@/lib/actions/shared/agenda-unified.actions';

interface UseAgendaCountOptions {
    studioSlug: string;
    enabled?: boolean;
}

interface UseAgendaCountReturn {
    count: number;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useAgendaCount({
    studioSlug,
    enabled = true,
}: UseAgendaCountOptions): UseAgendaCountReturn {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCount = useCallback(async () => {
        if (!enabled || !studioSlug) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await getAgendaCount(studioSlug);

            if (result.success && result.count !== undefined) {
                setCount(result.count);
            } else {
                setError(result.error || 'Error al obtener conteo');
            }
        } catch (err) {
            console.error('Error loading agenda count:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [studioSlug, enabled]);

    useEffect(() => {
        loadCount();
    }, [loadCount]);

    // Escuchar eventos de actualización de agenda
    useEffect(() => {
        if (!enabled) return;

        const handleAgendaUpdate = () => {
            loadCount();
        };

        window.addEventListener('agenda-updated', handleAgendaUpdate);
        return () => {
            window.removeEventListener('agenda-updated', handleAgendaUpdate);
        };
    }, [enabled, loadCount]);

    return {
        count,
        loading,
        error,
        refresh: loadCount,
    };
}
