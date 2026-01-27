'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlarmClockCheck, Loader2, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZenButton } from '@/components/ui/zen';
import {
  ZenDropdownMenu,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
  ZenDropdownMenuTrigger,
} from '@/components/ui/zen/overlays/ZenDropdownMenu';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { RemindersSideSheet } from './RemindersSideSheet';
import { completeReminder } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { toast } from 'sonner';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';

interface AlertsPopoverProps {
  studioSlug: string;
  initialAlerts?: ReminderWithPromise[]; // ✅ Pre-cargado en servidor (vencidos + hoy)
  initialCount?: number; // ✅ Pre-cargado en servidor
  onRemindersClick?: () => void; // Para abrir el sheet completo
}

export function AlertsPopover({ 
  studioSlug, 
  initialAlerts = [],
  initialCount = 0,
  onRemindersClick,
}: AlertsPopoverProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<ReminderWithPromise[]>(initialAlerts);
  
  // ✅ Usar datos iniciales del servidor
  const displayedAlerts = alerts.slice(0, 6); // Mostrar solo los 6 más próximos
  const count = initialCount;

  useEffect(() => {
    setIsMounted(true);
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  const handleComplete = async (reminderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se active el click del item
    
    setCompletingIds(prev => new Set(prev).add(reminderId));
    
    // Actualización optimista
    setAlerts(prev => prev.filter(r => r.id !== reminderId));

    try {
      const result = await completeReminder(studioSlug, reminderId);

      if (result.success) {
        toast.success('Recordatorio completado');
        window.dispatchEvent(new CustomEvent('reminder-updated'));
      } else {
        // Revertir si falla
        setAlerts(initialAlerts);
        toast.error(result.error || 'Error al completar recordatorio');
      }
    } catch (error) {
      // Revertir si falla
      setAlerts(initialAlerts);
      console.error('Error completando recordatorio:', error);
      toast.error('Error al completar recordatorio');
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(reminderId);
        return next;
      });
    }
  };

  const handleAlertClick = (reminder: ReminderWithPromise) => {
    // Navegar a la promesa
    if (reminder.promise_id) {
      router.push(`/${studioSlug}/studio/commercial/promises/${reminder.promise_id}`);
    }
    setOpen(false);
  };

  const handleViewMore = () => {
    setOpen(false);
    if (onRemindersClick) {
      onRemindersClick();
    } else {
      setSheetOpen(true);
    }
  };

  // Renderizar solo después del mount para evitar problemas de hidratación
  if (!isMounted) {
    return (
      <ZenButton
        variant="ghost"
        size="icon"
        className="relative rounded-full text-zinc-400 hover:text-zinc-200"
        title="Recordatorios"
        disabled
      >
        <AlarmClockCheck className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
        <span className="sr-only">Recordatorios</span>
      </ZenButton>
    );
  }

  return (
    <>
      <ZenDropdownMenu open={open} onOpenChange={setOpen}>
        <ZenDropdownMenuTrigger asChild>
          <ZenButton
            variant="ghost"
            size="icon"
            className="relative rounded-full text-zinc-400 hover:text-zinc-200"
            title="Recordatorios"
          >
            <AlarmClockCheck className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {count > 9 ? '9+' : count}
              </span>
            )}
            <span className="sr-only">Recordatorios</span>
          </ZenButton>
        </ZenDropdownMenuTrigger>
        <ZenDropdownMenuContent
          align="end"
          className="w-80 max-h-[500px] flex flex-col p-0"
        >
          <div className="px-3 py-2 border-b border-zinc-700 flex-shrink-0">
            <h3 className="text-sm font-semibold text-zinc-200">Recordatorios</h3>
            {count > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                {count} {count === 1 ? 'recordatorio pendiente' : 'recordatorios pendientes'}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {displayedAlerts.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-zinc-400">
                No hay recordatorios pendientes
              </div>
            ) : (
              <div className="py-1">
                {displayedAlerts.map((reminder) => (
                  <AlertItem
                    key={reminder.id}
                    reminder={reminder}
                    open={open}
                    onAlertClick={handleAlertClick}
                    onComplete={handleComplete}
                    isCompleting={completingIds.has(reminder.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-zinc-700">
            <div className="px-3 py-2">
              <button
                onClick={handleViewMore}
                className="text-xs text-zinc-400 hover:text-zinc-200 w-full text-left transition-colors"
              >
                Ver más recordatorios
              </button>
            </div>
          </div>
        </ZenDropdownMenuContent>
      </ZenDropdownMenu>
      {!onRemindersClick && (
        <RemindersSideSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          studioSlug={studioSlug}
        />
      )}
    </>
  );
}

// Componente separado para cada alerta con tiempo relativo dinámico
function AlertItem({
  reminder,
  open,
  onAlertClick,
  onComplete,
  isCompleting,
}: {
  reminder: ReminderWithPromise;
  open: boolean;
  onAlertClick: (reminder: ReminderWithPromise) => void;
  onComplete: (reminderId: string, e: React.MouseEvent) => void;
  isCompleting: boolean;
}) {
  const relativeTime = useRelativeTime(reminder.reminder_date, open);
  
  // Formatear fecha
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Determinar si está vencido
  const now = new Date();
  const reminderDate = new Date(reminder.reminder_date);
  const isOverdue = reminderDate < now;

  const contactName = reminder.promise?.contact?.name || 'Contacto';
  const subjectText = reminder.subject_text || 'Recordatorio';

  return (
    <ZenDropdownMenuItem
      className={cn(
        'flex flex-col items-start gap-1 px-3 py-3 cursor-pointer relative group',
        isOverdue && 'bg-red-950/20'
      )}
      onClick={() => onAlertClick(reminder)}
    >
      <button
        onClick={(e) => onComplete(reminder.id, e)}
        disabled={isCompleting}
        className={cn(
          "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 disabled:opacity-50",
          isCompleting && "opacity-100"
        )}
        title="Marcar como completado"
      >
        {isCompleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>
      <div className="flex items-start gap-2 w-full pr-8">
        <div className="mt-0.5">
          <AlarmClockCheck className={cn(
            "h-4 w-4",
            isOverdue ? "text-red-400" : "text-zinc-400"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "text-sm font-medium text-zinc-200 line-clamp-2",
              isOverdue && "font-semibold"
            )}>
              {subjectText}
            </p>
            {isOverdue && (
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
            {contactName}
          </p>
          {reminder.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
              {reminder.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              "text-xs",
              isOverdue ? "text-red-400" : "text-zinc-500"
            )}>
              {formatDate(reminder.reminder_date)}
            </span>
            <span className="text-xs text-zinc-500">
              • {relativeTime}
            </span>
          </div>
        </div>
      </div>
    </ZenDropdownMenuItem>
  );
}
