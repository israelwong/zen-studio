'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { ZenDialog, ZenBadge } from '@/components/ui/zen';

interface CalendarIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
}

export function CalendarIntegrationModal({ isOpen, onClose, studioSlug }: CalendarIntegrationModalProps) {
  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-400" />
          <span>Google Calendar</span>
          <ZenBadge variant="secondary" className="text-xs">
            Próximamente
          </ZenBadge>
        </div>
      }
      description="Sincroniza tu agenda con Google Calendar automáticamente"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="bg-purple-950/20 rounded-lg p-4 border border-purple-800/50">
          <p className="text-sm text-zinc-300">
            Esta integración estará disponible próximamente. Podrás sincronizar tus eventos y agenda con Google Calendar.
          </p>
        </div>
      </div>
    </ZenDialog>
  );
}

