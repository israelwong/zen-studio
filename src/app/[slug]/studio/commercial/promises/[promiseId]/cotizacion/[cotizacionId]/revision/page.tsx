'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import {
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenButton,
  ZenBadge,
} from '@/components/ui/zen';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { crearRevisionCotizacion } from '@/lib/actions/studio/commercial/promises/cotizaciones-revision.actions';
import { CotizacionForm } from '@/app/[slug]/studio/commercial/promises/components/CotizacionForm';
import { toast } from 'sonner';

export default function EditarRevisionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const cotizacionId = params.cotizacionId as string;
  const originalId = searchParams.get('originalId');

  const isNewRevision = cotizacionId === 'new' && originalId !== null;

  const [cotizacion, setCotizacion] = useState<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    status: string;
    promise_id: string | null;
    contact_id: string | null;
    evento_id: string | null;
    revision_of_id: string | null;
    revision_number: number | null;
    revision_status: string | null;
    items: Array<{ item_id: string; quantity: number }>;
  } | null>(null);
  const [cotizacionOriginal, setCotizacionOriginal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventoId, setEventoId] = useState<string | null>(null);
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);
  const [pendingAction, setPendingAction] = useState<'guardar' | 'autorizar' | null>(null);
  const pendingActionRef = React.useRef<'guardar' | 'autorizar' | null>(null);

  // Cargar datos de revisión y original
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Si es nueva revisión, cargar solo la original
        if (isNewRevision && originalId) {
          const originalResult = await getCotizacionById(originalId, studioSlug);
          if (originalResult.success && originalResult.data) {
            setCotizacionOriginal({
              id: originalResult.data.id,
              name: originalResult.data.name,
            });
            setEventoId(originalResult.data.evento_id);
            // Preparar datos de la original para el formulario
            setCotizacion({
              id: 'new',
              name: `${originalResult.data.name} - Revisión`,
              description: originalResult.data.description,
              price: originalResult.data.price,
              status: 'pendiente',
              promise_id: originalResult.data.promise_id,
              contact_id: originalResult.data.contact_id,
              evento_id: originalResult.data.evento_id,
              revision_of_id: originalId,
              revision_number: null,
              revision_status: null,
              items: originalResult.data.items,
            });
          } else {
            toast.error(originalResult.error || 'Error al cargar la cotización original');
            router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            return;
          }
        } else {
          // Cargar revisión existente
          const cotizacionResult = await getCotizacionById(cotizacionId, studioSlug);

          if (cotizacionResult.success && cotizacionResult.data) {
            setCotizacion({
              ...cotizacionResult.data,
              revision_of_id: cotizacionResult.data.revision_of_id ?? null,
              revision_number: cotizacionResult.data.revision_number ?? null,
              revision_status: cotizacionResult.data.revision_status ?? null,
            });
            setEventoId(cotizacionResult.data.evento_id);

            // Si es revisión, cargar cotización original
            if (cotizacionResult.data.revision_of_id) {
              const originalResult = await getCotizacionById(
                cotizacionResult.data.revision_of_id,
                studioSlug
              );
              if (originalResult.success && originalResult.data) {
                setCotizacionOriginal({
                  id: originalResult.data.id,
                  name: originalResult.data.name,
                });
                // Si la original tiene evento_id y la revisión no, usar el de la original
                if (!cotizacionResult.data.evento_id && originalResult.data.evento_id) {
                  setEventoId(originalResult.data.evento_id);
                }
              }
            }
          } else {
            toast.error(cotizacionResult.error || 'Error al cargar la revisión');
            router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
            return;
          }
        }
      } catch (error) {
        console.error('Error loading revision:', error);
        toast.error('Error al cargar la revisión');
        router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cotizacionId, studioSlug, promiseId, router, isNewRevision, originalId]);

  const handleCancel = () => {
    // Regresar a página de evento detalle si existe evento_id
    if (eventoId) {
      router.push(`/${studioSlug}/studio/business/events/${eventoId}`);
    } else {
      router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
    }
  };

  const handleCreateRevision = async (data: {
    nombre: string;
    descripcion?: string;
    precio: number;
    items: { [key: string]: number };
  }): Promise<{ success: boolean; revisionId?: string; error?: string }> => {
    if (!originalId) {
      return { success: false, error: 'No se encontró la cotización original' };
    }

    setIsCreatingRevision(true);
    try {
      const result = await crearRevisionCotizacion({
        studio_slug: studioSlug,
        cotizacion_original_id: originalId,
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim(),
        precio: data.precio,
        items: data.items,
      });

      if (!result.success) {
        setIsCreatingRevision(false);
        return { success: false, error: result.error };
      }

      if (result.data?.id) {
        setIsCreatingRevision(false);
        // Redirigir según la acción pendiente (usar ref para valor inmediato)
        const action = pendingActionRef.current;
        if (action === 'autorizar') {
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${result.data.id}/revision/autorizar`);
        } else if (action === 'guardar') {
          // Guardar borrador: redirigir a promiseId
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}`);
        } else {
          // Por defecto, redirigir a la página de edición de la revisión creada
          router.push(`/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${result.data.id}/revision`);
        }
        setPendingAction(null);
        pendingActionRef.current = null;
        return { success: true, revisionId: result.data.id };
      }

      setIsCreatingRevision(false);
      return { success: false, error: 'No se pudo obtener el ID de la revisión' };
    } catch (error) {
      setIsCreatingRevision(false);
      return { success: false, error: error instanceof Error ? error.message : 'Error al crear revisión' };
    }
  };

  const handleGuardarBorrador = async () => {
    if (isNewRevision) {
      // Si es nueva revisión, establecer acción pendiente usando ref para acceso inmediato
      pendingActionRef.current = 'guardar';
      setPendingAction('guardar');
    }
    // Disparar submit del formulario usando requestSubmit para evitar recarga de página
    // Si es nueva revisión, onCreateAsRevision creará la revisión y redirigirá a promiseId
    // Si ya existe, updateCotizacion actualizará y redirigirá usando redirectOnSuccess
    const form = document.querySelector('form') as HTMLFormElement;
    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else if (form) {
      // Fallback para navegadores que no soportan requestSubmit
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    }
  };

  const handleAutorizarRevision = async () => {
    if (isNewRevision) {
      // Si es nueva revisión, establecer acción pendiente usando ref para acceso inmediato
      pendingActionRef.current = 'autorizar';
      setPendingAction('autorizar');
      const form = document.querySelector('form') as HTMLFormElement;
      if (form && typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else if (form) {
        // Fallback para navegadores que no soportan requestSubmit
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    } else {
      // Si ya existe la revisión, redirigir directamente a autorizar
      router.push(
        `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/${cotizacionId}/revision/autorizar`
      );
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <ZenCard variant="default" padding="none">
          <ZenCardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-zinc-400">Cargando revisión...</p>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!cotizacion) {
    return null;
  }

  const revisionNumber = cotizacion.revision_number || (isNewRevision ? 'Nueva' : 1);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <div className="flex items-center gap-2">
                  <ZenCardTitle>Editar Revisión #{revisionNumber}</ZenCardTitle>
                  <ZenBadge variant="secondary">Revisión Pendiente</ZenBadge>
                </div>
                <ZenCardDescription>
                  {cotizacionOriginal && (
                    <span className="text-zinc-400">
                      Revisión de: <span className="text-zinc-300 font-medium">{cotizacionOriginal.name}</span>
                    </span>
                  )}
                </ZenCardDescription>
              </div>
            </div>
          </div>
        </ZenCardHeader>

        {/* Información de revisión */}
        {cotizacionOriginal && (
          <div className="border-b border-zinc-800 bg-zinc-900/30 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-300 font-medium mb-1">
                  Información de la Revisión
                </p>
                <p className="text-xs text-zinc-400">
                  Esta revisión reemplazará la cotización &quot;{cotizacionOriginal.name}&quot; una vez autorizada.
                  Puedes editar los items libremente y guardar como borrador para continuar después.
                </p>
              </div>
            </div>
          </div>
        )}

        <ZenCardContent className="p-6">
          {/* Usar CotizacionForm sin contacto ni configuraciones comerciales */}
          <CotizacionForm
            studioSlug={studioSlug}
            promiseId={promiseId}
            cotizacionId={isNewRevision ? undefined : cotizacionId}
            redirectOnSuccess={`/${studioSlug}/studio/commercial/promises/${promiseId}`}
            hideActionButtons={true}
            revisionOriginalId={originalId || cotizacion?.revision_of_id || null}
            onCreateAsRevision={isNewRevision ? handleCreateRevision : undefined}
          />

          {/* Botones de acción personalizados */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-zinc-800">
            <ZenButton
              variant="ghost"
              onClick={handleCancel}
            >
              Cancelar
            </ZenButton>
            <ZenButton
              variant="outline"
              onClick={handleGuardarBorrador}
              loading={isCreatingRevision}
            >
              Guardar Borrador
            </ZenButton>
            <ZenButton
              variant="primary"
              onClick={handleAutorizarRevision}
              className="bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500/50"
              loading={isCreatingRevision}
            >
              Autorizar Revisión
            </ZenButton>
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}
