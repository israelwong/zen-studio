'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { GoogleCalendarConnection } from './GoogleCalendarConnection';

interface CalendarIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onConnected?: () => void;
}

export function CalendarIntegrationModal({ 
  isOpen, 
  onClose, 
  studioSlug,
  onConnected 
}: CalendarIntegrationModalProps) {
  const handleConnected = () => {
    if (onConnected) {
      onConnected();
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-400" />
          <span>Google Calendar</span>
        </div>
      }
      description="Sincroniza tu agenda con Google Calendar automáticamente"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <GoogleCalendarConnection
          studioSlug={studioSlug}
          variant="compact"
          onConnected={handleConnected}
          onDisconnected={handleConnected}
        />

        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-200 mb-2">¿Qué hace esta integración?</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Sincronización bidireccional de eventos entre ZEN y Google Calendar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Creación automática de eventos en tu calendario cuando creas sesiones en ZEN</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Actualización automática cuando modificas eventos en ZEN o en Google Calendar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-1">•</span>
              <span>Calendario secundario dedicado para mantener tu calendario principal organizado</span>
            </li>
          </ul>
        </div>
      </div>
    </ZenDialog>
  );
}

