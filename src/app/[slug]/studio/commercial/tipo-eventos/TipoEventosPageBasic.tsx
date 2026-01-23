'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenButton } from '@/components/ui/zen';
import { TipoEventoEnrichedModal } from '@/components/shared/tipos-evento/TipoEventoEnrichedModal';
import { obtenerTiposEvento } from '@/lib/actions/studio/negocio/tipos-evento.actions';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import { Plus, Edit2, Image as ImageIcon, Video, Package } from 'lucide-react';
import Image from 'next/image';

interface TipoEventosPageBasicProps {
  tiposEvento: TipoEventoData[];
  studioSlug: string;
}

export function TipoEventosPageBasic({
  tiposEvento: initialTiposEvento,
  studioSlug,
}: TipoEventosPageBasicProps) {
  const [tiposEvento, setTiposEvento] = useState<TipoEventoData[]>(initialTiposEvento);
  const [selectedTipoEvento, setSelectedTipoEvento] = useState<TipoEventoData | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  // Sincronizar con props iniciales si cambian
  useEffect(() => {
    setTiposEvento(initialTiposEvento);
  }, [initialTiposEvento]);

  const handleCreate = () => {
    setSelectedTipoEvento(undefined);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEdit = (tipoEvento: TipoEventoData) => {
    setSelectedTipoEvento(tipoEvento);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleSuccess = async (tipoEvento: TipoEventoData) => {
    // Actualizar estado local
    if (isCreating) {
      // Agregar nuevo tipo de evento
      setTiposEvento((prev) => [...prev, tipoEvento]);
    } else {
      // Actualizar tipo de evento existente
      setTiposEvento((prev) =>
        prev.map((tipo) => (tipo.id === tipoEvento.id ? tipoEvento : tipo))
      );
    }

    // Recargar datos del servidor para obtener conteos actualizados
    const result = await obtenerTiposEvento(studioSlug);
    if (result.success && result.data) {
      setTiposEvento(result.data);
    }

    // Revalidar sin recargar la página
    router.refresh();
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedTipoEvento(undefined);
    setIsCreating(false);
    // Disparar evento para cerrar overlays
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('close-overlays'));
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tipos de Eventos</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Diseña vitrinas de experiencia con covers multimedia para cada tipo de evento
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear Tipo
          </button>
        </div>

        {/* Grid de tipos de evento */}
        {tiposEvento.length === 0 ? (
          <ZenCard>
            <ZenCardContent className="p-12 text-center">
              <p className="text-zinc-400 mb-4">No tienes tipos de evento creados</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Crear primer tipo de evento
              </button>
            </ZenCardContent>
          </ZenCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiposEvento.map((tipo) => (
              <ZenCard
                key={tipo.id}
                className="hover:border-zinc-600 hover:shadow-lg transition-all duration-200 group"
              >
                <ZenCardContent className="p-0">
                  {/* Cover */}
                  {tipo.cover_media_type === 'image' && tipo.cover_image_url ? (
                    <div className="relative w-full h-48 bg-zinc-800 rounded-t-lg overflow-hidden group-hover:opacity-90 transition-opacity">
                      <Image
                        src={tipo.cover_image_url}
                        alt={tipo.nombre}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : tipo.cover_media_type === 'video' && tipo.cover_video_url ? (
                    <div className="relative w-full h-48 bg-zinc-800 rounded-t-lg overflow-hidden group-hover:opacity-90 transition-opacity">
                      <video
                        src={tipo.cover_video_url}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-zinc-800 rounded-t-lg flex items-center justify-center">
                      <div className="text-center">
                        {tipo.icon ? (
                          <span className="text-4xl text-zinc-600">📸</span>
                        ) : (
                          <ImageIcon className="h-12 w-12 text-zinc-600 mx-auto" />
                        )}
                        <p className="text-xs text-zinc-500 mt-2">Sin cover</p>
                      </div>
                    </div>
                  )}

                  {/* Contenido */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors flex-1">
                        {tipo.nombre}
                      </h3>
                      <button
                        onClick={() => handleEdit(tipo)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-800 rounded transition-all cursor-pointer flex-shrink-0"
                        title="Editar tipo de evento"
                        onMouseEnter={(e) => {
                          e.currentTarget.closest('.group')?.classList.add('hover');
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.closest('.group')?.classList.remove('hover');
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-zinc-400 hover:text-emerald-400 transition-colors" />
                      </button>
                    </div>

                    {tipo.description && (
                      <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
                        {tipo.description}
                      </p>
                    )}

                    {/* Estadísticas */}
                    <div className="space-y-2 mt-3 pt-3 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Paquetes asociados:</span>
                        <span className="text-zinc-300 font-medium">
                          {tipo._count?.paquetes || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Promesas pendientes:</span>
                        <span className="text-zinc-300 font-medium">
                          {tipo._count?.promesas || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">Eventos activos:</span>
                        <span className="text-zinc-300 font-medium">
                          {tipo._count?.eventos || 0}
                        </span>
                      </div>
                      {tipo.status === 'inactive' && (
                        <div className="mt-2">
                          <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                            Inactivo
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botón crear paquete */}
                    <div className="mt-4 pt-3 border-t border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZenButton
                        variant="outline"
                        size="sm"
                        icon={Package}
                        onClick={() => {
                          router.push(`/${studioSlug}/studio/commercial/paquetes/nuevo?eventTypeId=${tipo.id}`);
                        }}
                        className="w-full hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                      >
                        Crear paquete
                      </ZenButton>
                    </div>
                  </div>
                </ZenCardContent>
              </ZenCard>
            ))}
          </div>
        )}
      </div>

      {/* Modal enriquecido */}
      <TipoEventoEnrichedModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        studioSlug={studioSlug}
        tipoEvento={selectedTipoEvento}
        zIndex={10050}
      />
    </>
  );
}
