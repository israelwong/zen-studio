"use client";

import { useState, useEffect } from "react";
import { ZenInput, ZenTextarea } from "@/components/ui/zen";
import { useOfferEditor } from "../OfferEditorContext";
import { ObjectiveRadio } from "./ObjectiveRadio";
import { Upload, X, Loader2 } from "lucide-react";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { toast } from "sonner";
import Image from "next/image";

interface BasicInfoEditorProps {
  studioSlug: string;
  nameError: string | null;
  isValidatingSlug: boolean;
  slugHint: string | null;
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
}: BasicInfoEditorProps) {
  const { formData, updateFormData } = useOfferEditor();
  const { uploadFiles } = useMediaUpload();

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

    if (!isImage && !isVideo) {
      toast.error("Solo se permiten archivos de imagen o video");
      return;
    }

    setIsUploadingCover(true);
    try {
      const uploadedFiles = await uploadFiles(
        [file],
        studioSlug,
        "offers",
        "covers"
      );

      if (uploadedFiles.length > 0) {
        updateFormData({
          cover_media_url: uploadedFiles[0].url,
          cover_media_type: isVideo ? "video" : "image",
        });
        toast.success("Portada subida correctamente");
      }
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Error al subir la portada");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleCoverUpload(Array.from(files));
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleCoverUpload(Array.from(files));
    }
  };

  const handleRemoveCover = () => {
    updateFormData({
      cover_media_url: null,
      cover_media_type: null,
    });
    toast.success("Portada eliminada");
  };

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
        label="Descripción Breve"
        value={formData.description}
        onChange={(e) => updateFormData({ description: e.target.value })}
        placeholder="Descripción que aparecerá en el feed público (máx 500 caracteres)"
        rows={3}
      />

      {/* Portada Multimedia */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Portada (Foto o Video)
        </label>
        {formData.cover_media_url ? (
          <div className="relative group">
            <div className="aspect-video relative bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
              {formData.cover_media_type === "video" ? (
                <video
                  src={formData.cover_media_url}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <Image
                  src={formData.cover_media_url}
                  alt="Portada de la oferta"
                  fill
                  className="object-cover"
                />
              )}
              <button
                onClick={handleRemoveCover}
                className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <label className="block">
            <div
              className={`aspect-video border-2 border-dashed rounded-lg transition-colors cursor-pointer flex items-center justify-center bg-zinc-800/30 ${isDragOver
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-zinc-700 hover:border-emerald-500"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isUploadingCover ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
                  <span className="text-sm text-zinc-400">Subiendo...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm text-center px-4">
                    Arrastra una imagen o video, o haz clic para seleccionar
                  </span>
                  <span className="text-xs text-zinc-500">
                    Recomendado: 1920x1080px
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploadingCover}
            />
          </label>
        )}
        <p className="text-xs text-zinc-500 mt-2">
          Esta imagen/video se mostrará en el feed público de tu perfil
        </p>
      </div>

      {/* Objetivo - Radio Buttons */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          Objetivo de la Oferta
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
    </div>
  );
}
