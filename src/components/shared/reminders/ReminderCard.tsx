'use client';

import React from 'react';
import { Clock, CheckCircle2, ExternalLink } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenBadge, ZenButton } from '@/components/ui/zen';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import type { ReminderWithPromise } from '@/lib/actions/studio/commercial/promises/reminders.actions';
import { cn } from '@/lib/utils';

interface ReminderCardProps {
  reminder: ReminderWithPromise;
  studioSlug: string;
  onView?: (promiseId: string) => void;
  onComplete?: (reminderId: string) => void;
  onWhatsApp?: (reminder: ReminderWithPromise) => void;
  isCompleting?: boolean;
  showActions?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}

export function ReminderCard({
  reminder,
  studioSlug,
  onView,
  onComplete,
  onWhatsApp,
  isCompleting = false,
  showActions = true,
  variant = 'default',
  className,
}: ReminderCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isOverdue = new Date(reminder.reminder_date) < todayStart;
  const isToday = new Date(reminder.reminder_date).toDateString() === todayStart.toDateString();

  const handleView = () => {
    if (onView) {
      onView(reminder.promise_id);
    } else {
      window.location.href = `/${studioSlug}/studio/commercial/promises/${reminder.promise_id}`;
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(reminder.id);
    }
  };

  const handleWhatsApp = () => {
    if (onWhatsApp) {
      onWhatsApp(reminder);
    }
  };

  if (variant === 'compact') {
    return (
      <ZenCard className={cn('border-zinc-800 hover:border-zinc-700 transition-colors', className)}>
        <ZenCardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Clock className={cn(
                "h-4 w-4",
                isOverdue ? "text-red-400" : isToday ? "text-amber-400" : "text-blue-400"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-zinc-200 truncate">
                    {reminder.subject_text}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    {reminder.promise.contact.name}
                  </p>
                </div>
                <ZenBadge
                  variant={isOverdue ? 'destructive' : isToday ? 'warning' : 'default'}
                  size="sm"
                >
                  {formatDate(reminder.reminder_date)}
                </ZenBadge>
              </div>
              {showActions && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    onClick={handleView}
                    className="flex-1 text-xs h-7"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver
                  </ZenButton>
                  {reminder.promise.contact.phone && onWhatsApp && (
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      onClick={handleWhatsApp}
                      className="text-xs h-7 hover:bg-emerald-500/10 hover:text-emerald-400"
                    >
                      <WhatsAppIcon className="h-3 w-3" size={12} />
                    </ZenButton>
                  )}
                  {onComplete && (
                    <ZenButton
                      variant="primary"
                      size="sm"
                      onClick={handleComplete}
                      disabled={isCompleting}
                      loading={isCompleting}
                      className="text-xs h-7"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completar
                    </ZenButton>
                  )}
                </div>
              )}
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  return (
    <ZenCard className={cn('border-zinc-800 hover:border-zinc-700 transition-colors', className)}>
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
              variant={isOverdue ? 'destructive' : isToday ? 'warning' : 'default'}
              size="sm"
            >
              {formatDate(reminder.reminder_date)}
            </ZenBadge>
          </div>

          {/* Acciones */}
          {showActions && (
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleView}
                className="flex-1 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Ver
              </ZenButton>
              
              {reminder.promise.contact.phone && onWhatsApp && (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={handleWhatsApp}
                  className="text-xs hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" size={14} />
                </ZenButton>
              )}

              {onComplete && (
                <ZenButton
                  variant="primary"
                  size="sm"
                  onClick={handleComplete}
                  disabled={isCompleting}
                  loading={isCompleting}
                  className="text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Completar
                </ZenButton>
              )}
            </div>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
