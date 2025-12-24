'use client';

import { Calendar, MapPin, Tag } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useEvento } from './context/EventoContext';
import { ToastContainer } from '@/components/client';

function formatFecha(fecha: string): string {
  try {
    const fechaSolo = fecha.split('T')[0];
    const fechaObj = new Date(fechaSolo + 'T00:00:00');

    return fechaObj.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    return 'Fecha no disponible';
  }
}

export default function EventoResumenPage() {
  const { evento } = useEvento();
  const { toasts, removeToast } = useToast();

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">
          {evento.name || 'Evento sin nombre'}
        </h1>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-300 mt-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <span>{formatFecha(evento.event_date)}</span>
          </div>

          {evento.event_location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zinc-500" />
              <span>{evento.event_location}</span>
            </div>
          )}

          {evento.event_type && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-zinc-500" />
              <span>{evento.event_type.name}</span>
            </div>
          )}
        </div>

        {evento.address && (
          <p className="text-sm text-zinc-400 mt-2">{evento.address}</p>
        )}
      </div>
    </>
  );
}
