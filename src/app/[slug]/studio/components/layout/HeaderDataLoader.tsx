'use client';

import { useEffect, useState } from 'react';
import { getAgendaCount } from '@/lib/actions/shared/agenda-unified.actions';
import { getRemindersDueCount, getRemindersDue } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getCurrentUserId } from '@/lib/actions/studio/notifications/notifications.actions';
import { obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';

interface HeaderDataLoaderProps {
  studioSlug: string;
  onDataLoaded: (data: {
    headerUserId: string | null;
    agendaCount: number;
    remindersCount: number;
    agendaEvents: AgendaItem[];
    remindersAlerts: ReminderWithPromise[]; // ✅ Recordatorios de hoy + próximos (sin vencidos) para AlertsPopover
  }) => void;
}

/**
 * Componente que carga datos no críticos del header después del primer render
 * para no bloquear el render inicial del layout
 */
export function HeaderDataLoader({ studioSlug, onDataLoaded }: HeaderDataLoaderProps) {
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (hasLoaded) return;

    const loadData = async () => {
      try {
        const [headerUserIdResult, agendaCountResult, remindersCountResult, agendaEventsResult, remindersAlertsResult, remindersResult] = await Promise.all([
          getCurrentUserId(studioSlug).catch(() => ({ success: false as const, error: 'Error' })),
          getAgendaCount(studioSlug).catch(() => ({ success: false as const, count: 0, error: 'Error' })),
          // El conteo se calculará basado en remindersAlertsResult.length
          Promise.resolve(0),
          obtenerAgendaUnificada(studioSlug, { filtro: 'all', startDate: new Date() }).then(result => {
            if (result.success && result.data) {
              const now = new Date();
              const filtered = result.data
                .filter(item => {
                  const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                  if (itemDate < now) {
                    return false;
                  }
                  
                  const metadata = item.metadata as Record<string, unknown> | null;
                  const agendaType = metadata?.agenda_type as string | undefined;
                  
                  if (agendaType === 'event_date') {
                    return false;
                  }
                  if (!agendaType && item.contexto === 'promise' && !item.type_scheduling) {
                    return false;
                  }
                  if (item.contexto === 'promise' && item.type_scheduling) {
                    return true;
                  }
                  if (item.contexto === 'evento') {
                    return true;
                  }
                  
                  return false;
                })
                .sort((a, b) => {
                  const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
                  const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
                  return dateA - dateB;
                })
                .slice(0, 6);
              
              return filtered;
            }
            return [];
          }).catch(() => []),
          Promise.all([
            getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'today' }),
            getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'all' }),
          ]).then(([today, all]) => {
            const alerts: ReminderWithPromise[] = [];
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setDate(todayEnd.getDate() + 1);

            // Obtener recordatorios de hoy
            if (today.success && today.data) {
              alerts.push(...today.data);
            }

            // Obtener recordatorios próximos (futuros, no vencidos)
            if (all.success && all.data) {
              const todayIds = new Set(alerts.map(r => r.id));
              all.data.forEach(r => {
                const reminderDate = new Date(r.reminder_date);
                reminderDate.setHours(0, 0, 0, 0);
                // Solo agregar si es futuro y no está ya en la lista
                if (reminderDate >= todayEnd && !todayIds.has(r.id)) {
                  alerts.push(r);
                }
              });
            }

            return alerts.sort((a, b) => {
              const dateA = new Date(a.reminder_date).getTime();
              const dateB = new Date(b.reminder_date).getTime();
              return dateA - dateB;
            });
          }).catch(() => []),
          Promise.all([
            getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'today' }),
            getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'all' }),
          ]).then(([today, all]) => {
            const reminders: ReminderWithPromise[] = [];
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setDate(todayEnd.getDate() + 1);

            // Obtener recordatorios de hoy
            if (today.success && today.data) {
              reminders.push(...today.data);
            }

            // Obtener recordatorios próximos (futuros)
            if (all.success && all.data) {
              const todayIds = new Set(reminders.map(r => r.id));
              all.data.forEach(r => {
                const reminderDate = new Date(r.reminder_date);
                reminderDate.setHours(0, 0, 0, 0);
                // Solo agregar si es futuro y no está ya en la lista
                if (reminderDate >= todayEnd && !todayIds.has(r.id)) {
                  reminders.push(r);
                }
              });
            }

            return reminders.sort((a, b) => {
              const dateA = new Date(a.reminder_date).getTime();
              const dateB = new Date(b.reminder_date).getTime();
              return dateA - dateB;
            });
          }).catch(() => []),
        ]);

        const loadedData = {
          headerUserId: headerUserIdResult.success ? headerUserIdResult.data : null,
          agendaCount: agendaCountResult.success ? (agendaCountResult.count || 0) : 0,
          remindersCount: remindersAlertsResult.length, // ✅ Contar solo hoy + próximos (sin vencidos)
          agendaEvents: agendaEventsResult,
          remindersAlerts: remindersAlertsResult,
          reminders: remindersResult,
        };
        
        onDataLoaded(loadedData);

        setHasLoaded(true);
      } catch (error) {
        console.error('[HeaderDataLoader] Error cargando datos:', error);
        // Enviar valores por defecto en caso de error
        onDataLoaded({
          headerUserId: null,
          agendaCount: 0,
          remindersCount: 0,
          agendaEvents: [],
          remindersAlerts: [],
          reminders: [],
        });
        setHasLoaded(true);
      }
    };

    // Cargar después de un pequeño delay para no bloquear el render inicial
    const timer = setTimeout(loadData, 100);
    return () => clearTimeout(timer);
  }, [studioSlug, onDataLoaded, hasLoaded]);

  return null;
}
