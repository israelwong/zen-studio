'use client';

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PromiseWithContact } from '@/lib/actions/schemas/promises-schemas';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UsePromisesRealtimeProps {
  studioId: string;
  onPromiseInserted: (promise: PromiseWithContact) => void;
  onPromiseUpdated: (promiseId: string) => void;
  onPromiseDeleted: (promiseId: string) => void;
}

export function usePromisesRealtime({
  studioId,
  onPromiseInserted,
  onPromiseUpdated,
  onPromiseDeleted,
}: UsePromisesRealtimeProps) {
  const supabase = createClient();

  const handleInsert = useCallback(
    async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('[Realtime] Nueva promesa insertada:', payload);
      
      // Recargar promesas cuando se inserta una nueva
      // Usamos el callback para que el componente decida cómo actualizar
      onPromiseUpdated(payload.new.id as string);
    },
    [onPromiseUpdated]
  );

  const handleUpdate = useCallback(
    async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('[Realtime] Promesa actualizada:', payload);
      onPromiseUpdated(payload.new.id as string);
    },
    [onPromiseUpdated]
  );

  const handleDelete = useCallback(
    async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log('[Realtime] Promesa eliminada:', payload);
      onPromiseDeleted(payload.old.id as string);
    },
    [onPromiseDeleted]
  );

  useEffect(() => {
    if (!studioId) {
      console.warn('[Realtime] No studio ID provided');
      return;
    }

    console.log('[Realtime] Suscribiéndose a cambios en promesas para studio:', studioId);

    // Crear canal de Realtime
    const channel = supabase
      .channel(`promises-${studioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'studio_promises',
          filter: `studio_id=eq.${studioId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'studio_promises',
          filter: `studio_id=eq.${studioId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'studio_promises',
          filter: `studio_id=eq.${studioId}`,
        },
        handleDelete
      )
      .subscribe((status) => {
        console.log('[Realtime] Estado de suscripción:', status);
      });

    // Cleanup al desmontar
    return () => {
      console.log('[Realtime] Desuscribiéndose del canal');
      supabase.removeChannel(channel);
    };
  }, [studioId, handleInsert, handleUpdate, handleDelete, supabase]);
}

