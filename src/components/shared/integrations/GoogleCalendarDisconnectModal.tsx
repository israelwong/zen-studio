'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton } from '@/components/ui/zen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { obtenerConteoEventosSincronizados } from '@/lib/actions/auth/desconectar-google-calendar.actions';

interface GoogleCalendarDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (limpiarEventos: boolean) => Promise<void>;
  studioSlug: string;
  isDisconnecting?: boolean;
}

export function GoogleCalendarDisconnectModal({
  isOpen,
  onClose,
  onConfirm,
  studioSlug,
  isDisconnecting = false,
}: GoogleCalendarDisconnectModalProps) {
  const [limpiarEventos, setLimpiarEventos] = useState(false);
  const [eventosSincronizados, setEventosSincronizados] = useState<number | null>(null);
  const [cargandoConteo, setCargandoConteo] = useState(false);

  // Cargar conteo de eventos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      cargarConteoEventos();
    } else {
      // Reset al cerrar
      setLimpiarEventos(false);
      setEventosSincronizados(null);
    }
  }, [isOpen, studioSlug]);

  const cargarConteoEventos = async () => {
    setCargandoConteo(true);
    try {
      const result = await obtenerConteoEventosSincronizados(studioSlug);
      if (result.success && result.total !== undefined) {
        setEventosSincronizados(result.total);
      } else {
        setEventosSincronizados(0);
      }
    } catch (error) {
      console.error('Error cargando conteo de eventos:', error);
      setEventosSincronizados(0);
    } finally {
      setCargandoConteo(false);
    }
  };

  const handleConfirm = async () => {
    await onConfirm(limpiarEventos);
  };

  const handleClose = () => {
    setLimpiarEventos(false);
    setEventosSincronizados(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md" overlayZIndex={10100} style={{ zIndex: 10100 }}>
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            Desconectar Google Calendar
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {cargandoConteo ? (
              'Cargando información...'
            ) : eventosSincronizados !== null && eventosSincronizados > 0 ? (
              <>
                Tienes <span className="text-zinc-200 font-medium">{eventosSincronizados}</span>{' '}
                {eventosSincronizados === 1 ? 'tarea sincronizada' : 'tareas sincronizadas'} en
                tu Google Calendar. ¿Qué deseas hacer con estos eventos?
              </>
            ) : eventosSincronizados === 0 ? (
              'No tienes eventos sincronizados actualmente. ¿Qué deseas hacer al desconectar?'
            ) : (
              '¿Estás seguro de que deseas desconectar Google Calendar? Las tareas dejarán de sincronizarse automáticamente.'
            )}
          </DialogDescription>
        </DialogHeader>

        {!cargandoConteo && eventosSincronizados !== null && (
          <div className="space-y-3 py-4">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${!limpiarEventos
                ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                : 'bg-zinc-800 border-zinc-600'
                }`}
              onClick={() => setLimpiarEventos(false)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={!limpiarEventos}
                  onChange={() => setLimpiarEventos(false)}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-900 border-zinc-600 bg-zinc-800"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Solo desconectar
                  </div>
                  <div className="text-xs text-zinc-400">
                    Mantener los eventos actuales en tu Google Calendar. Solo se detendrá la
                    sincronización automática.
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${limpiarEventos
                ? 'bg-red-950/20 border-red-900/50 hover:border-red-900/70'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }`}
              onClick={() => setLimpiarEventos(true)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  checked={limpiarEventos}
                  onChange={() => setLimpiarEventos(true)}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 focus:ring-offset-zinc-900 border-zinc-600 bg-zinc-800"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200 mb-1">
                    Limpiar y desconectar
                  </div>
                  <div className="text-xs text-zinc-400">
                    Al elegir esta opción, se eliminarán de tu Google Calendar tanto las fechas
                    de eventos principales (citas y fechas de cobertura) como las tareas
                    operativas asignadas a tu equipo (cronograma). Esta acción no se puede
                    deshacer.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <ZenButton
            variant="outline"
            onClick={handleClose}
            disabled={isDisconnecting}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            variant="destructive"
            onClick={handleConfirm}
            loading={isDisconnecting}
            loadingText={
              limpiarEventos && eventosSincronizados && eventosSincronizados > 0
                ? 'Limpiando eventos...'
                : 'Desconectando...'
            }
          >
            {limpiarEventos ? 'Limpiar y Desconectar' : 'Desconectar'}
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

