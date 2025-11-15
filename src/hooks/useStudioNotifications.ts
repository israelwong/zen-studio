'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getStudioNotifications, getUnreadNotificationsCount, markNotificationAsRead, markNotificationAsClicked, getCurrentUserId, deleteNotificationAction } from '@/lib/actions/studio/notifications/notifications.actions';
import type { studio_notifications } from '@prisma/client';

// Tipo para payload de Realtime broadcast_changes
interface RealtimeBroadcastPayload {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  payload?: {
    record?: studio_notifications;
    old_record?: studio_notifications;
    operation?: string;
  };
  new?: studio_notifications;
  old?: studio_notifications;
}

interface UseStudioNotificationsOptions {
  studioSlug: string;
  enabled?: boolean;
}

interface UseStudioNotificationsReturn {
  notifications: studio_notifications[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsClicked: (notificationId: string, route?: string | null) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStudioNotifications({
  studioSlug,
  enabled = true,
}: UseStudioNotificationsOptions): UseStudioNotificationsReturn {
  const [notifications, setNotifications] = useState<studio_notifications[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const isMountedRef = useRef(true);
  // Singleton: crear cliente solo una vez
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  // Obtener userId (studio_user_profiles.id)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const result = await getCurrentUserId(studioSlug);
        if (result.success && result.data) {
          setUserId(result.data);
        } else {
          // Si no hay userId, dejar de cargar
          setLoading(false);
          setError(result.error || 'Usuario no encontrado');
        }
      } catch (error) {
        console.error('[useStudioNotifications] Error obteniendo usuario:', error);
        setLoading(false);
        setError('Error al obtener usuario');
      }
    };
    if (enabled) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [studioSlug, enabled]);

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const [notificationsResult, countResult] = await Promise.all([
        getStudioNotifications({
          studioSlug,
          userId,
          limit: 50,
        }),
        getUnreadNotificationsCount(studioSlug, userId),
      ]);

      if (notificationsResult.success && notificationsResult.data) {
        setNotifications(notificationsResult.data);
      } else {
        setError(notificationsResult.error || 'Error al cargar notificaciones');
      }

      if (countResult.success && countResult.data !== undefined) {
        setUnreadCount(countResult.data);
      }
    } catch (err) {
      console.error('[useStudioNotifications] Error:', err);
      setError('Error al cargar notificaciones');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [studioSlug, userId, enabled]);

  // Cargar notificaciones cuando cambie userId o studioSlug
  useEffect(() => {
    if (userId && enabled) {
      loadNotifications();
    }
  }, [userId, studioSlug, enabled, loadNotifications]);

  // Configurar Realtime - Escucha eventos automáticos desde el trigger de base de datos
  // IMPORTANTE: Esperar a que userId esté disponible (getCurrentUserId crea el perfil si no existe)
  // También esperar un momento para asegurar que el perfil esté completamente creado en la BD
  useEffect(() => {
    if (!studioSlug || !userId || !enabled) {
      console.log('[useStudioNotifications] Realtime deshabilitado:', {
        studioSlug,
        userId,
        enabled,
      });
      return;
    }

    const supabase = supabaseRef.current;
    if (!supabase) {
      console.error('[useStudioNotifications] ❌ Cliente Supabase no inicializado');
      setError('Cliente Supabase no inicializado');
      return;
    }

    console.log('[useStudioNotifications] Configurando Realtime:', {
      studioSlug,
      userId,
      channel: `studio:${studioSlug}:notifications`,
    });

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      console.log('[useStudioNotifications] Limpiando canal anterior');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `studio:${studioSlug}:notifications`;
    console.log('[useStudioNotifications] Creando canal:', channelName);

    // Configurar autenticación antes de crear el canal
    const setupRealtime = async () => {
      try {
        // Obtener sesión del cliente Supabase
        const supabase = supabaseRef.current!;
        const { data: { session: ssrSession }, error: ssrSessionError } = await supabase.auth.getSession();

        if (ssrSessionError || !ssrSession || !ssrSession.access_token) {
          console.error('[useStudioNotifications] ❌ No hay sesión SSR:', ssrSessionError);
          setError('No hay sesión de autenticación disponible');
          return;
        }

        // Usar getUser() para obtener un token más fresco y verificar autenticación
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !authUser) {
          console.error('[useStudioNotifications] ❌ No hay usuario autenticado:', userError);
          setError('No hay usuario autenticado');
          return;
        }

        // Ya tenemos ssrSession de arriba, no necesitamos obtenerla de nuevo
        const session = ssrSession;

        // Verificar supabaseRef
        const realtimeClient = supabaseRef.current;
        if (!realtimeClient) {
          console.error('[useStudioNotifications] ❌ Cliente Realtime no inicializado');
          setError('Cliente Realtime no inicializado');
          return;
        }

        // Establecer la sesión completa en el cliente de Realtime
        const { error: setSessionError } = await realtimeClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (setSessionError) {
          console.error('[useStudioNotifications] ❌ Error estableciendo sesión en cliente Realtime:', setSessionError);
          setError('Error al establecer sesión en cliente Realtime');
          return;
        }

        // Verificar que la sesión se estableció correctamente
        const { data: { session: realtimeSession }, error: verifyError } = await realtimeClient.auth.getSession();
        if (verifyError || !realtimeSession) {
          console.error('[useStudioNotifications] ❌ No se pudo verificar sesión en cliente Realtime:', verifyError);
          setError('No se pudo verificar sesión en cliente Realtime');
          return;
        }

        console.log('[useStudioNotifications] ✅ Sesión establecida en cliente Realtime:', {
          userId: realtimeSession.user.id,
          hasAccessToken: !!realtimeSession.access_token,
        });

        console.log('[useStudioNotifications] ✅ Usuario autenticado:', {
          userId: authUser.id,
          email: authUser.email,
          accessToken: session.access_token ? 'presente' : 'ausente',
          tokenLength: session.access_token?.length,
          tokenPreview: session.access_token?.substring(0, 20) + '...',
        });

        // Verificar que el usuario tiene studio_user_profiles con supabase_id
        // Esto ayuda a diagnosticar problemas de RLS
        console.log('[useStudioNotifications] 🔍 Verificando perfil de usuario...');
        try {
          // Primero obtener el studio_id
          const { data: studio } = await supabase
            .from('studios')
            .select('id')
            .eq('slug', studioSlug)
            .single();

          if (studio) {
            const { data: profileCheck, error: profileError } = await supabase
              .from('studio_user_profiles')
              .select('id, email, supabase_id, studio_id, is_active')
              .eq('supabase_id', session.user.id)
              .eq('studio_id', studio.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              console.warn('[useStudioNotifications] ⚠️ Error verificando perfil:', profileError);
            } else if (profileCheck) {
              console.log('[useStudioNotifications] 📋 Perfil encontrado:', {
                id: profileCheck.id,
                email: profileCheck.email,
                hasSupabaseId: !!profileCheck.supabase_id,
                supabaseIdMatch: profileCheck.supabase_id === session.user.id,
                studioId: profileCheck.studio_id,
                isActive: profileCheck.is_active,
              });
            } else {
              console.warn('[useStudioNotifications] ⚠️ No se encontró perfil con supabase_id.');
              console.warn('[useStudioNotifications] ⚠️ Esto puede causar problemas de RLS.');
              console.warn('[useStudioNotifications] ⚠️ El hook getCurrentUserId debería crear el perfil automáticamente.');
            }
          }
        } catch (profileError) {
          console.warn('[useStudioNotifications] ⚠️ Error verificando perfil:', profileError);
        }

        // Configurar autenticación Realtime ANTES de crear el canal
        // IMPORTANTE: createBrowserClient debería manejar la sesión automáticamente,
        // pero para canales privados necesitamos asegurarnos de que el token esté disponible
        console.log('[useStudioNotifications] 🔐 Configurando autenticación Realtime...');
        console.log('[useStudioNotifications] Token disponible:', {
          hasAccessToken: !!session.access_token,
          tokenLength: session.access_token?.length,
          tokenPreview: session.access_token?.substring(0, 30) + '...',
        });

        // La sesión ya está sincronizada arriba, no necesitamos refrescar

        console.log('[useStudioNotifications] ✅ Sesión sincronizada con cliente Realtime:', {
          userId: authUser.id,
          email: authUser.email,
          hasAccessToken: !!realtimeSession.access_token,
          tokenLength: realtimeSession.access_token.length,
        });

        // Configurar autenticación Realtime con el token actualizado
        // IMPORTANTE: Para canales privados, Realtime necesita el token JWT explícitamente
        // createBrowserClient de @supabase/ssr puede no compartir automáticamente la sesión con Realtime
        try {
          // Verificar que el token tiene el formato correcto (JWT tiene 3 partes separadas por puntos)
          const tokenParts = realtimeSession.access_token.split('.');
          if (tokenParts.length !== 3) {
            console.error('[useStudioNotifications] ❌ Token JWT inválido:', {
              parts: tokenParts.length,
              preview: realtimeSession.access_token.substring(0, 50),
            });
            setError('Token JWT inválido');
            return;
          }

          // Decodificar el payload del JWT para verificar que tiene 'sub'
          let tokenSub: string | null = null;
          try {
            const payload = JSON.parse(atob(tokenParts[1]));
            tokenSub = payload.sub;
            console.log('[useStudioNotifications] 🔍 Token JWT decodificado:', {
              sub: payload.sub,
              email: payload.email,
              exp: payload.exp,
              expDate: new Date(payload.exp * 1000).toISOString(),
              role: payload.role,
              isExpired: payload.exp * 1000 < Date.now(),
            });

            // Verificar que el 'sub' del token coincide con el userId esperado
            if (payload.sub !== authUser.id) {
              console.warn('[useStudioNotifications] ⚠️ Token sub no coincide con user.id:', {
                tokenSub: payload.sub,
                userId: authUser.id,
              });
            }

            // Verificar que el token no esté expirado
            if (payload.exp * 1000 < Date.now()) {
              console.error('[useStudioNotifications] ❌ Token expirado');
              setError('Token de autenticación expirado');
              return;
            }
          } catch (decodeError) {
            console.warn('[useStudioNotifications] ⚠️ No se pudo decodificar payload del token:', decodeError);
          }

          // IMPORTANTE: Configurar autenticación Realtime ANTES de crear el canal
          // Aunque la documentación dice que setAuth() sin argumentos debería funcionar,
          // en algunos casos es necesario pasar el token explícitamente para canales privados
          console.log('[useStudioNotifications] 🔐 Estableciendo autenticación Realtime...');

          // Pasar el token explícitamente para asegurar que Realtime lo use correctamente
          // Esto es necesario porque las políticas RLS evalúan auth.uid() en tiempo real
          realtimeClient!.realtime.setAuth(realtimeSession.access_token);

          // Verificar que la autenticación se estableció correctamente
          // Esperar un momento para que se propague al servidor Realtime
          await new Promise(resolve => setTimeout(resolve, 1000));

          console.log('[useStudioNotifications] ✅ Autenticación Realtime configurada', {
            tokenSub,
            userId: authUser.id,
            tokenLength: realtimeSession.access_token.length,
          });
        } catch (authError) {
          console.error('[useStudioNotifications] ❌ Error configurando auth Realtime:', authError);
          setError('Error al configurar autenticación Realtime: ' + (authError instanceof Error ? authError.message : 'Unknown error'));
          return;
        }

        const channel = realtimeClient
          .channel(channelName, {
            config: {
              private: true, // Volvemos a true porque broadcast_changes requiere canales privados
              broadcast: { self: true, ack: true },
            },
          })
          // Escuchar INSERT - Nueva notificación creada
          .on('broadcast', { event: 'INSERT' }, (payload: unknown) => {
            console.log('[useStudioNotifications] 🔔 Evento INSERT recibido:', payload);

            if (!isMountedRef.current) return;

            // broadcast_changes envía: { payload: { record, old_record, operation } }
            const broadcastPayload = payload as RealtimeBroadcastPayload;
            const newNotification = broadcastPayload?.payload?.record || broadcastPayload?.new;

            if (newNotification) {
              console.log('[useStudioNotifications] ✅ Nueva notificación:', {
                id: newNotification.id,
                user_id: newNotification.user_id,
                current_user_id: userId,
                matches: newNotification.user_id === userId,
              });

              // Solo agregar si es para este usuario
              if (newNotification.user_id === userId) {
                setNotifications((prev) => {
                  if (prev.some((n) => n.id === newNotification.id)) return prev;
                  return [newNotification, ...prev];
                });

                if (!newNotification.is_read) {
                  setUnreadCount((prev) => prev + 1);
                }
              }
            }
          })
          // Escuchar UPDATE - Notificación actualizada (marcada como leída, clickeada, etc.)
          .on('broadcast', { event: 'UPDATE' }, (payload: unknown) => {
            console.log('[useStudioNotifications] 🔄 Evento UPDATE recibido:', payload);

            if (!isMountedRef.current) return;

            const broadcastPayload = payload as RealtimeBroadcastPayload;
            const updatedNotification = broadcastPayload?.payload?.record || broadcastPayload?.new;

            if (updatedNotification && updatedNotification.user_id === userId) {
              if (!updatedNotification.is_active) {
                setNotifications((prev) => prev.filter((n) => n.id !== updatedNotification.id));
                if (!updatedNotification.is_read) {
                  setUnreadCount((prev) => Math.max(0, prev - 1));
                }
              } else {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
                );
                if (updatedNotification.is_read) {
                  setUnreadCount((prev) => Math.max(0, prev - 1));
                }
              }
            }
          })
          // Escuchar DELETE - Notificación eliminada
          .on('broadcast', { event: 'DELETE' }, (payload: unknown) => {
            console.log('[useStudioNotifications] 🗑️ Evento DELETE recibido:', payload);

            if (!isMountedRef.current) return;

            const broadcastPayload = payload as RealtimeBroadcastPayload;
            const deletedNotification = broadcastPayload?.payload?.old_record || broadcastPayload?.old;

            if (deletedNotification && deletedNotification.user_id === userId) {
              setNotifications((prev) => prev.filter((n) => n.id !== deletedNotification.id));
              if (!deletedNotification.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
              }
            }
          })
          .subscribe(async (status, err) => {
            // Obtener información de sesión para diagnóstico
            if (!supabaseRef.current) return;
            const { data: { session: currentSession } } = await supabaseRef.current.auth.getSession();

            // Decodificar parcialmente el JWT para diagnóstico (solo header y payload, sin firma)
            let tokenInfo = null;
            if (currentSession?.access_token) {
              try {
                const parts = currentSession.access_token.split('.');
                if (parts.length === 3) {
                  const header = JSON.parse(atob(parts[0]));
                  const payload = JSON.parse(atob(parts[1]));
                  tokenInfo = {
                    header: { alg: header.alg, typ: header.typ },
                    payload: {
                      sub: payload.sub,
                      email: payload.email,
                      exp: payload.exp,
                      expDate: new Date(payload.exp * 1000).toISOString(),
                      iat: payload.iat,
                      role: payload.role,
                    },
                  };
                }
              } catch (e) {
                console.warn('[useStudioNotifications] ⚠️ No se pudo decodificar token:', e);
              }
            }

            console.log('[useStudioNotifications] 📡 Estado de suscripción:', {
              status,
              error: err ? {
                message: err.message,
                code: 'code' in err ? err.code : undefined,
                name: err.name,
                stack: err.stack?.substring(0, 200),
              } : null,
              channel: channelName,
              userId,
              sessionUserId: currentSession?.user.id,
              tokenInfo,
            });

            if (status === 'SUBSCRIBED') {
              console.log('[useStudioNotifications] ✅ Suscrito exitosamente a notificaciones Realtime');
              console.log('[useStudioNotifications] Canal activo:', {
                name: channelName,
                state: channel.state,
              });
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[useStudioNotifications] ❌ Error en canal:', err);
              if (err) {
                console.error('[useStudioNotifications] Detalles completos del error:', {
                  message: err.message,
                  code: 'code' in err ? err.code : undefined,
                  name: err.name,
                  stack: err.stack,
                  toString: err.toString(),
                });

                // Si es error de autorización, dar instrucciones específicas
                if (err.message?.includes('Unauthorized') || err.message?.includes('permissions')) {
                  console.error('[useStudioNotifications] 🔴 ERROR DE AUTORIZACIÓN RLS');
                  console.error('[useStudioNotifications] Diagnóstico completo:');
                  console.error('  1. Usuario autenticado (session.user.id):', currentSession?.user.id);
                  console.error('  2. Token sub (JWT payload.sub):', tokenInfo?.payload.sub);
                  console.error('  3. ¿Coinciden?:', currentSession?.user.id === tokenInfo?.payload.sub);
                  console.error('  4. Token presente:', !!currentSession?.access_token);
                  console.error('  5. Token expira:', tokenInfo?.payload.expDate);
                  console.error('  6. Canal:', channelName);
                  console.error('  7. Studio Slug:', studioSlug);
                  console.error('[useStudioNotifications] ⚠️ IMPORTANTE:');
                  console.error('  El token sub DEBE coincidir con supabase_id en studio_user_profiles');
                  console.error('  Verifica en Supabase SQL Editor:');
                  console.error(`  SELECT supabase_id FROM studio_user_profiles WHERE email = '${currentSession?.user.email}';`);
                  console.error(`  Debe ser igual a: ${tokenInfo?.payload.sub}`);
                  console.error('[useStudioNotifications] Acciones:');
                  console.error('  1. Ejecuta VERIFICAR_TOKEN_Y_PERFIL.sql en Supabase SQL Editor');
                  console.error('  2. Verifica que studio_user_profiles tenga supabase_id correcto');
                  console.error('  3. Verifica que las políticas RLS estén aplicadas');
                  console.error('  4. Verifica que el usuario tenga is_active = true');
                }
              }
            } else if (status === 'TIMED_OUT') {
              console.warn('[useStudioNotifications] ⏱️ Timeout al suscribirse');
            } else if (status === 'CLOSED') {
              console.log('[useStudioNotifications] 🔒 Canal cerrado');
            }
          });

        channelRef.current = channel;
      } catch (authError) {
        console.error('[useStudioNotifications] ❌ Error configurando Realtime:', authError);
        setError('Error al configurar Realtime: ' + (authError instanceof Error ? authError.message : 'Unknown error'));
      }
    };

    setupRealtime();

    return () => {
      console.log('[useStudioNotifications] 🧹 Limpiando suscripción Realtime');
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [studioSlug, userId, enabled]);

  // Marcar como leída
  // Nota: El UPDATE se manejará automáticamente por Realtime desde el trigger
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    try {
      await markNotificationAsRead(notificationId, userId);
      // El estado se actualizará automáticamente vía Realtime UPDATE event
    } catch (err) {
      console.error('[useStudioNotifications] Error marcando como leída:', err);
    }
  }, [userId]);

  // Marcar como clickeada
  // Actualización optimista + Realtime como backup
  const handleMarkAsClicked = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      // Actualización optimista inmediata
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        const wasUnread = notification && !notification.is_read;

        // Decrementar contador si no estaba leída
        if (wasUnread) {
          setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
        }

        // Actualizar notificación
        return prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, clicked_at: new Date(), read_at: new Date() }
            : n
        );
      });

      try {
        await markNotificationAsClicked(notificationId, userId);
        // El estado se actualizará también vía Realtime UPDATE event como backup
      } catch (err) {
        console.error('[useStudioNotifications] Error marcando como clickeada:', err);
        // Revertir en caso de error
        await loadNotifications();
      }
    },
    [userId, loadNotifications]
  );

  // Eliminar notificación
  // Actualización optimista + Realtime como backup
  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      // Guardar referencia de la notificación antes de eliminarla
      const notificationToDelete = notifications.find((n) => n.id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.is_read;

      // Actualización optimista inmediata
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // Decrementar contador si no estaba leída
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await deleteNotificationAction(notificationId, userId);
        // El estado se actualizará también vía Realtime DELETE event como backup
      } catch (err) {
        console.error('[useStudioNotifications] Error eliminando notificación:', err);
        // Revertir en caso de error
        await loadNotifications();
      }
    },
    [userId, notifications, loadNotifications]
  );

  // Refresh manual
  const refresh = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead: handleMarkAsRead,
    markAsClicked: handleMarkAsClicked,
    deleteNotification: handleDeleteNotification,
    refresh,
  };
}

