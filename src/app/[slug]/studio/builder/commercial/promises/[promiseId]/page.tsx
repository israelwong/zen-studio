'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore, Trash2, Loader2 } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator, ZenConfirmModal } from '@/components/ui/zen';
import { PromiseForm, type PromiseFormRef } from '../components/PromiseForm';
import { PromiseQuickActions } from '../components/PromiseQuickActions';
import { getPromiseById, archivePromise, unarchivePromise, deletePromise, getPipelineStages, movePromise } from '@/lib/actions/studio/builder/commercial/promises';
import type { PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export default function EditarPromesaPage() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.slug as string;
  const promiseId = params.promiseId as string;
  const formRef = useRef<PromiseFormRef>(null);
  const [loading, setLoading] = useState(true);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [contactData, setContactData] = useState<{
    contactId: string;
    contactName: string;
    phone: string;
    email: string | null;
    promiseId: string;
  } | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [currentPipelineStageId, setCurrentPipelineStageId] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current?.contactData) {
        setContactData(formRef.current.contactData as {
          contactId: string;
          contactName: string;
          phone: string;
          email: string | null;
          promiseId: string;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);
  const [initialData, setInitialData] = useState<{
    id: string;
    name: string;
    phone: string;
    email: string | null;
    event_type_id: string | null;
    interested_dates: string[] | null;
    acquisition_channel_id?: string;
    social_network_id?: string;
    referrer_contact_id?: string;
    referrer_name?: string;
    promiseId?: string | null;
  } | null>(null);

  useEffect(() => {
    const loadPromise = async () => {
      try {
        setLoading(true);
        // Obtener promesa directamente por promiseId
        const result = await getPromiseById(promiseId);

        if (result.success && result.data) {
          setInitialData({
            id: result.data.contact_id,
            name: result.data.contact_name,
            phone: result.data.contact_phone,
            email: result.data.contact_email,
            event_type_id: result.data.event_type_id || null,
            interested_dates: result.data.interested_dates,
            acquisition_channel_id: result.data.acquisition_channel_id || undefined,
            social_network_id: result.data.social_network_id || undefined,
            referrer_contact_id: result.data.referrer_contact_id || undefined,
            referrer_name: result.data.referrer_name || undefined,
            promiseId: result.data.promise_id,
          });
          // Verificar si está archivada y guardar pipeline stage id
          setIsArchived(result.data.pipeline_stage_slug === 'archived');
          setCurrentPipelineStageId(result.data.pipeline_stage_id);
        } else {
          toast.error(result.error || 'Promesa no encontrada');
          router.push(`/${studioSlug}/studio/builder/commercial/promises`);
        }
      } catch (error) {
        console.error('Error loading promise:', error);
        toast.error('Error al cargar la promesa');
        router.push(`/${studioSlug}/studio/builder/commercial/promises`);
      } finally {
        setLoading(false);
      }
    };

    if (promiseId) {
      loadPromise();
    }
  }, [promiseId, studioSlug, router]);

  // Cargar pipeline stages
  useEffect(() => {
    const loadPipelineStages = async () => {
      try {
        const result = await getPipelineStages(studioSlug);
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
    if (!promiseId || newStageId === currentPipelineStageId) return;

    setIsChangingStage(true);
    try {
      const result = await movePromise(studioSlug, {
        promise_id: promiseId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        setCurrentPipelineStageId(newStageId);
        const newStage = pipelineStages.find((s) => s.id === newStageId);
        setIsArchived(newStage?.slug === 'archived');
        
        // Disparar confetti si cambió a "aprobado"
        const isApprovedStage = newStage?.slug === 'approved' || newStage?.slug === 'aprobado' || 
                                newStage?.name.toLowerCase().includes('aprobado');
        
        if (isApprovedStage) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 1 }, // Desde abajo de la ventana
          });
        }
        
        toast.success('Etapa actualizada correctamente');
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


  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await archivePromise(studioSlug, promiseId);
      if (result.success) {
        setIsArchived(true);
        // Actualizar pipeline stage id al stage archivado
        const archivedStage = pipelineStages.find((s) => s.slug === 'archived');
        if (archivedStage) {
          setCurrentPipelineStageId(archivedStage.id);
        }
        toast.success('Promesa archivada correctamente');
        setShowArchiveModal(false);
      } else {
        toast.error(result.error || 'Error al archivar promesa');
      }
    } catch (error) {
      console.error('Error archivando promesa:', error);
      toast.error('Error al archivar promesa');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    setIsUnarchiving(true);
    try {
      const result = await unarchivePromise(studioSlug, promiseId);
      if (result.success) {
        setIsArchived(false);
        // Actualizar pipeline stage id a la primera etapa activa
        const firstActiveStage = pipelineStages
          .filter((s) => s.slug !== 'archived')
          .sort((a, b) => a.order - b.order)[0];
        if (firstActiveStage) {
          setCurrentPipelineStageId(firstActiveStage.id);
        }
        toast.success('Promesa desarchivada correctamente');
      } else {
        toast.error(result.error || 'Error al desarchivar promesa');
      }
    } catch (error) {
      console.error('Error desarchivando promesa:', error);
      toast.error('Error al desarchivar promesa');
    } finally {
      setIsUnarchiving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePromise(studioSlug, promiseId);
      if (result.success) {
        toast.success('Promesa eliminada correctamente');
        setShowDeleteModal(false);
        router.push(`/${studioSlug}/studio/builder/commercial/promises`);
      } else {
        toast.error(result.error || 'Error al eliminar promesa');
      }
    } catch (error) {
      console.error('Error eliminando promesa:', error);
      toast.error('Error al eliminar promesa');
    } finally {
      setIsDeleting(false);
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
              <div className="flex items-center gap-3">
                {/* Skeleton del select */}
                <div className="h-8 w-32 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="flex items-center gap-2">
                  {/* Skeleton de QuickActions */}
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                  </div>
                  {/* Skeleton del menú modal */}
                  <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </ZenCardHeader>
          <ZenCardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-10 w-full bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="h-32 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            </div>
          </ZenCardContent>
        </ZenCard>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard 
        variant="default" 
        padding="none"
      >
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ZenButton
                variant="ghost"
                size="sm"
                onClick={() => formRef.current?.cancel()}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </ZenButton>
              <div>
                <ZenCardTitle>Editar Promesa</ZenCardTitle>
                <ZenCardDescription>
                  Actualiza la información de la promesa
                </ZenCardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pipelineStages.length > 0 && currentPipelineStageId && (() => {
                const currentStage = pipelineStages.find((s) => s.id === currentPipelineStageId);
                const isApprovedStage = currentStage?.slug === 'approved' || currentStage?.slug === 'aprobado' || 
                                       currentStage?.name.toLowerCase().includes('aprobado');
                
                return (
                  <div className="relative flex items-center">
                    <select
                      value={currentPipelineStageId}
                      onChange={(e) => handlePipelineStageChange(e.target.value)}
                      disabled={isChangingStage || loading}
                      className={`pl-3 pr-8 py-1.5 text-sm bg-zinc-900 border rounded-lg text-zinc-100 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${
                        isChangingStage
                          ? "border-zinc-700 focus:ring-emerald-500/50 focus:border-emerald-500"
                          : isArchived 
                          ? "border-amber-500 focus:ring-amber-500/50 focus:border-amber-500"
                          : isApprovedStage
                          ? "border-emerald-500 focus:ring-emerald-500/50 focus:border-emerald-500"
                          : "border-zinc-700 focus:ring-emerald-500/50 focus:border-emerald-500"
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
                );
              })()}
              <div className="flex items-center gap-2">
              {contactData && (
                <PromiseQuickActions
                  studioSlug={studioSlug}
                  contactId={contactData.contactId}
                  contactName={contactData.contactName}
                  phone={contactData.phone}
                  email={contactData.email}
                />
              )}
              <ZenDropdownMenu>
                <ZenDropdownMenuTrigger asChild>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isArchiving || isUnarchiving || isDeleting}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </ZenButton>
                </ZenDropdownMenuTrigger>
                <ZenDropdownMenuContent align="end">
                  {isArchived ? (
                    <ZenDropdownMenuItem
                      onClick={() => handleUnarchive()}
                      disabled={isUnarchiving}
                    >
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      {isUnarchiving ? 'Desarchivando...' : 'Desarchivar'}
                    </ZenDropdownMenuItem>
                  ) : (
                    <ZenDropdownMenuItem
                      onClick={() => setShowArchiveModal(true)}
                      disabled={isArchiving}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {isArchiving ? 'Archivando...' : 'Archivar'}
                    </ZenDropdownMenuItem>
                  )}
                  <ZenDropdownMenuSeparator />
                  <ZenDropdownMenuItem
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isDeleting}
                    className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Eliminando...' : 'Eliminar'}
                  </ZenDropdownMenuItem>
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
              </div>
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <PromiseForm
            ref={formRef}
            studioSlug={studioSlug}
            initialData={initialData}
            onLoadingChange={setIsFormLoading}
          />
        </ZenCardContent>
      </ZenCard>

      {/* Modales de confirmación */}
      <ZenConfirmModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchive}
        title="¿Archivar esta promesa?"
        description="La promesa será archivada y no aparecerá en la lista principal. Podrás restaurarla más tarde si es necesario."
        confirmText="Sí, archivar"
        cancelText="Cancelar"
        variant="default"
        loading={isArchiving}
      />

      <ZenConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="¿Eliminar esta promesa?"
        description="Esta acción no se puede deshacer. La promesa y todos sus datos asociados serán eliminados permanentemente."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}

