'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenBadge } from '@/components/ui/zen';
import { 
  getRemindersDue,
  completeReminder,
  type ReminderWithPromise 
} from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { logWhatsAppSent } from '@/lib/actions/studio/commercial/promises';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ReminderCard } from './ReminderCard';

interface RemindersSideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
}

export function RemindersSideSheet({
  open,
  onOpenChange,
  studioSlug,
}: RemindersSideSheetProps) {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderWithPromise[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const loadReminders = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    try {
      const result = await getRemindersDue(studioSlug, {
        includeCompleted: false,
        dateRange: 'all',
      });

      if (result.success && result.data) {
        setReminders(result.data);
      } else {
        toast.error(result.error || 'Error al cargar seguimientos');
      }
    } catch (error) {
      console.error('Error cargando seguimientos:', error);
      toast.error('Error al cargar seguimientos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, open]);

  useEffect(() => {
    if (open) {
      loadReminders();
    }
  }, [open, loadReminders]);

  // Separar en vencidos y del día
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const overdueReminders = reminders.filter(r => {
    const date = new Date(r.reminder_date);
    return date < todayStart;
  });

  const todayReminders = reminders.filter(r => {
    const date = new Date(r.reminder_date);
    return date >= todayStart && date < todayEnd;
  });

  const handleComplete = async (reminderId: string) => {
    // Optimistic update
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    setCompletingIds(prev => new Set(prev).add(reminderId));

    try {
      const result = await completeReminder(studioSlug, reminderId);
      
      if (result.success) {
        toast.success('Seguimiento completado');
        // Disparar evento para actualizar contador
        window.dispatchEvent(new CustomEvent('reminder-updated'));
        // Recargar para asegurar sincronización
        loadReminders();
      } else {
        // Revertir optimistic update
        loadReminders();
        toast.error(result.error || 'Error al completar seguimiento');
      }
    } catch (error) {
      // Revertir optimistic update
      loadReminders();
      console.error('Error completando seguimiento:', error);
      toast.error('Error al completar seguimiento');
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(reminderId);
        return next;
      });
    }
  };

  const handleWhatsApp = async (reminder: ReminderWithPromise) => {
    if (!reminder.promise.contact.phone) {
      toast.error('No hay teléfono disponible para este contacto');
      return;
    }

    const cleanPhone = reminder.promise.contact.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${reminder.promise.contact.name}`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

    // Registrar log
    logWhatsAppSent(
      studioSlug,
      reminder.promise_id,
      reminder.promise.contact.name,
      reminder.promise.contact.phone
    ).catch((error) => {
      console.error('Error registrando WhatsApp:', error);
    });

    window.open(whatsappUrl, '_blank');
  };

  const handleView = (promiseId: string) => {
    router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    onOpenChange(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const ReminderCard = ({ reminder }: { reminder: ReminderWithPromise }) => (
    <ZenCard className="border-zinc-800">
      <ZenCardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Asunto y Fecha */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-zinc-200 truncate">
                {reminder.subject_text}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {reminder.promise.contact.name}
              </p>
            </div>
            <ZenBadge
              variant={new Date(reminder.reminder_date) < todayStart ? 'destructive' : 'warning'}
              size="sm"
            >
              {formatDate(reminder.reminder_date)}
            </ZenBadge>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => handleView(reminder.promise_id)}
              className="flex-1 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver
            </ZenButton>
            
            {reminder.promise.contact.phone && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => handleWhatsApp(reminder)}
                className="text-xs hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" size={14} />
              </ZenButton>
            )}

            <ZenButton
              variant="primary"
              size="sm"
              onClick={() => handleComplete(reminder.id)}
              disabled={completingIds.has(reminder.id)}
              loading={completingIds.has(reminder.id)}
              className="text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Completar
            </ZenButton>
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
        showOverlay={false}
      >
        <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold text-white">
                Seguimientos
              </SheetTitle>
              <SheetDescription className="text-zinc-400">
                Gestiona tus seguimientos pendientes
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-zinc-400">
              Cargando seguimientos...
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay seguimientos pendientes</p>
            </div>
          ) : (
            <>
              {/* Sección: Vencidos */}
              {overdueReminders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ZenBadge variant="destructive" size="sm">
                      Vencidos
                    </ZenBadge>
                    <span className="text-xs text-zinc-400">
                      {overdueReminders.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {overdueReminders.map(reminder => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        studioSlug={studioSlug}
                        onView={handleView}
                        onComplete={handleComplete}
                        onWhatsApp={handleWhatsApp}
                        isCompleting={completingIds.has(reminder.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sección: Para Hoy */}
              {todayReminders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ZenBadge variant="warning" size="sm">
                      Para Hoy
                    </ZenBadge>
                    <span className="text-xs text-zinc-400">
                      {todayReminders.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {todayReminders.map(reminder => (
                      <ReminderCard key={reminder.id} reminder={reminder} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
