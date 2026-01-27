'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  setupRealtimeAuth,
  createRealtimeChannel,
  RealtimeChannelPresets,
  subscribeToChannel,
} from '@/lib/realtime/core';

interface UsePromisesRealtimeProps {
  studioSlug: string;
  userId?: string | null; // ✅ OPTIMIZACIÓN: userId pre-obtenido en servidor (opcional para compatibilidad)
  onPromiseInserted?: (promiseId: string) => void;
  onPromiseUpdated?: (promiseId: string) => void;
  onPromiseDeleted?: (promiseId: string) => void;
}

export function usePromisesRealtime({
  studioSlug,
  userId, // ✅ OPTIMIZACIÓN: userId pre-obtenido en servidor
  onPromiseInserted,
  onPromiseUpdated,
  onPromiseDeleted,
}: UsePromisesRealtimeProps) {
  // ✅ PASO 4: Crear supabase una sola vez (fuera del useEffect para evitar recreaciones)
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMountedRef = useRef(true);
  const setupInProgressRef = useRef(false); // ✅ PASO 4: Prevenir múltiples setups simultáneos

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
      // Soporte para múltiples formatos: broadcast_changes y realtime.send
      const promiseId = p.payload?.record?.id
        || p.record?.id
        || p.new?.id
        || (p.new && typeof p.new === 'object' ? p.new.id : null)
        || (p.id ? p.id : null) as string;
      if (promiseId) {
        if (onPromiseInserted) {
          onPromiseInserted(promiseId);
        } else if (onPromiseUpdated) {
          onPromiseUpdated(promiseId);
        }
      }
    },
    [onPromiseInserted, onPromiseUpdated]
  );

  const handleUpdate = useCallback(
    (payload: unknown) => {
      if (!isMountedRef.current) return;
      console.log('[Realtime] Promesa actualizada:', payload);
      const p = payload as any;
      // Soporte para múltiples formatos: broadcast_changes y realtime.send
      const promiseId = p.payload?.record?.id
        || p.record?.id
        || p.new?.id
        || (p.new && typeof p.new === 'object' ? p.new.id : null)
        || (p.id ? p.id : null) as string;
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
      // Soporte para múltiples formatos: broadcast_changes y realtime.send
      const promiseId = p.payload?.old_record?.id
        || p.old_record?.id
        || p.old?.id
        || (p.old && typeof p.old === 'object' ? p.old.id : null)
        || (p.id ? p.id : null) as string;
      if (promiseId && onPromiseDeleted) {
        onPromiseDeleted(promiseId);
      }
    },
    [onPromiseDeleted]
  );

  // ✅ OPTIMIZACIÓN: Usar refs para callbacks para evitar re-ejecuciones del useEffect
  const handleInsertRef = useRef(handleInsert);
  const handleUpdateRef = useRef(handleUpdate);
  const handleDeleteRef = useRef(handleDelete);

  // Actualizar refs cuando cambian los callbacks
  useEffect(() => {
    handleInsertRef.current = handleInsert;
    handleUpdateRef.current = handleUpdate;
    handleDeleteRef.current = handleDelete;
  }, [handleInsert, handleUpdate, handleDelete]);

  useEffect(() => {
    if (!studioSlug) {
      console.warn('[usePromisesRealtime] No studio slug provided');
      return;
    }

    // ✅ PASO 4: Verificar si ya hay una conexión activa (evitar múltiples suscripciones)
    if (channelRef.current?.state === 'subscribed' || channelRef.current?.state === 'SUBSCRIBED') {
      console.log('[usePromisesRealtime] Canal ya suscrito, evitando duplicación');
      return;
    }

    // ✅ PASO 4: Prevenir múltiples ejecuciones simultáneas
    if (setupInProgressRef.current) {
      console.log('[usePromisesRealtime] Setup ya en progreso, evitando duplicación');
      return;
    }
    
    const setupRealtime = async () => {
      setupInProgressRef.current = true; // ✅ PASO 4: Marcar como en progreso
      try {
        console.log('[usePromisesRealtime] 🚀 Iniciando setup de Realtime (v2):', {
          studioSlug,
          timestamp: new Date().toISOString(),
        });

        // Promises siempre requieren autenticación (solo studio)
        const requiresAuth = true;

        // IMPORTANTE: Configurar autenticación ANTES de crear el canal
        const authResult = await setupRealtimeAuth(supabase, requiresAuth);

        if (!authResult.success) {
          console.error('[usePromisesRealtime] ❌ Error configurando auth:', authResult.error);
          return;
        }

        if (!authResult.hasSession) {
          console.error('[usePromisesRealtime] ❌ No hay sesión activa (requerida para promises)');
          return;
        }

        // ✅ OPTIMIZACIÓN CRÍTICA: Si userId viene del servidor, no hacer POST adicional
        // Solo validar permisos si NO se pasó userId (compatibilidad legacy)
        if (!userId) {
          console.warn('[usePromisesRealtime] ⚠️ userId no proporcionado, omitiendo validación de permisos');
          // En modo legacy, continuar sin validación (menos seguro pero evita POST)
        } else {
          console.log('[usePromisesRealtime] ✅ Usando userId del servidor:', userId);
        }

        // Crear configuración del canal usando preset
        // Con realtime.send usamos canales públicos (evita problemas de RLS/auth.uid() NULL)
        const channelConfig = RealtimeChannelPresets.promises(studioSlug, true); // true = canal público

        // Crear canal usando utilidad centralizada (después de setAuth)
        const channel = createRealtimeChannel(supabase, channelConfig);

        // Agregar listeners usando refs para evitar re-suscripciones
        // Nota: realtime.send envía eventos como 'broadcast' con el nombre de operación como event
        channel
          .on('broadcast', { event: 'INSERT' }, (payload) => handleInsertRef.current(payload))
          .on('broadcast', { event: 'UPDATE' }, (payload) => handleUpdateRef.current(payload))
          .on('broadcast', { event: 'DELETE' }, (payload) => handleDeleteRef.current(payload))
          // También escuchar eventos genéricos de realtime.send (formato alternativo)
          .on('broadcast', { event: '*' }, (payload: unknown) => {
            const p = payload as any;
            const operation = p.operation || p.event;
            if (operation === 'INSERT') handleInsertRef.current(payload);
            else if (operation === 'UPDATE') handleUpdateRef.current(payload);
            else if (operation === 'DELETE') handleDeleteRef.current(payload);
          });

        // Suscribirse usando utilidad centralizada
        await subscribeToChannel(channel, (status, err) => {
          if (err) {
            console.error('[usePromisesRealtime] ❌ Error en suscripción:', err);
          }
        });

        channelRef.current = channel;
        setupInProgressRef.current = false; // ✅ PASO 4: Marcar setup como completado
        console.log('[usePromisesRealtime] ✅ Canal configurado y suscrito exitosamente');
      } catch (error) {
        setupInProgressRef.current = false; // ✅ PASO 4: Resetear en caso de error
        console.error('[usePromisesRealtime] ❌ Error en setupRealtime:', error);
      }
    };

    setupRealtime();

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        console.log('[usePromisesRealtime] 🧹 Desuscribiéndose del canal');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug]); // ✅ PASO 4: Eliminar 'supabase' de dependencias (es estable, no cambia)
}

