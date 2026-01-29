'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { getReminderByPromise, type Reminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { getRelativeDateLabel } from '@/lib/utils/date-formatter';
import { ReminderFormModal } from '@/components/shared/reminders';

interface ReminderButtonProps {
  studioSlug: string;
  promiseId: string;
}

export function ReminderButton({ studioSlug, promiseId }: ReminderButtonProps) {
  const router = useRouter();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadReminder();
  }, [studioSlug, promiseId]);

  const loadReminder = async () => {
    setLoading(true);
    try {
      const result = await getReminderByPromise(studioSlug, promiseId);
      if (result.success) {
        setReminder(result.data);
      }
    } catch (error) {
      console.error('Error cargando seguimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ZenButton
        variant="ghost"
        size="sm"
        disabled
        className="gap-1.5 px-2.5 py-1.5 h-7 text-xs"
      >
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        <span>Cargando...</span>
      </ZenButton>
    );
  }

  const hasReminder = reminder && !reminder.is_completed;
  const dateStatus = hasReminder ? getRelativeDateLabel(reminder.reminder_date, { pastLabel: 'Vencido' }) : null;

  const reminderButtonClass =
    !hasReminder
      ? ''
      : dateStatus?.variant === 'destructive'
        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/30'
        : dateStatus?.variant === 'warning'
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/30'
          : 'bg-zinc-800/80 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-700/80 hover:border-zinc-500/50';

  return (
    <>
      <div className="flex items-center gap-1.5 cursor-pointer">
        <ZenButton
          variant="ghost"
          size="sm"
          onClick={() => setModalOpen(true)}
          className={`gap-1.5 px-2.5 py-1.5 h-7 text-xs rounded-md transition-colors cursor-pointer ${reminderButtonClass}`}
          title={hasReminder ? 'Editar seguimiento' : 'Agendar seguimiento'}
        >
          {hasReminder ? (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Seguimiento</span>
              {dateStatus && (
                <span className="text-white font-normal">{dateStatus.text}</span>
              )}
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Agendar seguimiento</span>
            </>
          )}
        </ZenButton>
      </div>

      <ReminderFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        studioSlug={studioSlug}
        promiseId={promiseId}
        existingReminder={reminder}
        onSuccess={() => {
          loadReminder();
          setModalOpen(false);
          router.refresh();
        }}
        onDeleted={() => {
          loadReminder();
          setModalOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
