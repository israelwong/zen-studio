'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';

interface RealtimeContextType {
  isConnected: boolean;
  connectionError: string | null;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: React.ReactNode;
  studioSlug: string;
  enabled?: boolean;
}

export function RealtimeProvider({ 
  children, 
  studioSlug, 
  enabled = true 
}: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const isMountedRef = useRef(true);
  const supabase = createClient();

  useEffect(() => {
    if (!enabled || !studioSlug) {
      return;
    }

    isMountedRef.current = true;

    const setupRealtime = async () => {
      try {
        // Verificar que hay sesión activa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.warn('[RealtimeProvider] No hay sesión activa, saltando Realtime');
          return;
        }

        // Limpiar canal anterior si existe
        if (channelRef.current) {
          // Verificar estado antes de remover
          if (channelRef.current.state === 'subscribed' || channelRef.current.state === 'joined') {
            supabase.removeChannel(channelRef.current);
          }
          channelRef.current = null;
        }

        const channelName = `studio:${studioSlug}:notifications`;

        // Crear canal para notificaciones
        // Este canal base asegura que Realtime esté inicializado
        // Los hooks específicos (useStudioNotifications) crearán sus propios canales
        const channel = supabase
          .channel(channelName, {
            config: {
              private: true,
              broadcast: { self: true, ack: true },
            },
          })
          .subscribe((status, err) => {
            if (!isMountedRef.current) return;

            if (err) {
              console.error('[RealtimeProvider] Error en suscripción:', err);
              setConnectionError(err.message);
              setIsConnected(false);
              return;
            }

            if (status === 'SUBSCRIBED') {
              console.log('[RealtimeProvider] ✅ Suscrito a Realtime:', channelName);
              setIsConnected(true);
              setConnectionError(null);
            } else if (status === 'CHANNEL_ERROR') {
              // CHANNEL_ERROR es manejado automáticamente por el cliente con reintentos
              // No es crítico, solo logueamos para debugging
              console.warn('[RealtimeProvider] Error en canal (reintentando automáticamente):', err?.message || 'Error desconocido');
              // No establecemos error crítico aquí ya que el cliente reintentará
              setIsConnected(false);
            } else if (status === 'TIMED_OUT') {
              console.warn('[RealtimeProvider] Timeout en suscripción (reintentando automáticamente)');
              // El cliente reintentará automáticamente
              setIsConnected(false);
            } else if (status === 'CLOSED') {
              console.log('[RealtimeProvider] Canal cerrado');
              setIsConnected(false);
            }
          });

        channelRef.current = channel;

      } catch (error) {
        console.error('[RealtimeProvider] Error configurando Realtime:', error);
        if (isMountedRef.current) {
          setConnectionError(error instanceof Error ? error.message : 'Error desconocido');
          setIsConnected(false);
        }
      }
    };

    setupRealtime();

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [studioSlug, enabled, supabase]);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionError }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

