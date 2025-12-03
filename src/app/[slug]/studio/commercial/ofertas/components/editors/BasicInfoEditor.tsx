"use client";

import { useState, useEffect } from "react";
import { ZenInput, ZenTextarea, ZenSwitch, ZenCalendar } from "@/components/ui/zen";
import { useOfferEditor } from "../OfferEditorContext";
import { ObjectiveRadio } from "./ObjectiveRadio";
import { Loader2 } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useStorageRefresh } from "@/hooks/useStorageRefresh";
import { toast } from "sonner";
import { CoverDropzone } from "@/components/shared/CoverDropzone";
import { DateRange } from "react-day-picker";

interface BasicInfoEditorProps {
  studioSlug: string;
  nameError: string | null;
  isValidatingSlug: boolean;
  slugHint: string | null;
  mode?: "create" | "edit";
}

// Helper para generar slug desde nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BasicInfoEditor({
  studioSlug,
  nameError,
  isValidatingSlug,
  slugHint,
  mode = "create",
}: BasicInfoEditorProps) {
  const { formData, updateFormData } = useOfferEditor();
  const { uploadFiles } = useMediaUpload();
  const { triggerRefresh } = useStorageRefresh(studioSlug);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverFileSize, setCoverFileSize] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (formData.start_date && formData.end_date) {
      return {
        from: formData.start_date,
        to: formData.end_date,
      };
    }
    return undefined;
  });

  // Auto-generar slug cuando cambia el nombre
  useEffect(() => {
    if (formData.name) {
      const expectedSlug = generateSlug(formData.name);
      // Solo actualizar si el slug está vacío o si coincide con el esperado
      if (!formData.slug || formData.slug !== expectedSlug) {
        updateFormData({ slug: expectedSlug });
      }
    }
  }, [formData.name]); // Remover formData.slug y updateFormData de las dependencias

  const handleCoverUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    setIsUploadingCover(true);
    try {
      const uploadedFiles = await uploadFiles(
        [file],
        studioSlug,
        "offers",
        "covers"
      );

      if (uploadedFiles.length > 0) {
        const fileSize = uploadedFiles[0].size || file.size;
        setCoverFileSize(fileSize);

        updateFormData({
          cover_media_url: uploadedFiles[0].url,
          cover_media_type: isVideo ? "video" : "image",
        });

        // Actualizar storage global
        triggerRefresh();

        toast.success("Portada subida correctamente");
      }
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Error al subir la portada");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = () => {
    updateFormData({
      cover_media_url: null,
      cover_media_type: null,
    });
    setCoverFileSize(null);
    // Actualizar storage global al eliminar
    triggerRefresh();
    toast.success("Portada eliminada");
  };

  // Obtener tamaño del archivo si hay portada pero no tenemos el tamaño
  useEffect(() => {
    if (formData.cover_media_url && !coverFileSize) {
      // Intentar obtener el tamaño mediante HEAD request
      const fetchFileSize = async () => {
        try {
          const response = await fetch(formData.cover_media_url!, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            setCoverFileSize(parseInt(contentLength, 10));
          }
        } catch (err) {
          console.warn('No se pudo obtener el tamaño del archivo:', err);
        }
      };
      fetchFileSize();
    } else if (!formData.cover_media_url) {
      setCoverFileSize(null);
    }
  }, [formData.cover_media_url, coverFileSize]);

  return (
    <div className="space-y-4">
      {/* Nombre */}
      <div>
        <ZenInput
          id="offer-name-input"
          label="Nombre de la Oferta"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="Ej: Sesión Fotográfica de Verano 2024"
          required
          error={nameError ?? undefined}
        />
        {/* Indicador de validación y hint */}
        {isValidatingSlug && !nameError && (
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Validando disponibilidad...
          </p>
        )}
        {slugHint && !isValidatingSlug && !nameError && (
          <p className="text-xs text-emerald-400 mt-1">
            {slugHint}
          </p>
        )}
      </div>

      {/* Descripción */}
      <ZenTextarea
        id="offer-description-textarea"
        label="Descripción (Uso Interno)"
        value={formData.description}
        onChange={(e) => updateFormData({ description: e.target.value })}
        placeholder="Notas internas sobre la oferta. Esta descripción no aparecerá en la publicación pública."
        rows={3}
      />


      {/* Portada Multimedia */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Portada (Foto o Video) <span className="text-red-400">*</span>
        </label>
        <CoverDropzone
          mediaUrl={formData.cover_media_url || null}
          mediaType={formData.cover_media_type || null}
          onDropFiles={handleCoverUpload}
          onRemoveMedia={handleRemoveCover}
          isUploading={isUploadingCover}
          variant="compact"
          aspectRatio="video"
          helpText="Recomendado: 1920x1080px"
          placeholderText="Arrastra una imagen o video, o haz clic para seleccionar"
          showHelpText={true}
          showFileSize={false}
        />
        <p className="text-xs text-zinc-500 mt-2">
          Esta imagen/video se mostrará en el feed público de tu perfil
        </p>
      </div>

      {/* Objetivo - Radio Buttons */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          Objetivo de la Oferta <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ObjectiveRadio
            value="presencial"
            checked={formData.objective === "presencial"}
            onChange={(value) => updateFormData({ objective: value })}
          />
          <ObjectiveRadio
            value="virtual"
            checked={formData.objective === "virtual"}
            onChange={(value) => updateFormData({ objective: value })}
          />
        </div>
      </div>

      {/* Disponibilidad */}
      <div className="space-y-4 border-t border-zinc-800 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-zinc-300">Disponibilidad</h3>
          <span className="text-red-400">*</span>
        </div>

        {/* Switch Oferta Permanente */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="is-permanent" className="text-sm font-medium text-zinc-300">
              Oferta Permanente
            </label>
            <p className="text-xs text-zinc-500">
              Esta oferta estará disponible indefinidamente
            </p>
          </div>
          <ZenSwitch
            id="is-permanent"
            checked={formData.is_permanent}
            onCheckedChange={(checked) => {
              updateFormData({
                is_permanent: checked,
                has_date_range: checked ? false : formData.has_date_range,
                start_date: checked ? null : formData.start_date,
                end_date: checked ? null : formData.end_date,
              });
              if (checked) {
                setDateRange(undefined);
              }
            }}
          />
        </div>

        {/* Switch Definir Temporalidad */}
        {!formData.is_permanent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="has-date-range" className="text-sm font-medium text-zinc-300">
                  Definir Temporalidad
                </label>
                <p className="text-xs text-zinc-500">
                  Establece fechas específicas de inicio y fin
                </p>
              </div>
              <ZenSwitch
                id="has-date-range"
                checked={formData.has_date_range}
                onCheckedChange={(checked) => {
                  updateFormData({
                    has_date_range: checked,
                    start_date: checked ? formData.start_date : null,
                    end_date: checked ? formData.end_date : null,
                  });
                  if (!checked) {
                    setDateRange(undefined);
                  }
                }}
              />
            </div>

            {/* Calendario de Rango */}
            {formData.has_date_range && (
              <div className="bg-zinc-900 rounded-lg p-4">
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Período de Disponibilidad <span className="text-red-400">*</span>
                </label>
                <ZenCalendar
                  {...{
                    mode: "range" as const,
                    selected: dateRange,
                    onSelect: (range: DateRange | undefined) => {
                      setDateRange(range);
                      updateFormData({
                        start_date: range?.from || null,
                        end_date: range?.to || null,
                      });
                    },
                    numberOfMonths: 2,
                    disabled: (date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))
                  }}
                />
                {dateRange?.from && dateRange?.to && (
                  <p className="text-xs text-zinc-400 mt-3">
                    Del {dateRange.from.toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} al {dateRange.to.toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!formData.is_permanent && !formData.has_date_range && (
          <p className="text-xs text-amber-400">
            Debes seleccionar &quot;Oferta Permanente&quot; o &quot;Definir Temporalidad&quot;
          </p>
        )}
      </div>
    </div>
  );
}
