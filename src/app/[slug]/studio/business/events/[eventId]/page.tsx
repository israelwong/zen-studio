'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { obtenerEventoDetalle, cancelarEvento, getEventPipelineStages, moveEvent } from '@/lib/actions/studio/business/events';
import type { EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const eventId = params.eventId as string;
  const [loading, setLoading] = useState(true);
  const [pipelineStages, setPipelineStages] = useState<EventPipelineStage[]>([]);
  const [currentPipelineStageId, setCurrentPipelineStageId] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [eventData, setEventData] = useState<{
    id: string;
    name: string | null;
    event_date: Date;
    address: string | null;
    sede: string | null;
    status: string;
    contract_value: number | null;
    paid_amount: number;
    pending_amount: number;
    contact_id: string;
    event_type_id: string | null;
    stage_id: string | null;
  } | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventoDetalle(studioSlug, eventId);

        if (result.success && result.data) {
          setEventData({
            id: result.data.id,
            name: result.data.name,
            event_date: result.data.event_date,
            address: result.data.address,
            sede: result.data.sede,
            status: result.data.status,
            contract_value: result.data.contract_value,
            paid_amount: result.data.paid_amount,
            pending_amount: result.data.pending_amount,
            contact_id: result.data.contact_id,
            event_type_id: result.data.event_type_id,
            stage_id: result.data.stage_id,
          });
          setCurrentPipelineStageId(result.data.stage_id);
        } else {
          toast.error(result.error || 'Evento no encontrado');
          router.push(`/${studioSlug}/studio/business/events`);
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Error al cargar el evento');
        router.push(`/${studioSlug}/studio/business/events`);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId, studioSlug, router]);

  // Cargar pipeline stages
  useEffect(() => {
    const loadPipelineStages = async () => {
      try {
        const result = await getEventPipelineStages(studioSlug);
        if (result.success && result.data) {
          setPipelineStages(result.data);
        }
      } catch (error) {
        console.error('Error cargando pipeline stages:', error);
      }
    };
    loadPipelineStages();
  }, [studioSlug]);

  const handlePipelineStageChange = async (newStageId: string) => {
    if (!eventId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        setCurrentPipelineStageId(newStageId);
        toast.success('Etapa actualizada correctamente');
        // Recargar datos del evento
        const eventResult = await obtenerEventoDetalle(studioSlug, eventId);
        if (eventResult.success && eventResult.data) {
          setEventData({
            id: eventResult.data.id,
            name: eventResult.data.name,
            event_date: eventResult.data.event_date,
            address: eventResult.data.address,
            sede: eventResult.data.sede,
            status: eventResult.data.status,
            contract_value: eventResult.data.contract_value,
            paid_amount: eventResult.data.paid_amount,
            pending_amount: eventResult.data.pending_amount,
            contact_id: eventResult.data.contact_id,
            event_type_id: eventResult.data.event_type_id,
            stage_id: eventResult.data.stage_id,
          });
        }
      } else {
        toast.error(result.error || 'Error al cambiar etapa');
      }
    } catch (error) {
      console.error('Error cambiando etapa:', error);
      toast.error('Error al cambiar etapa');
    } finally {
      setIsChangingStage(false);
    }
  };

  const handleCancel = async () => {
    try {
      const result = await cancelarEvento(studioSlug, eventId);
      if (result.success) {
        toast.success('Evento cancelado correctamente');
        router.push(`/${studioSlug}/studio/business/events`);
      } else {
        toast.error(result.error || 'Error al cancelar evento');
      }
    } catch (error) {
      console.error('Error cancelando evento:', error);
      toast.error('Error al cancelar evento');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-zinc-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="text-center py-12 text-zinc-400">
              Cargando evento...
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!eventData) {
    return null;
  }

  const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
  const isArchived = currentStage?.slug === 'archivado';

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${studioSlug}/studio/business/events`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>{eventData.name || 'Evento sin nombre'}</ZenCardTitle>
                <ZenCardDescription>
                  Detalle del evento
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pipelineStages.length > 0 && currentPipelineStageId && (
                <div className="relative flex items-center">
                  <select
                    value={currentPipelineStageId}
                    onChange={(e) => handlePipelineStageChange(e.target.value)}
                    disabled={isChangingStage || loading}
                    className={`pl-3 pr-8 py-1.5 text-sm bg-zinc-900 border rounded-lg text-zinc-100 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${isChangingStage
                      ? "border-zinc-700 focus:ring-blue-500/50 focus:border-blue-500"
                      : isArchived
                        ? "border-amber-500 focus:ring-amber-500/50 focus:border-amber-500"
                        : "border-zinc-700 focus:ring-blue-500/50 focus:border-blue-500"
                      }`}
                  >
                    {isChangingStage ? (
                      <option value={currentPipelineStageId}>Actualizando estado...</option>
                    ) : (
                      pipelineStages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))
                    )}
                  </select>
                  {isChangingStage ? (
                    <Loader2 className="absolute right-2 h-4 w-4 animate-spin text-zinc-400 pointer-events-none" />
                  ) : (
                    <div className="absolute right-2 pointer-events-none">
                      <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
              <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </ZenButton>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end">
                  {eventData.status !== 'CANCELLED' && (
                    <>
                      <ZenDropdownMenuItem
                        onClick={handleCancel}
                        className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                      >
                        Cancelar evento
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                    </>
                  )}
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-2">Fecha del evento</h3>
                <p className="text-white">
                  {new Date(eventData.event_date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {eventData.address && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Dirección</h3>
                  <p className="text-white">{eventData.address}</p>
                </div>
              )}
              {eventData.contract_value && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Monto contratado</h3>
                  <p className="text-white">
                    ${eventData.contract_value.toLocaleString('es-MX', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              )}
              {eventData.paid_amount > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Pagado</h3>
                  <p className="text-white">
                    ${eventData.paid_amount.toLocaleString('es-MX', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })} ({eventData.contract_value ? ((eventData.paid_amount / eventData.contract_value) * 100).toFixed(0) : 0}%)
                  </p>
                </div>
              )}
            </div>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
