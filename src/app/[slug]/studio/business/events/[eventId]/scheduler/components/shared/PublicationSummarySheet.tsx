'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Send, Loader2, Calendar, User, CheckCircle2, XCircle } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenBadge } from '@/components/ui/zen';
import { obtenerResumenCambiosPendientes, publicarCronograma } from '@/lib/actions/studio/business/events/scheduler-actions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PublicationSummarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  eventId: string;
  onPublished?: () => void;
}

export function PublicationSummarySheet({
  isOpen,
  onClose,
  studioSlug,
  eventId,
  onPublished,
}: PublicationSummarySheetProps) {
  const [loading, setLoading] = useState(false);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [resumen, setResumen] = useState<{
    totalTareas: number;
    tareasConPersonal: number;
    tareasSinPersonal: number;
    tareas: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      status: string;
      category: string;
      tienePersonal: boolean;
      personalNombre?: string;
      personalEmail?: string;
    }>;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarResumen();
    }
  }, [isOpen, studioSlug, eventId]);

  const cargarResumen = async () => {
    setLoadingResumen(true);
    try {
      const result = await obtenerResumenCambiosPendientes(studioSlug, eventId);
      if (result.success && result.data) {
        setResumen(result.data);
      } else {
        toast.error(result.error || 'Error al cargar resumen');
        onClose();
      }
    } catch (error) {
      console.error('Error cargando resumen:', error);
      toast.error('Error al cargar resumen de cambios');
      onClose();
    } finally {
      setLoadingResumen(false);
    }
  };

  const handlePublicar = async (opcion: 'solo_publicar' | 'publicar_e_invitar') => {
    setLoading(true);
    try {
      const result = await publicarCronograma(studioSlug, eventId, opcion);

      if (result.success) {
        if (opcion === 'solo_publicar') {
          toast.success(`${result.publicado || 0} tarea(s) publicada(s) correctamente`);
        } else {
          const total = (result.publicado || 0) + (result.sincronizado || 0);
          toast.success(
            `${result.sincronizado || 0} tarea(s) sincronizada(s) con Google Calendar. ${result.publicado || 0} publicada(s) sin sincronizar.`
          );
        }
        onPublished?.();
        onClose();
      } else {
        toast.error(result.error || 'Error al publicar cronograma');
      }
    } catch (error) {
      console.error('Error publicando cronograma:', error);
      toast.error('Error al publicar cronograma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Resumen de Cambios Pendientes"
      description="Revisa los cambios que se publicarán en el cronograma"
      maxWidth="2xl"
      closeOnClickOutside={!loading}
    >
      {loadingResumen ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : resumen ? (
        <div className="space-y-6">
          {/* Resumen general */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <div className="text-sm text-zinc-400 mb-1">Total de cambios</div>
              <div className="text-2xl font-bold text-white">{resumen.totalTareas}</div>
            </div>
            <div className="bg-emerald-950/20 rounded-lg p-4 border border-emerald-800/30">
              <div className="text-sm text-emerald-400 mb-1">Con personal asignado</div>
              <div className="text-2xl font-bold text-emerald-400">{resumen.tareasConPersonal}</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <div className="text-sm text-zinc-400 mb-1">Sin personal asignado</div>
              <div className="text-2xl font-bold text-white">{resumen.tareasSinPersonal}</div>
            </div>
          </div>

          {/* Lista de tareas */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Tareas a publicar:</h3>
            {resumen.tareas.map((tarea) => (
              <div
                key={tarea.id}
                className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{tarea.name}</h4>
                      <ZenBadge variant="outline" size="sm">
                        {tarea.category}
                      </ZenBadge>
                      {tarea.status === 'COMPLETED' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(tarea.startDate, 'dd MMM', { locale: es })} -{' '}
                        {format(tarea.endDate, 'dd MMM yyyy', { locale: es })}
                      </div>
                      {tarea.tienePersonal && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {tarea.personalNombre || 'Personal asignado'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-700">
            <ZenButton variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </ZenButton>
            <ZenButton
              variant="primary"
              onClick={() => handlePublicar('solo_publicar')}
              disabled={loading}
              loading={loading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Solo Publicar
            </ZenButton>
            {resumen.tareasConPersonal > 0 && (
              <ZenButton
                variant="primary"
                onClick={() => handlePublicar('publicar_e_invitar')}
                disabled={loading}
                loading={loading}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Publicar e Invitar
              </ZenButton>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-400">
          No hay cambios pendientes
        </div>
      )}
    </ZenDialog>
  );
}

