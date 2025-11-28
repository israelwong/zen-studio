'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { Trash2, CheckCircle2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskBarPopoverProps {
  taskId: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  isCompleted: boolean;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (taskId: string) => Promise<void>;
  onToggleComplete: (taskId: string, isCompleted: boolean) => Promise<void>;
}

export function TaskBarPopover({
  taskId,
  taskName,
  startDate,
  endDate,
  isCompleted,
  children,
  open,
  onOpenChange,
  onDelete,
  onToggleComplete,
}: TaskBarPopoverProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(taskId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleComplete = async () => {
    setIsTogglingComplete(true);
    try {
      await onToggleComplete(taskId, !isCompleted);
      onOpenChange(false);
    } catch (error) {
      console.error('Error toggling complete:', error);
    } finally {
      setIsTogglingComplete(false);
    }
  };

  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const dateText = isSameDay
    ? format(startDate, "d 'de' MMMM", { locale: es })
    : `${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM", { locale: es })}`;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3 bg-zinc-900 border-zinc-800"
        align="center"
        side="top"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Header con info del slot */}
          <div className="space-y-1 pb-2 border-b border-zinc-800">
            <h4 className="text-sm font-semibold text-zinc-200 truncate">
              {taskName}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="h-3 w-3" />
              <span>{dateText}</span>
            </div>
            {isCompleted && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>Completada</span>
              </div>
            )}
          </div>

          {/* Opciones */}
          <div className="space-y-1">
            {/* Toggle completado */}
            <button
              onClick={handleToggleComplete}
              disabled={isTogglingComplete}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-zinc-100 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}</span>
            </button>

            {/* Vaciar slot */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isDeleting ? 'Eliminando...' : 'Vaciar slot'}</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

