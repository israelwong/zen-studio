'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen';
import { AgendaForm } from './AgendaForm';
import { toast } from 'sonner';
import {
  crearAgendamiento,
  actualizarAgendamiento,
  type AgendaItem,
} from '@/lib/actions/shared/agenda-unified.actions';

interface AgendaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  initialData?: AgendaItem | null;
  contexto?: 'promise' | 'evento';
  promiseId?: string | null;
  eventoId?: string | null;
  onSuccess?: () => void;
}

export function AgendaFormModal({
  isOpen,
  onClose,
  studioSlug,
  initialData,
  contexto,
  promiseId,
  eventoId,
  onSuccess,
}: AgendaFormModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    date: Date;
    time?: string;
    address?: string;
    concept?: string;
    description?: string;
    google_maps_url?: string;
    agenda_tipo?: string;
  }) => {
    setLoading(true);

    try {
      // Determinar contexto si no está especificado
      const finalContexto = contexto || (initialData?.contexto as 'promise' | 'evento' | undefined) || 'promise';

      if (initialData) {
        // Actualizar
        const result = await actualizarAgendamiento(studioSlug, {
          id: initialData.id,
          date: data.date,
          time: data.time,
          address: data.address,
          concept: data.concept,
          description: data.description,
          google_maps_url: data.google_maps_url,
          agenda_tipo: data.agenda_tipo,
        });

        if (result.success) {
          toast.success('Agendamiento actualizado');
          onSuccess?.();
          onClose();
        } else {
          toast.error(result.error || 'Error al actualizar agendamiento');
        }
      } else {
        // Crear
        const result = await crearAgendamiento(studioSlug, {
          contexto: finalContexto,
          promise_id: promiseId || undefined,
          evento_id: eventoId || undefined,
          date: data.date,
          time: data.time,
          address: data.address,
          concept: data.concept,
          description: data.description,
          google_maps_url: data.google_maps_url,
          agenda_tipo: data.agenda_tipo,
        });

        if (result.success) {
          toast.success('Agendamiento creado');
          onSuccess?.();
          onClose();
        } else {
          toast.error(result.error || 'Error al crear agendamiento');
        }
      }
    } catch (error) {
      console.error('Error in agenda form:', error);
      toast.error('Error al procesar agendamiento');
    } finally {
      setLoading(false);
    }
  };

  const title = initialData ? 'Editar Agendamiento' : 'Nuevo Agendamiento';
  const description = contexto
    ? `Agendamiento para ${contexto === 'promise' ? 'promesa' : 'evento'}`
    : 'Crear un nuevo agendamiento';

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="md"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Calendar className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </div>

      <AgendaForm
        studioSlug={studioSlug}
        initialData={initialData || undefined}
        contexto={contexto}
        promiseId={promiseId}
        eventoId={eventoId}
        onSubmit={handleSubmit}
        onCancel={onClose}
        loading={loading}
      />
    </ZenDialog>
  );
}

