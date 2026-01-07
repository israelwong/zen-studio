'use client';

import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
} from '@/components/ui/zen';
import { formatDate } from '@/lib/actions/utils/formatting';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';

interface EventCronogramaCardProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
  onUpdated?: () => void;
}

export function EventCronogramaCard({
  studioSlug,
  eventId,
  eventData,
  onUpdated,
}: EventCronogramaCardProps) {
  const handleViewCronograma = () => {
    // Navegar a la página de scheduler del evento
    window.location.href = `/${studioSlug}/studio/business/events/${eventId}/scheduler`;
  };

  const scheduler = eventData.scheduler;
  const tasks = scheduler?.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.progress_percent === 100).length;

  return (
    <ZenCard>
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Cronograma
          </ZenCardTitle>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={handleViewCronograma}
            className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 shrink-0"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Ver
          </ZenButton>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4">
        {scheduler ? (
          <div className="space-y-3">
            {scheduler.start_date && scheduler.end_date && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-400 mb-0.5">Rango de fechas</p>
                  <p className="text-xs text-zinc-300">
                    {formatDate(scheduler.start_date)} - {formatDate(scheduler.end_date)}
                  </p>
                </div>
              </div>
            )}
            {totalTasks > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-400">
                  {completedTasks} de {totalTasks} tareas completadas
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-zinc-500">
              No hay cronograma configurado
            </p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

