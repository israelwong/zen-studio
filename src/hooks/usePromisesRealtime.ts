'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UsePromisesRealtimeProps {
  studioSlug: string;
  onPromiseInserted?: () => void;
  onPromiseUpdated?: (promiseId: string) => void;
  onPromiseDeleted?: (promiseId: string) => void;
}

export function usePromisesRealtime({
  studioSlug,
  onPromiseInserted,
  onPromiseUpdated,
  onPromiseDeleted,
}: UsePromisesRealtimeProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleInsert = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      console.log('[Realtime] Nueva promesa insertada:', payload);
      const p = payload as any;
      const promiseId = p.payload?.record?.id || p.record?.id || p.new?.id || (p.id ? p.id : null) as string;
      if (promiseId && onPromiseUpdated) {
        onPromiseUpdated(promiseId);
      } else if (onPromiseInserted) {
        onPromiseInserted();
      }
    },
    [onPromiseInserted, onPromiseUpdated]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      console.log('[Realtime] Promesa actualizada:', payload);
      const p = payload as any;
      const promiseId = p.payload?.record?.id || p.record?.id || p.new?.id || (p.id ? p.id : null) as string;
      if (promiseId && onPromiseUpdated) {
        onPromiseUpdated(promiseId);
      }
    },
    [onPromiseUpdated]
  );

  const handleDelete = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      console.log('[Realtime] Promesa eliminada:', payload);
      const p = payload as any;
      const promiseId = p.payload?.record?.id || p.record?.id || p.old?.id || (p.id ? p.id : null) as string;
      if (promiseId && onPromiseDeleted) {
        onPromiseDeleted(promiseId);
      }
    },
    [onPromiseDeleted]
  );

  useEffect(() => {
    if (!studioSlug) {
      console.warn('[Realtime] No studio slug provided');
      return;
    }

    // Verificar si ya hay una conexión activa
    if (channelRef.current?.state === 'subscribed') {
      console.log('[Realtime] Canal ya suscrito, evitando duplicación');
      return;
    }

    console.log('[Realtime] Suscribiéndose a cambios en promesas para studio:', studioSlug);

    // Crear canal privado con broadcast
    const channel = supabase
      .channel(`studio:${studioSlug}:promises`, {
        config: {
          private: true,
          broadcast: { self: true, ack: true }
        }
      })
      .on('broadcast', { event: 'INSERT' }, handleInsert)
      .on('broadcast', { event: 'UPDATE' }, handleUpdate)
      .on('broadcast', { event: 'DELETE' }, handleDelete)
      .subscribe((status, err) => {
        if (!isMountedRef.current) return;

        if (err) {
          console.error('[Realtime] Error en suscripción:', err);
          return;
        }

        console.log('[Realtime] Estado de suscripción:', status);
      });

    channelRef.current = channel;

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Desuscribiéndose del canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug, handleInsert, handleUpdate, handleDelete, supabase]);
}

