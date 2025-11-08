'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Edit, Plus } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { AgendaFormModal } from '@/components/shared/agenda';
import { obtenerAgendamientoPorPromise } from '@/lib/actions/shared/agenda-unified.actions';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { formatDate } from '@/lib/actions/utils/formatting';

interface PromiseAgendamientoProps {
  studioSlug: string;
  promiseId: string | null;
  isSaved: boolean;
}

export function PromiseAgendamiento({
  studioSlug,
  promiseId,
  isSaved,
}: PromiseAgendamientoProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agendamiento, setAgendamiento] = useState<AgendaItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSaved || !promiseId) return;

    const loadAgendamiento = async () => {
      setLoading(true);
      try {
        const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
        if (result.success) {
          setAgendamiento(result.data || null);
        }
      } catch (error) {
        console.error('Error loading agendamiento:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgendamiento();
  }, [isSaved, promiseId, studioSlug]);

  const handleSuccess = async () => {
    if (!promiseId) return;

    setLoading(true);
    try {
      const result = await obtenerAgendamientoPorPromise(studioSlug, promiseId);
      if (result.success) {
        setAgendamiento(result.data || null);
      }
    } catch (error) {
      console.error('Error loading agendamiento:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSaved || !promiseId) {
    return null;
  }

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Agendamiento
            </ZenCardTitle>
            {agendamiento && (
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-300"
              >
                <Edit className="h-3 w-3 mr-1" />
                Editar
              </ZenButton>
            )}
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-16 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          ) : !agendamiento ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Calendar className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-xs text-zinc-500 text-center mb-3">
                No hay agendamiento aún
              </p>
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Agendar
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Fecha y Hora */}
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400">Fecha</p>
                  <p className="text-sm font-medium text-zinc-200">
                    {formatDate(agendamiento.date)}
                  </p>
                  {agendamiento.time && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      <p className="text-xs text-zinc-400">{agendamiento.time}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dirección */}
              {agendamiento.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-400">Dirección</p>
                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {agendamiento.address}
                    </p>
                  </div>
                </div>
              )}

              {/* Concepto */}
              {agendamiento.concept && (
                <div className="bg-zinc-800/50 rounded-lg p-2.5">
                  <p className="text-xs text-zinc-400 mb-1">Concepto</p>
                  <p className="text-xs text-zinc-200">{agendamiento.concept}</p>
                </div>
              )}

              {/* Descripción */}
              {agendamiento.description && (
                <div className="bg-zinc-800/50 rounded-lg p-2.5">
                  <p className="text-xs text-zinc-400 mb-1">Descripción</p>
                  <p className="text-xs text-zinc-300 line-clamp-3">
                    {agendamiento.description}
                  </p>
                </div>
              )}

              {/* Botón para editar */}
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="w-full text-xs text-zinc-400 hover:text-zinc-300 mt-2"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar agendamiento
              </ZenButton>
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      <AgendaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studioSlug={studioSlug}
        initialData={agendamiento}
        contexto="promise"
        promiseId={promiseId}
        onSuccess={handleSuccess}
      />
    </>
  );
}

