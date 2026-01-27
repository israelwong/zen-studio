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
    remindersAlerts: ReminderWithPromise[];
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
        const [headerUserIdResult, agendaCountResult, remindersCountResult, agendaEventsResult, remindersAlertsResult] = await Promise.all([
          getCurrentUserId(studioSlug).catch(() => ({ success: false as const, error: 'Error' })),
          getAgendaCount(studioSlug).catch(() => ({ success: false as const, count: 0, error: 'Error' })),
          Promise.all([
            getRemindersDueCount(studioSlug, { includeCompleted: false, dateRange: 'overdue' }),
            getRemindersDueCount(studioSlug, { includeCompleted: false, dateRange: 'today' }),
          ]).then(([overdue, today]) => {
            let total = 0;
            if (overdue.success && overdue.data !== undefined) total += overdue.data;
            if (today.success && today.data !== undefined) total += today.data;
            return total;
          }).catch(() => 0),
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
            getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'overdue' }),
            getRemindersDue(studioSlug, { includeCompleted: false, dateRange: 'today' }),
          ]).then(([overdue, today]) => {
            const alerts: ReminderWithPromise[] = [];
            if (overdue.success && overdue.data) alerts.push(...overdue.data);
            if (today.success && today.data) {
              const todayIds = new Set(alerts.map(r => r.id));
              today.data.forEach(r => {
                if (!todayIds.has(r.id)) alerts.push(r);
              });
            }
            return alerts.sort((a, b) => {
              const dateA = new Date(a.reminder_date).getTime();
              const dateB = new Date(b.reminder_date).getTime();
              return dateA - dateB;
            });
          }).catch(() => []),
        ]);

        const loadedData = {
          headerUserId: headerUserIdResult.success ? headerUserIdResult.data : null,
          agendaCount: agendaCountResult.success ? (agendaCountResult.count || 0) : 0,
          remindersCount: remindersCountResult,
          agendaEvents: agendaEventsResult,
          remindersAlerts: remindersAlertsResult,
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
