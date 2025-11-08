'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, Filter } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { ZenButton, ZenSelect } from '@/components/ui/zen';
import { AgendaCalendar } from './AgendaCalendar';
import { AgendaFormModal } from './AgendaFormModal';
import { obtenerAgendaUnificada } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { toast } from 'sonner';

interface AgendaUnifiedSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioSlug: string;
}

type FiltroTipo = 'all' | 'promises' | 'eventos';

export function AgendaUnifiedSheet({
  open,
  onOpenChange,
  studioSlug,
}: AgendaUnifiedSheetProps) {
  const router = useRouter();
  const [agendamientos, setAgendamientos] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroTipo>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgendamiento, setEditingAgendamiento] = useState<AgendaItem | null>(null);

  const loadAgendamientos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await obtenerAgendaUnificada(studioSlug, {
        filtro,
      });

      if (result.success && result.data) {
        setAgendamientos(result.data);
      } else {
        toast.error(result.error || 'Error al cargar agendamientos');
      }
    } catch (error) {
      console.error('Error loading agendamientos:', error);
      toast.error('Error al cargar agendamientos');
    } finally {
      setLoading(false);
    }
  }, [studioSlug, filtro]);

  useEffect(() => {
    if (open) {
      loadAgendamientos();
    }
  }, [open, loadAgendamientos]);

  const handleSelectEvent = (event: AgendaItem) => {
    // Navegar según contexto
    if (event.contexto === 'promise' && event.promise_id) {
      // Navegar a la página de promise
      router.push(`/${studioSlug}/studio/builder/commercial/promises/${event.promise_id}`);
      onOpenChange(false); // Cerrar sheet al navegar
    } else if (event.contexto === 'evento' && event.evento_id) {
      // TODO: Definir ruta de eventos cuando esté disponible
      // Por ahora, abrir modal de edición
      setEditingAgendamiento(event);
      setIsModalOpen(true);
    } else {
      // Si no hay contexto claro, abrir modal de edición
      setEditingAgendamiento(event);
      setIsModalOpen(true);
    }
  };

  const handleSelectSlot = (_slotInfo: { start: Date; end: Date }) => {
    setEditingAgendamiento(null);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadAgendamientos();
    setIsModalOpen(false);
    setEditingAgendamiento(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAgendamiento(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-4xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto"
        >
          <SheetHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-semibold text-white">
                    Agenda Unificada
                  </SheetTitle>
                  <SheetDescription className="text-zinc-400">
                    Visualiza y gestiona todos tus agendamientos
                  </SheetDescription>
                </div>
              </div>
              <ZenButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingAgendamiento(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </ZenButton>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Filtros */}
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-zinc-400" />
              <ZenSelect
                value={filtro}
                onValueChange={(value) => setFiltro(value as FiltroTipo)}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'promises', label: 'Promises' },
                  { value: 'eventos', label: 'Eventos' },
                ]}
                disableSearch
                className="w-48"
              />
            </div>

            {/* Calendario */}
            {loading ? (
              <div className="flex items-center justify-center min-h-[600px]">
                <div className="text-center">
                  <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-zinc-400">Cargando agendamientos...</p>
                </div>
              </div>
            ) : (
              <AgendaCalendar
                events={agendamientos}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                defaultDate={new Date()}
                defaultView="month"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal para crear/editar agendamiento */}
      <AgendaFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        studioSlug={studioSlug}
        initialData={editingAgendamiento || undefined}
        contexto={editingAgendamiento?.contexto || undefined}
        promiseId={editingAgendamiento?.promise_id || undefined}
        eventoId={editingAgendamiento?.evento_id || undefined}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}

