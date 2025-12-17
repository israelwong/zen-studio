'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseCotizacionesRealtimeProps {
  studioSlug: string;
  promiseId?: string | null;
  onCotizacionInserted?: () => void;
  onCotizacionUpdated?: (cotizacionId: string) => void;
  onCotizacionDeleted?: (cotizacionId: string) => void;
}

export function useCotizacionesRealtime({
  studioSlug,
  promiseId,
  onCotizacionInserted,
  onCotizacionUpdated,
  onCotizacionDeleted,
}: UseCotizacionesRealtimeProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Función helper para extraer cotización del payload en diferentes formatos
  // realtime.broadcast_changes envía el payload con estructura: { new: {...}, old: {...}, schema, table, etc }
  const extractCotizacion = useCallback((payload: unknown, eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'UPDATE'): Record<string, unknown> | null => {
    if (!payload || typeof payload !== 'object') {
      console.warn('[useCotizacionesRealtime] Payload no es un objeto:', payload);
      return null;
    }

    const p = payload as any;

    console.log('[useCotizacionesRealtime] Extrayendo cotización del payload:', {
      hasPayload: !!p.payload,
      hasRecord: !!p.record,
      hasNew: !!p.new,
      hasOld: !!p.old,
      hasId: !!p.id,
      keys: Object.keys(p),
      eventType
    });

    // Formato 1: { new: {...} } o { old: {...} } (formato directo de broadcast_changes)
    if (eventType === 'UPDATE' || eventType === 'INSERT') {
      if (p.new && typeof p.new === 'object') {
        console.log('[useCotizacionesRealtime] Usando formato new');
        return p.new as Record<string, unknown>;
      }
    }
    if (eventType === 'DELETE') {
      if (p.old && typeof p.old === 'object') {
        console.log('[useCotizacionesRealtime] Usando formato old');
        return p.old as Record<string, unknown>;
      }
    }

    // Formato 2: { payload: { record: {...} } }
    if (p.payload?.record) {
      console.log('[useCotizacionesRealtime] Usando formato payload.record');
      return p.payload.record as Record<string, unknown>;
    }
    // Formato 3: { record: {...} }
    if (p.record) {
      console.log('[useCotizacionesRealtime] Usando formato record');
      return p.record as Record<string, unknown>;
    }
    // Formato 4: el payload mismo es la cotización
    if (p.id && (p.promise_id || p.studio_id)) {
      console.log('[useCotizacionesRealtime] Usando payload directo');
      return p as Record<string, unknown>;
    }

    console.warn('[useCotizacionesRealtime] No se pudo extraer cotización de ningún formato');
    return null;
  }, []);

  const handleInsert = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;

      const cotizacion = extractCotizacion(payload);
      if (!cotizacion) {
        console.warn('[Realtime] No se pudo extraer cotización del payload INSERT:', payload);
        return;
      }

      const cotizacionPromiseId = cotizacion.promise_id as string | null;

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        return;
      }

      console.log('[Realtime] Nueva cotización insertada:', { cotizacion, payload });
      const cotizacionId = cotizacion.id as string;
      if (cotizacionId && onCotizacionUpdated) {
        onCotizacionUpdated(cotizacionId);
      } else if (onCotizacionInserted) {
        onCotizacionInserted();
      }
    },
    [promiseId, onCotizacionInserted, onCotizacionUpdated, extractCotizacion]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;

      console.log('[useCotizacionesRealtime] UPDATE recibido, payload completo:', JSON.stringify(payload, null, 2));

      const cotizacion = extractCotizacion(payload, 'UPDATE');
      if (!cotizacion) {
        console.warn('[useCotizacionesRealtime] No se pudo extraer cotización del payload UPDATE:', payload);
        return;
      }

      const cotizacionPromiseId = cotizacion.promise_id as string | null;
      const cotizacionId = cotizacion.id as string;

      console.log('[useCotizacionesRealtime] Cotización extraída:', {
        cotizacionId,
        cotizacionPromiseId,
        promiseId,
        matchesPromise: promiseId ? cotizacionPromiseId === promiseId : true
      });

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        console.log('[useCotizacionesRealtime] Cotización no pertenece a la promesa, ignorando');
        return;
      }

      console.log('[useCotizacionesRealtime] Llamando onCotizacionUpdated con:', cotizacionId);
      if (cotizacionId && onCotizacionUpdated) {
        onCotizacionUpdated(cotizacionId);
      } else {
        console.warn('[useCotizacionesRealtime] No se puede llamar onCotizacionUpdated:', {
          hasCotizacionId: !!cotizacionId,
          hasCallback: !!onCotizacionUpdated
        });
      }
    },
    [promiseId, onCotizacionUpdated, extractCotizacion]
  );

  const handleDelete = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;

      const cotizacion = extractCotizacion(payload, 'DELETE');
      if (!cotizacion) {
        console.warn('[Realtime] No se pudo extraer cotización del payload DELETE:', payload);
        return;
      }

      const cotizacionPromiseId = cotizacion.promise_id as string | null;

      // Si se especifica promiseId, solo procesar cotizaciones de esa promesa
      if (promiseId && cotizacionPromiseId !== promiseId) {
        return;
      }

      console.log('[Realtime] Cotización eliminada:', { cotizacion, payload });
      const cotizacionId = cotizacion.id as string;
      if (cotizacionId && onCotizacionDeleted) {
        onCotizacionDeleted(cotizacionId);
      }
    },
    [promiseId, onCotizacionDeleted, extractCotizacion]
  );

  useEffect(() => {
    if (!studioSlug) {
      console.warn('[Realtime] No studio slug provided');
      return;
    }

    // Si no hay callbacks, no suscribirse (optimización)
    if (!onCotizacionInserted && !onCotizacionUpdated && !onCotizacionDeleted) {
      console.log('[Realtime] No hay callbacks configurados, no suscribiéndose');
      return;
    }

    // Verificar si ya hay una conexión activa
    if (channelRef.current?.state === 'subscribed') {
      console.log('[Realtime] Canal ya suscrito, evitando duplicación');
      return;
    }

    console.log('[Realtime] Suscribiéndose a cambios en cotizaciones para studio:', studioSlug, {
      promiseId,
      hasInsertCallback: !!onCotizacionInserted,
      hasUpdateCallback: !!onCotizacionUpdated,
      hasDeleteCallback: !!onCotizacionDeleted
    });

    // Crear canal privado con broadcast
    const channel = supabase
      .channel(`studio:${studioSlug}:cotizaciones`, {
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
          // Manejar errores de autorización de manera no crítica
          const isUnauthorized = err.message?.includes('Unauthorized') ||
            err.message?.includes('permissions') ||
            err.message?.includes('do not have permissions');

          if (isUnauthorized) {
            // Error de autorización: el usuario no tiene permisos RLS para este canal
            // Esto puede ser normal si el usuario no tiene perfil activo en el studio
            // o si el supabase_id no está sincronizado correctamente
            console.warn('[Realtime] Sin permisos para canal de cotizaciones (normal si no hay perfil activo o supabase_id no sincronizado):', err.message);
            return;
          }

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
  }, [studioSlug, promiseId, handleInsert, handleUpdate, handleDelete, supabase, onCotizacionInserted, onCotizacionUpdated, onCotizacionDeleted]);
}
