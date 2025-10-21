import { useState, useEffect, useCallback } from 'react';
import { 
  obtenerStorageUsage, 
  actualizarStorageUsage,
  type StorageUsage 
} from '@/lib/actions/studio/builder/catalogo/storage.actions';
import { toast } from 'sonner';

export function useStorageTracking(studioSlug: string) {
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar storage inicial
  useEffect(() => {
    cargarStorageUsage();
  }, [studioSlug]);

  const cargarStorageUsage = async () => {
    try {
      setIsLoading(true);
      const result = await obtenerStorageUsage(studioSlug);
      if (result.success && result.data) {
        setStorageUsage(result.data);
      }
    } catch (error) {
      console.error("Error cargando storage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Agregar tamaño cuando sube media
  const addMediaSize = useCallback(
    async (bytes: number) => {
      try {
        const result = await actualizarStorageUsage(studioSlug, bytes, 'add');
        if (result.success) {
          // Actualizar estado local inmediatamente
          setStorageUsage(prev => {
            if (!prev) return null;
            return {
              ...prev,
              media_bytes: prev.media_bytes + BigInt(bytes),
              total_bytes: prev.total_bytes + BigInt(bytes),
            };
          });
        } else {
          toast.error(result.error || "Error al actualizar almacenamiento");
        }
      } catch (error) {
        console.error("Error agregando tamaño:", error);
        toast.error("Error al registrar archivo");
      }
    },
    [studioSlug]
  );

  // Remover tamaño cuando elimina media
  const removeMediaSize = useCallback(
    async (bytes: number) => {
      try {
        const result = await actualizarStorageUsage(studioSlug, bytes, 'remove');
        if (result.success) {
          // Actualizar estado local inmediatamente
          setStorageUsage(prev => {
            if (!prev) return null;
            return {
              ...prev,
              media_bytes: prev.media_bytes - BigInt(bytes),
              total_bytes: prev.total_bytes - BigInt(bytes),
            };
          });
        } else {
          toast.error(result.error || "Error al actualizar almacenamiento");
        }
      } catch (error) {
        console.error("Error removiendo tamaño:", error);
        toast.error("Error al eliminar archivo");
      }
    },
    [studioSlug]
  );

  return {
    storageUsage,
    isLoading,
    addMediaSize,
    removeMediaSize,
  };
}
