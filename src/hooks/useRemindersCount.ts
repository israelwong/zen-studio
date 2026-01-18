'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRemindersDue } from '@/lib/actions/studio/commercial/promises/reminders.actions';

interface UseRemindersCountOptions {
  studioSlug: string;
  enabled?: boolean;
}

interface UseRemindersCountReturn {
  count: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener el conteo de seguimientos pendientes (vencidos + hoy)
 */
export function useRemindersCount({
  studioSlug,
  enabled = true,
}: UseRemindersCountOptions): UseRemindersCountReturn {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCount = useCallback(async () => {
    if (!enabled || !studioSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener seguimientos vencidos y del día
      const [overdueResult, todayResult] = await Promise.all([
        getRemindersDue(studioSlug, {
          includeCompleted: false,
          dateRange: 'overdue',
        }),
        getRemindersDue(studioSlug, {
          includeCompleted: false,
          dateRange: 'today',
        }),
      ]);

      let totalCount = 0;
      
      if (overdueResult.success && overdueResult.data) {
        totalCount += overdueResult.data.length;
      }
      
      if (todayResult.success && todayResult.data) {
        totalCount += todayResult.data.length;
      }

      setCount(totalCount);
    } catch (err) {
      console.error('Error loading reminders count:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, enabled]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  // Escuchar eventos de actualización de seguimientos
  useEffect(() => {
    if (!enabled) return;

    const handleReminderUpdate = () => {
      loadCount();
    };

    window.addEventListener('reminder-updated', handleReminderUpdate);
    return () => {
      window.removeEventListener('reminder-updated', handleReminderUpdate);
    };
  }, [enabled, loadCount]);

  return {
    count,
    loading,
    error,
    refresh: loadCount,
  };
}
