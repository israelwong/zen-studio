'use client';

import { useEffect, useState, useCallback } from 'react';
import { obtenerIdentidadStudio } from '@/lib/actions/studio/profile/identidad';
import type { IdentidadData } from '@/app/[slug]/studio/business/identity/types';

interface UseStudioDataOptions {
  studioSlug: string;
  onUpdate?: (data: IdentidadData) => void;
  enabled?: boolean; // ✅ OPTIMIZACIÓN: Permitir deshabilitar la carga
}

export function useStudioData({ studioSlug, onUpdate, enabled = true }: UseStudioDataOptions) {
  const [identidadData, setIdentidadData] = useState<IdentidadData | null>(null);
  const [loading, setLoading] = useState(enabled); // ✅ OPTIMIZACIÓN: No cargar si disabled
  const [error, setError] = useState<string | null>(null);

  // Memoizar refetch para que sea estable entre renders
  const refetch = useCallback(async () => {
    if (!studioSlug) return;

    try {
      setLoading(true);
      setError(null);

      const data = await obtenerIdentidadStudio(studioSlug);

      if ('error' in data) {
        throw new Error(data.error);
      }

      setIdentidadData(data);
      onUpdate?.(data);
    } catch (err) {
      setError('Error al recargar datos del estudio');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, onUpdate]);

  // ✅ OPTIMIZACIÓN: Solo cargar si está habilitado
  useEffect(() => {
    if (!studioSlug || !enabled) {
      setLoading(false);
      return;
    }

    const loadStudioData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await obtenerIdentidadStudio(studioSlug);

        if ('error' in data) {
          throw new Error(data.error);
        }

        setIdentidadData(data);
        onUpdate?.(data);
      } catch (err) {
        setError('Error al cargar datos del estudio');

        // Fallback a datos por defecto
        const fallbackData: IdentidadData = {
          id: studioSlug,
          studio_name: 'Studio',
          slug: studioSlug,
          slogan: null,
          presentacion: null,
          palabras_clave: [],
          logo_url: null
        };

        setIdentidadData(fallbackData);
        onUpdate?.(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    loadStudioData();
  }, [studioSlug, onUpdate, enabled]);

  return {
    identidadData,
    loading,
    error,
    refetch
  };
}
